import AppError from "../../core/errors/AppError.js";
import { docId } from "../../core/http/formatHelpers.js";
import PayableObligation from "../common/payables/payableObligation.model.js";
import PayableLedgerEntry from "../common/payables/payableLedgerEntry.model.js";
import { Vendor } from "../common/masters/master.model.js";
import {
  listVendorQuotationsForVendor,
  submitVendorQuotation as submitVendorQuotationCore,
} from "../common/vendor-quotations/vendorQuotation.service.js";

function assertVendorAccount(user) {
  if (user.userType !== "vendor") {
    throw AppError.forbidden("Vendor account required");
  }
  if (!user.vendorId) {
    throw AppError.badRequest(
      "Vendor profile not linked. Contact admin to link your account to a vendor record.",
    );
  }
}

async function paidByObligation(obligationIds) {
  const rows = await PayableLedgerEntry.find({
    obligationId: { $in: obligationIds },
  })
    .select("obligationId amount paymentMode reference paidAt createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const map = new Map();
  for (const r of rows) {
    const key = r.obligationId.toString();
    map.set(key, (map.get(key) || 0) + (r.amount || 0));
  }
  return { map, payments: rows };
}

function formatOrder(o, paidMap) {
  const id = o._id.toString();
  const paid = paidMap.get(id) || 0;
  const committed = o.committedAmount || 0;
  return {
    id,
    title: o.title,
    status: o.status,
    committedAmount: committed,
    paidAmount: paid,
    outstanding: Math.max(0, committed - paid),
    currency: o.currency || "INR",
    dueDate: o.dueDate,
    notes: o.notes || "",
    businessModule: o.businessModule,
    createdAt: o.createdAt,
  };
}

export async function getVendorDashboard(user) {
  assertVendorAccount(user);
  const vendor = await Vendor.findById(user.vendorId).lean();
  const obligations = await PayableObligation.find({
    vendorId: user.vendorId,
    status: { $in: ["active", "closed"] },
  })
    .sort({ updatedAt: -1 })
    .lean();

  const ids = obligations.map((o) => o._id);
  const { map: paidMap } = await paidByObligation(ids);

  let totalCommitted = 0;
  let totalPaid = 0;
  for (const o of obligations) {
    if (o.status !== "active") continue;
    totalCommitted += o.committedAmount || 0;
    totalPaid += paidMap.get(o._id.toString()) || 0;
  }

  const orders = obligations
    .filter((o) => o.status === "active")
    .slice(0, 8)
    .map((o) => formatOrder(o, paidMap));

  return {
    vendorName: vendor?.name || user.name,
    vendorCode: vendor?.code || "",
    summary: {
      activeOrders: obligations.filter((o) => o.status === "active").length,
      totalCommitted,
      totalPaid,
      totalOutstanding: Math.max(0, totalCommitted - totalPaid),
    },
    recentOrders: orders,
    quotationRequests: [],
  };
}

export async function listVendorOrders(user) {
  assertVendorAccount(user);
  const obligations = await PayableObligation.find({ vendorId: user.vendorId })
    .sort({ updatedAt: -1 })
    .lean();
  const ids = obligations.map((o) => o._id);
  const { map: paidMap, payments } = await paidByObligation(ids);

  return {
    orders: obligations.map((o) => formatOrder(o, paidMap)),
    recentPayments: payments.slice(0, 20).map((p) => ({
      id: docId(p),
      obligationId: p.obligationId?.toString(),
      amount: p.amount,
      paymentMode: p.paymentMode,
      reference: p.reference,
      paidAt: p.paidAt || p.createdAt,
    })),
  };
}

export async function listVendorQuotations(user) {
  assertVendorAccount(user);
  return listVendorQuotationsForVendor(user);
}

export async function submitVendorQuotation(id, body, user) {
  assertVendorAccount(user);
  return submitVendorQuotationCore(id, body, user);
}
