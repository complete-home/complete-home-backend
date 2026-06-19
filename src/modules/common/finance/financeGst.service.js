import mongoose from "mongoose";
import { docId } from "../../../core/http/formatHelpers.js";
import { formatGstFields } from "../../../core/schemas/gstPaymentFields.js";
import { paymentAmountNumeric, roundMoney } from "../../../core/utils/money.js";
import EnquiryPayment from "../../residential/enquiries/enquiryPayment.model.js";
import Enquiry from "../../residential/enquiries/enquiry.model.js";
import Project from "../../residential/projects/project.model.js";
import PayableLedgerEntry from "../payables/payableLedgerEntry.model.js";
import PayableObligation from "../payables/payableObligation.model.js";
import EmployeePayment from "../../workforce/employeePayment.model.js";
import User from "../../user-management/users/user.model.js";

function gstTotalsFromRows(rows) {
  let taxableValue = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalAmount = 0;
  let gstCount = 0;
  let nonGstCount = 0;
  for (const r of rows) {
    const g = formatGstFields(r);
    if (g.taxMode === "non_gst") {
      nonGstCount += 1;
      taxableValue += g.taxableValue || r.amount || 0;
      totalAmount += g.totalAmount ?? g.taxableValue ?? r.amount ?? 0;
    } else {
      gstCount += 1;
      taxableValue += g.taxableValue || 0;
      cgstAmount += g.cgstAmount || 0;
      sgstAmount += g.sgstAmount || 0;
      igstAmount += g.igstAmount || 0;
      totalAmount += g.totalAmount ?? r.amount ?? 0;
    }
  }
  return {
    count: rows.length,
    gstCount,
    nonGstCount,
    taxableValue: roundMoney(taxableValue),
    cgstAmount: roundMoney(cgstAmount),
    sgstAmount: roundMoney(sgstAmount),
    igstAmount: roundMoney(igstAmount),
    totalAmount: roundMoney(totalAmount),
  };
}

function mapClientPayment(p, enquiry) {
  const g = formatGstFields(p);
  const amt = paymentAmountNumeric(p);
  return {
    id: docId(p),
    source: "client",
    direction: "in",
    partyName: enquiry?.name || "Client",
    partyType: "client",
    projectId: null,
    enquiryId: p.enquiryId?.toString(),
    enquiryCode: enquiry?.code || "",
    paymentDate: p.paymentDate || "",
    paidAt: p.createdAt,
    amount: amt,
    paymentMode: p.paymentMode || "",
    reference: p.referenceNumber || "",
    ...g,
    totalAmount: g.totalAmount ?? amt,
  };
}

function mapLedgerPayment(row, obligation, vendorName) {
  const g = formatGstFields(row);
  return {
    id: docId(row),
    source: "payable",
    direction: "out",
    partyName: vendorName || obligation?.title || "Vendor",
    partyType: obligation?.payeeKind || "vendor",
    projectId: obligation?.projectId?.toString() || null,
    enquiryId: obligation?.enquiryId?.toString() || null,
    paidAt: row.paidAt || row.createdAt,
    amount: row.amount || 0,
    paymentMode: row.paymentMode || "",
    reference: row.reference || "",
    ...g,
    totalAmount: g.totalAmount ?? row.amount ?? 0,
  };
}

function mapEmployeePayment(row, name) {
  const g = formatGstFields(row);
  return {
    id: docId(row),
    source: "employee",
    direction: "out",
    partyName: name || "Employee",
    partyType: "employee",
    paidAt: row.paidAt || row.createdAt,
    amount: row.amount || 0,
    paymentMode: row.paymentMode || "",
    reference: row.reference || "",
    paymentType: row.paymentType,
    ...g,
    totalAmount: g.totalAmount ?? row.amount ?? 0,
  };
}

export async function getGstReport({
  businessModule,
  projectId,
  partyType,
  dateFrom,
  dateTo,
  limit = 500,
} = {}) {
  const entries = [];

  const enquiryFilter = businessModule ? { businessModule } : {};
  if (projectId && mongoose.isValidObjectId(projectId)) {
    const project = await Project.findById(projectId).select("enquiryId").lean();
    if (project?.enquiryId) enquiryFilter._id = project.enquiryId;
    else enquiryFilter._id = { $in: [] };
  }
  const enquiries = await Enquiry.find(enquiryFilter).select("_id code name").lean();
  const enquiryById = new Map(enquiries.map((e) => [e._id.toString(), e]));
  const enquiryIds = enquiries.map((e) => e._id);

  if (!partyType || partyType === "client") {
    const payQ = { enquiryId: { $in: enquiryIds } };
    if (dateFrom || dateTo) {
      payQ.createdAt = {};
      if (dateFrom) payQ.createdAt.$gte = new Date(dateFrom);
      if (dateTo) payQ.createdAt.$lte = new Date(`${dateTo}T23:59:59`);
    }
    const clientRows =
      enquiryIds.length > 0
        ? await EnquiryPayment.find(payQ).sort({ createdAt: -1 }).limit(limit).lean()
        : [];
    for (const p of clientRows) {
      entries.push(
        mapClientPayment(p, enquiryById.get(p.enquiryId?.toString())),
      );
    }
  }

  const obFilter = businessModule ? { businessModule } : {};
  if (projectId && mongoose.isValidObjectId(projectId)) {
    obFilter.projectId = projectId;
  }
  const obligations = await PayableObligation.find(obFilter).lean();
  const obById = new Map(obligations.map((o) => [o._id.toString(), o]));
  const obIds = obligations.map((o) => o._id);

  if (
    !partyType ||
    ["vendor", "contractor", "siteContractor"].includes(partyType)
  ) {
    const ledgerQ = { obligationId: { $in: obIds } };
    if (dateFrom || dateTo) {
      ledgerQ.paidAt = {};
      if (dateFrom) ledgerQ.paidAt.$gte = new Date(dateFrom);
      if (dateTo) ledgerQ.paidAt.$lte = new Date(`${dateTo}T23:59:59`);
    }
    const ledgerRows =
      obIds.length > 0
        ? await PayableLedgerEntry.find(ledgerQ)
            .sort({ paidAt: -1 })
            .limit(limit)
            .lean()
        : [];
    for (const row of ledgerRows) {
      const ob = obById.get(row.obligationId?.toString());
      const kind = ob?.payeeKind || "vendor";
      if (partyType && partyType !== kind && !(partyType === "contractor" && kind === "siteContractor")) {
        continue;
      }
      entries.push(mapLedgerPayment(row, ob, ob?.payeeLabel || ob?.title));
    }
  }

  if (!partyType || partyType === "employee") {
    const empQ = businessModule ? { businessModule } : {};
    if (dateFrom || dateTo) {
      empQ.paidAt = {};
      if (dateFrom) empQ.paidAt.$gte = new Date(dateFrom);
      if (dateTo) empQ.paidAt.$lte = new Date(`${dateTo}T23:59:59`);
    }
    const empRows = await EmployeePayment.find(empQ)
      .sort({ paidAt: -1 })
      .limit(limit)
      .lean();
    const userIds = [...new Set(empRows.map((r) => r.employeeId?.toString()))];
    const users = await User.find({ _id: { $in: userIds } }).select("name").lean();
    const nameMap = Object.fromEntries(
      users.map((u) => [u._id.toString(), u.name]),
    );
    for (const row of empRows) {
      entries.push(
        mapEmployeePayment(row, nameMap[row.employeeId?.toString()]),
      );
    }
  }

  entries.sort(
    (a, b) => new Date(b.paidAt || 0) - new Date(a.paidAt || 0),
  );

  const gstRows = entries.filter((e) => e.taxMode === "gst");
  const nonGstRows = entries.filter((e) => e.taxMode === "non_gst");

  return {
    entries: entries.slice(0, limit),
    summary: {
      all: gstTotalsFromRows(entries),
      gst: gstTotalsFromRows(gstRows),
      nonGst: gstTotalsFromRows(nonGstRows),
    },
  };
}

export async function getFinanceOverview({ businessModule } = {}) {
  const report = await getGstReport({ businessModule, limit: 2000 });
  return {
    gstSummary: report.summary,
    entryCount: report.entries.length,
  };
}

export async function getProjectFinanceLedger(projectId, query = {}) {
  return getGstReport({
    projectId,
    partyType: query.partyType,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    limit: query.limit || 300,
  });
}
