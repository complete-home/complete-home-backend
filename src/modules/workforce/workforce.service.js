import AppError from "../../core/errors/AppError.js";
import { docId } from "../../core/http/formatHelpers.js";
import User from "../user-management/users/user.model.js";
import EmployeePayment from "./employeePayment.model.js";
import { mergeGstFromBody } from "../../core/utils/indiaGst.js";
import { formatGstFields } from "../../core/schemas/gstPaymentFields.js";
import RewardLedger from "./rewardLedger.model.js";

function formatPayment(doc, employeeName) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: docId(o),
    employeeId: o.employeeId?.toString(),
    employeeName: employeeName || "—",
    amount: o.amount,
    paymentType: o.paymentType,
    paymentMode: o.paymentMode,
    reference: o.reference,
    notes: o.notes,
    paidAt: o.paidAt,
    status: o.status,
    ...formatGstFields(o),
    totalAmount: o.totalAmount ?? o.amount,
  };
}

function formatReward(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: docId(o),
    userId: o.userId?.toString(),
    points: o.points,
    reason: o.reason,
    refType: o.refType,
    refId: o.refId,
    createdBy: o.createdBy,
    createdAt: o.createdAt,
  };
}

export async function listEmployeePayments({ employeeId } = {}) {
  const filter = employeeId ? { employeeId } : {};
  const rows = await EmployeePayment.find(filter)
    .sort({ paidAt: -1 })
    .limit(200);
  const empIds = [
    ...new Set(rows.map((r) => r.employeeId?.toString()).filter(Boolean)),
  ];
  const users = await User.find({ _id: { $in: empIds } }).select("name userId");
  const nameMap = Object.fromEntries(
    users.map((u) => [u._id.toString(), u.name]),
  );
  return rows.map((r) => formatPayment(r, nameMap[r.employeeId?.toString()]));
}

export async function createEmployeePayment(body) {
  const employee = await User.findById(body.employeeId);
  if (!employee || employee.userType === "client") {
    throw AppError.notFound("Employee not found");
  }
  const base = Number(body.amount);
  const gst = mergeGstFromBody(body, base);
  const doc = await EmployeePayment.create({
    employeeId: body.employeeId,
    amount: gst.totalAmount ?? base,
    paymentType: body.paymentType || "salary",
    paymentMode: body.paymentMode || "Bank Transfer",
    reference: body.reference || "",
    notes: body.notes || "",
    paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
    status: body.status || "completed",
    businessModule: body.businessModule || "residential",
    ...gst,
  });
  return formatPayment(doc, employee.name);
}

export async function listRewards({ userId } = {}) {
  const filter = userId ? { userId } : {};
  const rows = await RewardLedger.find(filter)
    .sort({ createdAt: -1 })
    .limit(300);
  const balances = await computeBalances(userId);
  return {
    entries: rows.map(formatReward),
    balances,
  };
}

async function computeBalances(userId) {
  const match = userId ? { userId } : {};
  const rows = await RewardLedger.aggregate([
    { $match: match },
    { $group: { _id: "$userId", total: { $sum: "$points" } } },
  ]);
  const users = await User.find({
    _id: { $in: rows.map((r) => r._id) },
    userType: { $in: ["employee", "contractor", "supervisor"] },
  }).select("name userId");
  const nameMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));
  return rows.map((r) => ({
    userId: r._id.toString(),
    employeeName: nameMap[r._id.toString()]?.name || "—",
    empCode: nameMap[r._id.toString()]?.userId || "",
    points: r.total,
  }));
}

export async function createRewardEntry(body, actor) {
  const user = await User.findById(body.userId);
  if (!user) throw AppError.notFound("Employee not found");
  const doc = await RewardLedger.create({
    userId: body.userId,
    points: Number(body.points),
    reason: body.reason,
    refType: body.refType || "",
    refId: body.refId || "",
    createdBy: actor?.name || actor?.userId || "Admin",
  });
  return formatReward(doc);
}
