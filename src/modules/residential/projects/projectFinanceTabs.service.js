import AppError from "../../../core/errors/AppError.js";
import { nextCode } from "../../../core/counters/counter.service.js";
import { paymentAmountNumeric } from "../../../core/utils/money.js";
import PayableLedgerEntry from "../../common/payables/payableLedgerEntry.model.js";
import PayableObligation from "../../common/payables/payableObligation.model.js";
import EnquiryPayment from "../enquiries/enquiryPayment.model.js";
import { formatQuotationDetail } from "../quotations/quotation.service.js";
import QuotationModel from "../quotations/quotation.model.js";
import Project from "./project.model.js";

function formatListRow(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o._id.toString(),
    code: o.code,
    name: o.name,
    status: o.status,
    amount: o.amount || o.grandTotal || "₹0",
    partyType: o.partyType || "client",
    payeeLabel: o.payeeLabel || "",
    enquiryId: o.enquiryId?.toString?.() || null,
    projectId: o.projectId?.toString?.() || null,
  };
}

export async function listProjectQuotations(projectId, partyType = "client") {
  const project = await Project.findById(projectId).lean();
  if (!project) throw AppError.notFound("Project not found");

  const pt = String(partyType).toLowerCase();

  if (pt === "client") {
    if (!project.enquiryId) return [];
    const rows = await QuotationModel.find({
      enquiryId: project.enquiryId,
      $or: [{ partyType: "client" }, { partyType: { $exists: false } }],
    }).sort({ isPrimary: -1, sortOrder: 1 });
    return rows.map(formatListRow);
  }

  const rows = await QuotationModel.find({
    projectId,
    partyType: pt,
  }).sort({ sortOrder: 1, createdAt: -1 });
  return rows.map(formatListRow);
}

export async function getProjectQuotationDetail(projectId, quotationId) {
  const row = await QuotationModel.findOne({ _id: quotationId, projectId });
  if (!row) throw AppError.notFound("Quotation not found");
  return formatQuotationDetail(row);
}

export async function createProjectPartyQuotation(projectId, body) {
  const project = await Project.findById(projectId);
  if (!project) throw AppError.notFound("Project not found");

  const partyType = body.partyType || "contractor";
  if (!["contractor", "vendor"].includes(partyType)) {
    throw AppError.badRequest("partyType must be contractor or vendor");
  }

  const code = await nextCode("QUO", "QT-", 4, 5235);
  const quotation = await QuotationModel.create({
    code,
    name: body.name || `${partyType} quotation`,
    client: project.client,
    clientDisplay: body.payeeLabel || project.client,
    status: "Draft",
    projectId: project._id,
    enquiryId: project.enquiryId || undefined,
    partyType,
    payeeKind: partyType === "vendor" ? "vendor" : "siteContractor",
    payeeId: body.payeeId || null,
    payeeLabel: body.payeeLabel || "",
    businessModule: project.businessModule,
    products: body.products || [],
    services: body.services || [],
    taxPercent: body.taxPercent || "18",
    siteAddress: project.siteAddress || "",
  });

  const items = [...(quotation.products || []), ...(quotation.services || [])];
  let sum = 0;
  for (const it of items) {
    const rate =
      parseFloat(String(it.rate || it.price || 0).replace(/[^\d.]/g, "")) || 0;
    const qty =
      parseFloat(String(it.quantity || 1).replace(/[^\d.]/g, "")) || 1;
    sum += rate * qty;
  }
  const taxPct = parseFloat(quotation.taxPercent) || 18;
  const tax = (sum * taxPct) / 100;
  const fmt = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  quotation.subtotal = fmt(sum);
  quotation.taxAmount = fmt(tax);
  quotation.grandTotal = fmt(sum + tax);
  quotation.amount = fmt(sum + tax);
  await quotation.save();

  return formatListRow(quotation);
}

export async function listProjectPayments(projectId, partyType = "client") {
  const project = await Project.findById(projectId).lean();
  if (!project) throw AppError.notFound("Project not found");

  const pt = String(partyType).toLowerCase();

  if (pt === "client") {
    if (!project.enquiryId) return [];
    const rows = await EnquiryPayment.find({ enquiryId: project.enquiryId })
      .sort({ createdAt: -1 })
      .lean();
    return rows.map((p) => ({
      id: p._id.toString(),
      partyType: "client",
      amount: p.amount,
      amountNumeric: paymentAmountNumeric(p),
      status: p.status,
      paymentType: p.paymentType || "",
      paymentMode: p.paymentMode || "",
      date: p.paymentDate || p.createdAt,
    }));
  }

  const obligations = await PayableObligation.find({
    projectId: project._id,
    ...(pt === "vendor"
      ? { payeeKind: { $in: ["vendor", null] }, vendorId: { $ne: null } }
      : { payeeKind: { $in: ["siteContractor", "contractor"] } }),
  })
    .populate("vendorId", "name code")
    .lean();

  const result = [];
  for (const o of obligations) {
    const ledger = await PayableLedgerEntry.find({ obligationId: o._id })
      .sort({ paidAt: -1 })
      .lean();
    for (const l of ledger) {
      result.push({
        id: l._id.toString(),
        obligationId: o._id.toString(),
        partyType: pt,
        payeeName: o.payeeDisplayName || o.vendorId?.name || o.title,
        amount: l.amount,
        paymentMode: l.paymentMode,
        reference: l.reference,
        date: l.paidAt,
      });
    }
    if (!ledger.length) {
      result.push({
        id: o._id.toString(),
        obligationId: o._id.toString(),
        partyType: pt,
        payeeName: o.payeeDisplayName || o.vendorId?.name || o.title,
        amount: o.committedAmount,
        status: o.status,
        date: o.dueDate,
        isObligationOnly: true,
      });
    }
  }
  return result;
}

export async function createProjectPayableObligation(projectId, body, user) {
  const project = await Project.findById(projectId);
  if (!project) throw AppError.notFound("Project not found");

  const amount = parseFloat(body.committedAmount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw AppError.badRequest("Invalid committed amount");
  }

  const payeeKind = body.payeeKind || (body.vendorId ? "vendor" : "siteContractor");
  let vendorId = body.vendorId || null;

  if (payeeKind === "vendor" && vendorId) {
    const { Vendor } = await import("../../common/masters/master.model.js");
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw AppError.notFound("Vendor not found");
  } else if (!body.payeeDisplayName?.trim()) {
    throw AppError.badRequest("Payee name is required for contractor obligations");
  }

  const payeeKey =
    body.payeeKey ||
    (body.siteContractorRowId
      ? `c-${body.siteContractorRowId}`
      : body.payeeDisplayName
        ? String(body.payeeDisplayName)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
        : "");

  const row = await PayableObligation.create({
    vendorId: vendorId || undefined,
    title: body.title || body.payeeDisplayName || "Project payable",
    committedAmount: amount,
    currency: body.currency || "INR",
    status: "active",
    businessModule: project.businessModule,
    projectId: project._id,
    enquiryId: project.enquiryId || null,
    dueDate: body.dueDate || null,
    notes: body.notes || "",
    payeeKind,
    payeeKey,
    siteContractorRowId: body.siteContractorRowId || null,
    payeeDisplayName: body.payeeDisplayName || "",
  });

  return {
    id: row._id.toString(),
    title: row.title,
    committedAmount: row.committedAmount,
    payeeKind: row.payeeKind,
    payeeKey: row.payeeKey,
    projectId: project._id.toString(),
  };
}

export async function recordProjectPayablePayment(
  projectId,
  obligationId,
  body,
  user,
) {
  const row = await PayableObligation.findOne({
    _id: obligationId,
    projectId,
  });
  if (!row) throw AppError.notFound("Obligation not found on this project");

  const amount = parseFloat(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw AppError.badRequest("Payment amount must be greater than zero");
  }

  await PayableLedgerEntry.create({
    obligationId: row._id,
    amount,
    paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
    paymentMode: body.paymentMode || "UPI",
    reference: body.reference || "",
    note: body.note || "",
    recordedBy: user?._id || user?.id || null,
    source: "manual",
  });

  return { success: true, obligationId: row._id.toString() };
}
