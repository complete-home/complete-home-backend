import AppError from "../../core/errors/AppError.js";
import { docId } from "../../core/http/formatHelpers.js";
import User from "../user-management/users/user.model.js";
import Attendance from "./attendance.model.js";
import { applyRewardForEvent } from "./rewardRules.service.js";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatAttendance(doc, userName) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: docId(o),
    userId: o.userId?.toString(),
    employeeName: userName || "—",
    date: o.date,
    checkInAt: o.checkInAt,
    checkOutAt: o.checkOutAt,
    geo: o.geo || {},
    projectId: o.projectId?.toString?.() || null,
    status: o.status,
    correctionNote: o.correctionNote || "",
    approvedAt: o.approvedAt,
    businessModule: o.businessModule,
    createdAt: o.createdAt,
  };
}

export async function checkIn(user, body) {
  const date = body.date || todayKey();
  const open = await Attendance.findOne({
    userId: user._id,
    date,
    checkOutAt: null,
    status: { $in: ["open", "pending_approval", "approved"] },
  });
  if (open) {
    throw AppError.badRequest("You already have an open check-in for today");
  }
  const row = await Attendance.create({
    userId: user._id,
    date,
    checkInAt: new Date(),
    geo: body.geo || {},
    projectId: body.projectId || null,
    status: "open",
    businessModule: body.businessModule || user.defaultModule || "residential",
  });
  return formatAttendance(row, user.name);
}

export async function checkOut(user, body) {
  const date = body.date || todayKey();
  const row = await Attendance.findOne({
    userId: user._id,
    date,
    checkOutAt: null,
    status: { $in: ["open", "approved"] },
  }).sort({ checkInAt: -1 });
  if (!row) throw AppError.notFound("No open check-in found for today");
  row.checkOutAt = new Date();
  if (body.geo) row.geo = { ...row.geo, ...body.geo };
  row.status = "pending_approval";
  await row.save();
  return formatAttendance(row, user.name);
}

export async function listAttendance({
  userId,
  dateFrom,
  dateTo,
  status,
  businessModule,
} = {}) {
  const q = {};
  if (userId) q.userId = userId;
  if (status) q.status = status;
  if (businessModule) q.businessModule = businessModule;
  if (dateFrom || dateTo) {
    q.date = {};
    if (dateFrom) q.date.$gte = dateFrom;
    if (dateTo) q.date.$lte = dateTo;
  }
  const rows = await Attendance.find(q).sort({ checkInAt: -1 }).limit(300);
  const userIds = [...new Set(rows.map((r) => r.userId?.toString()))];
  const users = await User.find({ _id: { $in: userIds } }).select(
    "name userId",
  );
  const nameMap = Object.fromEntries(
    users.map((u) => [u._id.toString(), u.name]),
  );
  return rows.map((r) => formatAttendance(r, nameMap[r.userId?.toString()]));
}

export async function approveAttendance(id, body, approver) {
  const row = await Attendance.findById(id);
  if (!row) throw AppError.notFound("Attendance record not found");
  const action = body.action || "approve";
  if (!["approve", "reject"].includes(action)) {
    throw AppError.badRequest("action must be approve or reject");
  }
  row.status = action === "approve" ? "approved" : "rejected";
  row.correctionNote = body.note || row.correctionNote || "";
  row.approvedBy = approver._id;
  row.approvedAt = new Date();
  await row.save();
  const user = await User.findById(row.userId).select("name");
  if (action === "approve") {
    await applyRewardForEvent("attendance_approved", row.userId, {
      refType: "attendance",
      refId: row._id.toString(),
      actor: approver,
    });
  }
  return formatAttendance(row, user?.name);
}
