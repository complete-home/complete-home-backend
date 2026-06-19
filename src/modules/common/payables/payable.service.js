import mongoose from "mongoose";
import AppError from "../../../core/errors/AppError.js";
import {
  parseMoneyToNumber,
  paymentAmountNumeric,
  roundMoney,
} from "../../../core/utils/money.js";
import { docId } from "../../../core/http/formatHelpers.js";
import PayableObligation from "./payableObligation.model.js";
import PayableLedgerEntry from "./payableLedgerEntry.model.js";
import EnquiryPayment from "../../residential/enquiries/enquiryPayment.model.js";
import Enquiry from "../../residential/enquiries/enquiry.model.js";
import { Vendor } from "../masters/master.model.js";
import { mergeGstFromBody } from "../../../core/utils/indiaGst.js";
import { formatGstFields } from "../../../core/schemas/gstPaymentFields.js";
import { amountInWordsINR } from "../../../core/utils/amountInWords.js";

function obligationMatchFilter(businessModule) {
  const base = { status: "active" };
  if (businessModule) base.businessModule = businessModule;
  return base;
}

/**
 * Financial rollups for dashboard + payables home.
 * - **To pay:** sum of `committedAmount` on **active** obligations.
 * - **Paid out:** sum of all vendor ledger payments (outflows).
 * - **Outstanding:** per active obligation `committed − paid`, summed.
 * - **Earned:** completed client `EnquiryPayment` rows (amount string parsed).
 */
export async function getPayablesSummary({ businessModule } = {}) {
  const matchActive = obligationMatchFilter(businessModule);

  const activeObligations = await PayableObligation.find(matchActive)
    .select("_id vendorId committedAmount")
    .lean();

  const activeIds = activeObligations.map((o) => o._id);

  let totalCommittedToPay = 0;
  for (const o of activeObligations) {
    totalCommittedToPay += o.committedAmount || 0;
  }

  const allLedger = await PayableLedgerEntry.find({})
    .select("obligationId amount")
    .lean();

  let totalPaidOut = 0;
  const paidByObligation = new Map();
  for (const row of allLedger) {
    const key = row.obligationId.toString();
    const amt = row.amount || 0;
    totalPaidOut += amt;
    paidByObligation.set(key, (paidByObligation.get(key) || 0) + amt);
  }

  let totalOutstandingToVendors = 0;
  for (const o of activeObligations) {
    const id = o._id.toString();
    const committed = o.committedAmount || 0;
    const paid = paidByObligation.get(id) || 0;
    totalOutstandingToVendors += Math.max(0, committed - paid);
  }

  const received = await EnquiryPayment.find({
    status: "Completed",
    clientStatus: { $ne: "disputed" },
  })
    .select("amount amountNumeric")
    .lean();

  let totalEarnedFromClients = 0;
  for (const p of received) {
    totalEarnedFromClients += paymentAmountNumeric(p);
  }

  const vendorStats = new Map();
  for (const o of activeObligations) {
    const vid = o.vendorId?.toString();
    if (!vid) continue;
    const id = o._id.toString();
    const committed = o.committedAmount || 0;
    const paid = paidByObligation.get(id) || 0;
    const remaining = Math.max(0, committed - paid);
    const cur = vendorStats.get(vid) || {
      vendorId: vid,
      committed: 0,
      paid: 0,
      outstanding: 0,
    };
    cur.committed += committed;
    cur.paid += paid;
    cur.outstanding += remaining;
    vendorStats.set(vid, cur);
  }

  const vendorIds = [...vendorStats.keys()];
  const vendors =
    vendorIds.length > 0
      ? await Vendor.find({ _id: { $in: vendorIds } })
          .select("code name")
          .lean()
      : [];

  const vendorById = new Map(vendors.map((v) => [v._id.toString(), v]));

  const byVendor = [...vendorStats.values()]
    .map((row) => {
      const v = vendorById.get(row.vendorId);
      return {
        vendorId: row.vendorId,
        vendorName: v?.name || "Unknown",
        vendorCode: v?.code || "",
        committed: roundMoney(row.committed),
        paid: roundMoney(row.paid),
        outstanding: roundMoney(row.outstanding),
      };
    })
    .sort((a, b) => b.outstanding - a.outstanding);

  return {
    payables: {
      totalCommittedToPay: roundMoney(totalCommittedToPay),
      totalPaidOut: roundMoney(totalPaidOut),
      totalOutstandingToVendors: roundMoney(totalOutstandingToVendors),
      currency: "INR",
    },
    receivables: {
      totalEarnedFromClients: roundMoney(totalEarnedFromClients),
      currency: "INR",
      note: "Earned sums EnquiryPayment with status Completed (amounts parsed from strings until amountNumeric exists).",
    },
    byVendor,
  };
}

async function paidTotalForObligation(obligationId) {
  const rows = await PayableLedgerEntry.find({ obligationId })
    .select("amount")
    .lean();
  return rows.reduce((s, r) => s + (r.amount || 0), 0);
}

function formatLedgerEntry(row) {
  const o = row.toObject ? row.toObject() : row;
  const total = o.totalAmount ?? o.amount;
  return {
    id: docId(o),
    amount: o.amount,
    paidAt: o.paidAt,
    paymentMode: o.paymentMode,
    reference: o.reference || "",
    invoiceNumber: o.invoiceNumber || "",
    invoiceDate: o.invoiceDate || null,
    placeOfSupply: o.placeOfSupply || "",
    amountInWords:
      o.amountInWords ||
      (total ? amountInWordsINR(total) : ""),
    amountReceived: o.amountReceived ?? null,
    balanceAmount: o.balanceAmount ?? null,
    note: o.note || "",
    receiptUrl: o.receiptUrl || "",
    source: o.source,
    createdAt: o.createdAt,
    ...formatGstFields(o),
    totalAmount: total,
  };
}

function formatObligation(doc, { paidTotal = 0, payments = [] } = {}) {
  const o = doc.toObject ? doc.toObject() : doc;
  const vendor =
    o.vendorId && typeof o.vendorId === "object" ? o.vendorId : null;
  const committed = o.committedAmount || 0;
  const paid = roundMoney(paidTotal);
  return {
    id: docId(o),
    vendorId: vendor?._id?.toString() || o.vendorId?.toString?.(),
    vendorName: vendor?.name || "—",
    vendorCode: vendor?.code || "",
    title: o.title,
    committedAmount: committed,
    currency: o.currency || "INR",
    status: o.status,
    businessModule: o.businessModule,
    projectId: o.projectId?.toString?.() || null,
    enquiryId: o.enquiryId?.toString?.() || null,
    dueDate: o.dueDate,
    notes: o.notes || "",
    paidTotal: paid,
    remaining: roundMoney(Math.max(0, committed - paid)),
    payments,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

async function paidTotalsByObligationIds(obligationIds) {
  if (!obligationIds.length) return new Map();
  const agg = await PayableLedgerEntry.aggregate([
    { $match: { obligationId: { $in: obligationIds } } },
    { $group: { _id: "$obligationId", total: { $sum: "$amount" } } },
  ]);
  return new Map(agg.map((r) => [r._id.toString(), r.total || 0]));
}

export async function listObligations({
  businessModule,
  vendorId,
  status,
} = {}) {
  const q = {};
  if (businessModule) q.businessModule = businessModule;
  if (vendorId && mongoose.isValidObjectId(vendorId)) q.vendorId = vendorId;
  if (status) q.status = status;
  const rows = await PayableObligation.find(q)
    .sort({ updatedAt: -1 })
    .populate("vendorId", "code name type")
    .lean();
  const paidMap = await paidTotalsByObligationIds(rows.map((r) => r._id));
  return rows.map((row) => {
    const paid = paidMap.get(row._id.toString()) || 0;
    return formatObligation(row, { paidTotal: paid });
  });
}

export async function getObligationById(id) {
  const row = await PayableObligation.findById(id).populate(
    "vendorId",
    "code name type",
  );
  if (!row) throw AppError.notFound("Payable obligation not found");
  const payments = await PayableLedgerEntry.find({ obligationId: id }).sort({
    paidAt: -1,
  });
  const paid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  return formatObligation(row, {
    paidTotal: paid,
    payments: payments.map(formatLedgerEntry),
  });
}

export async function createObligation(body, user) {
  const amount = parseFloat(body.committedAmount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw AppError.badRequest("Invalid committed amount");
  }

  const payeeKind = body.payeeKind || "vendor";
  let vendorId = body.vendorId || null;

  if (payeeKind === "vendor" || vendorId) {
    if (!mongoose.isValidObjectId(vendorId)) {
      throw AppError.badRequest("Valid vendor is required");
    }
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw AppError.notFound("Vendor not found");
  } else if (!body.payeeDisplayName?.trim()) {
    throw AppError.badRequest(
      "Payee display name is required when vendor is not set",
    );
  }

  const row = await PayableObligation.create({
    vendorId: vendorId || undefined,
    title: body.title || body.payeeDisplayName,
    committedAmount: amount,
    currency: body.currency || "INR",
    status: body.status || "active",
    businessModule: body.businessModule || "residential",
    projectId: body.projectId || null,
    enquiryId: body.enquiryId || null,
    dueDate: body.dueDate || null,
    notes: body.notes || "",
    payeeKind: body.payeeKind || "vendor",
    payeeKey: body.payeeKey || "",
    siteContractorRowId: body.siteContractorRowId || null,
    payeeDisplayName: body.payeeDisplayName || "",
  });
  if (row.vendorId) await row.populate("vendorId", "code name type");
  return formatObligation(row, { paidTotal: 0 });
}

export async function updateObligation(id, body) {
  const row = await PayableObligation.findById(id);
  if (!row) throw AppError.notFound("Payable obligation not found");
  if (body.vendorId && mongoose.isValidObjectId(body.vendorId)) {
    row.vendorId = body.vendorId;
  }
  if (body.title !== undefined) row.title = body.title;
  if (body.committedAmount !== undefined) {
    const amount = parseFloat(body.committedAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw AppError.badRequest("Invalid committed amount");
    }
    row.committedAmount = amount;
  }
  if (body.currency !== undefined) row.currency = body.currency;
  if (body.status !== undefined) row.status = body.status;
  if (body.dueDate !== undefined) row.dueDate = body.dueDate || null;
  if (body.notes !== undefined) row.notes = body.notes;
  await row.save();
  await row.populate("vendorId", "code name type");
  const paid = await paidTotalForObligation(row._id);
  return formatObligation(row, { paidTotal: paid });
}

export async function recordObligationPayment(id, body, user) {
  const row = await PayableObligation.findById(id);
  if (!row) throw AppError.notFound("Payable obligation not found");
  const amount = parseFloat(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw AppError.badRequest("Payment amount must be greater than zero");
  }
  const gst = mergeGstFromBody(body, amount);
  const totalPaid = gst.totalAmount ?? amount;
  const received =
    body.amountReceived != null && body.amountReceived !== ""
      ? parseFloat(body.amountReceived)
      : totalPaid;
  const balance =
    body.balanceAmount != null && body.balanceAmount !== ""
      ? parseFloat(body.balanceAmount)
      : null;
  await PayableLedgerEntry.create({
    obligationId: id,
    amount: totalPaid,
    paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
    paymentMode: body.paymentMode || "UPI",
    reference: body.reference || "",
    invoiceNumber: body.invoiceNumber || "",
    invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : null,
    placeOfSupply: body.placeOfSupply || "",
    amountInWords:
      body.amountInWords?.trim() || amountInWordsINR(totalPaid),
    amountReceived: Number.isFinite(received) ? received : totalPaid,
    balanceAmount: Number.isFinite(balance) ? balance : null,
    note: body.note || "",
    receiptUrl: body.receiptUrl || "",
    recordedBy: user?._id || user?.id || null,
    source: "manual",
    ...gst,
  });
  return getObligationById(id);
}

/**
 * Unified cashflow ledger: money in (client) + money out (vendor).
 */
export async function getCashflowLedger({ businessModule, limit = 150 } = {}) {
  const obligationFilter = businessModule ? { businessModule } : {};
  const obligations = await PayableObligation.find(obligationFilter)
    .select("_id vendorId title")
    .populate("vendorId", "name code")
    .lean();
  const obligationIds = obligations.map((o) => o._id);
  const obligationById = new Map(obligations.map((o) => [o._id.toString(), o]));

  const outRows =
    obligationIds.length > 0
      ? await PayableLedgerEntry.find({ obligationId: { $in: obligationIds } })
          .sort({ paidAt: -1 })
          .limit(limit)
          .lean()
      : [];

  const enquiryFilter = businessModule
    ? { businessModule }
    : { businessModule: { $in: ["residential", "services"] } };
  const enquiries = await Enquiry.find(enquiryFilter)
    .select("_id code name")
    .lean();
  const enquiryIds = enquiries.map((e) => e._id);
  const enquiryById = new Map(enquiries.map((e) => [e._id.toString(), e]));

  const inRows =
    enquiryIds.length > 0
      ? await EnquiryPayment.find({
          enquiryId: { $in: enquiryIds },
          status: "Completed",
          clientStatus: { $ne: "disputed" },
        })
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean()
      : [];

  const entries = [];

  for (const row of outRows) {
    const ob = obligationById.get(row.obligationId?.toString());
    const vendor = ob?.vendorId;
    entries.push({
      id: docId(row),
      direction: "out",
      amount: roundMoney(row.amount || 0),
      currency: "INR",
      paidAt: row.paidAt || row.createdAt,
      counterparty: typeof vendor === "object" ? vendor?.name : "Vendor",
      counterpartyCode: typeof vendor === "object" ? vendor?.code : "",
      reference: row.reference || "",
      paymentMode: row.paymentMode || "",
      note: row.note || "",
      receiptUrl: row.receiptUrl || "",
      obligationTitle: ob?.title || "",
      source: "vendor_payment",
    });
  }

  for (const row of inRows) {
    const enq = enquiryById.get(row.enquiryId?.toString());
    entries.push({
      id: docId(row),
      direction: "in",
      amount: paymentAmountNumeric(row),
      currency: "INR",
      paidAt: row.paymentDate ? new Date(row.paymentDate) : row.createdAt,
      counterparty: enq?.name || "Client",
      counterpartyCode: enq?.code || "",
      reference: row.referenceNumber || "",
      paymentMode: row.paymentMode || "",
      note: row.description || row.paymentType || "",
      receiptUrl: row.receiptUrl || "",
      obligationTitle: "",
      source: "client_receipt",
    });
  }

  entries.sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
  );

  const slice = entries.slice(0, limit);
  let totalIn = 0;
  let totalOut = 0;
  for (const e of slice) {
    if (e.direction === "in") totalIn += e.amount;
    else totalOut += e.amount;
  }

  const summaryRollup = await getPayablesSummary({ businessModule });

  return {
    entries: slice,
    totals: {
      inflow: roundMoney(summaryRollup.receivables.totalEarnedFromClients),
      outflow: roundMoney(summaryRollup.payables.totalPaidOut),
      netCashflow: roundMoney(
        summaryRollup.receivables.totalEarnedFromClients -
          summaryRollup.payables.totalPaidOut,
      ),
      recentIn: roundMoney(totalIn),
      recentOut: roundMoney(totalOut),
      currency: "INR",
    },
  };
}

function csvEscape(val) {
  const s = String(val ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** CSV export: obligations + ledger lines for accounting. */
export async function exportPayablesCsv({ businessModule } = {}) {
  const obligations = await listObligations({ businessModule });
  const lines = [
    [
      "Type",
      "Vendor",
      "Obligation",
      "Status",
      "Committed",
      "Paid",
      "Remaining",
      "Currency",
    ].join(","),
  ];

  for (const o of obligations) {
    lines.push(
      [
        "obligation",
        csvEscape(o.vendorName),
        csvEscape(o.title),
        o.status,
        o.committedAmount,
        o.paidTotal,
        o.remaining,
        o.currency,
      ].join(","),
    );
    const detail = await getObligationById(o.id);
    for (const p of detail.payments || []) {
      lines.push(
        [
          "payment",
          csvEscape(o.vendorName),
          csvEscape(o.title),
          "",
          "",
          p.amount,
          "",
          o.currency,
          p.paidAt ? new Date(p.paidAt).toISOString() : "",
          csvEscape(p.paymentMode),
          csvEscape(p.reference),
          csvEscape(p.receiptUrl),
        ].join(","),
      );
    }
  }

  return lines.join("\n");
}
