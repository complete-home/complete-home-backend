import mongoose from "mongoose";
import {
  evaluateTimeliness,
  monthKeyFromDate,
  parseScheduleDate,
} from "../../core/utils/scheduleDates.js";
import TimelinessLog from "./timelinessLog.model.js";
import Task from "../residential/tasks/task.model.js";
import Project from "../residential/projects/project.model.js";
import User from "../user-management/users/user.model.js";

const PROJECT_COMPLETE_STATUSES = ["Completed", "Closed", "Done"];

function isProjectComplete(status) {
  return PROJECT_COMPLETE_STATUSES.includes(status);
}

async function resolveUserNames(ids) {
  if (!ids?.length) return [];
  const objectIds = ids
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  if (!objectIds.length) return [];
  const users = await User.find({ _id: { $in: objectIds } }).select("name");
  return users.map((u) => u.name);
}

async function appendLog(entry) {
  return TimelinessLog.create(entry);
}

export async function syncTaskTimeliness(
  taskDoc,
  { event = "status_sync", actor } = {},
) {
  const t = taskDoc.toObject ? taskDoc.toObject() : taskDoc;
  const dueAt = parseScheduleDate(t.endDate);
  const isComplete = t.status === "done";
  const completedAt =
    isComplete && t.completedAt
      ? new Date(t.completedAt)
      : isComplete
        ? new Date()
        : null;
  const evalResult = evaluateTimeliness({ dueAt, completedAt, isComplete });

  const patch = {
    dueAt,
    timelinessStatus: evalResult.status,
    completedAt: evalResult.completedAt || null,
  };
  await Task.updateOne({ _id: t._id }, { $set: patch });

  if (event === "completed" || (event === "status_sync" && isComplete)) {
    const userNames = await resolveUserNames(t.assignedIds || []);
    await appendLog({
      entityType: "task",
      entityId: t._id,
      entityCode: t.taskCode,
      entityTitle: t.title,
      userIds: (t.assignedIds || [])
        .filter((id) => mongoose.isValidObjectId(id))
        .map((id) => new mongoose.Types.ObjectId(id)),
      userNames,
      timelinessStatus: evalResult.status,
      event: isComplete ? "completed" : event,
      dueAt,
      completedAt: evalResult.completedAt,
      monthKey: monthKeyFromDate(evalResult.completedAt || new Date()),
      businessModule: t.businessModule,
      projectId: t.projectId || null,
      note: isComplete
        ? `Task completed — ${evalResult.status === "on_time" ? "on time" : "late"}`
        : evalResult.status === "overdue"
          ? "Task past deadline"
          : "Deadline tracked",
      recordedBy: actor?.name || actor?.userId || "System",
    });
  }

  return { ...evalResult, ...patch };
}

export async function syncProjectTimeliness(
  projectDoc,
  { event = "status_sync", actor } = {},
) {
  const p = projectDoc.toObject ? projectDoc.toObject() : projectDoc;
  const dueAt = parseScheduleDate(p.deadline);
  const isComplete =
    isProjectComplete(p.status) || (p.progress >= 100 && p.progress > 0);
  const completedAt =
    isComplete && p.completedAt
      ? new Date(p.completedAt)
      : isComplete
        ? new Date()
        : null;
  const evalResult = evaluateTimeliness({ dueAt, completedAt, isComplete });

  const patch = {
    dueAt,
    timelinessStatus: evalResult.status,
    completedAt: evalResult.completedAt || null,
  };
  await Project.updateOne({ _id: p._id }, { $set: patch });

  if (event === "completed" || (isComplete && event === "status_sync")) {
    const userIds = p.managerId ? [p.managerId] : [];
    const userNames = await resolveUserNames(userIds);
    await appendLog({
      entityType: "project",
      entityId: p._id,
      entityCode: p.code,
      entityTitle: p.name,
      userIds,
      userNames,
      timelinessStatus: evalResult.status,
      event: isComplete ? "completed" : event,
      dueAt,
      completedAt: evalResult.completedAt,
      monthKey: monthKeyFromDate(evalResult.completedAt || new Date()),
      businessModule: p.businessModule,
      projectId: p._id,
      note: isComplete
        ? `Project completed — ${evalResult.status === "on_time" ? "on time" : "late"}`
        : evalResult.status === "overdue"
          ? "Project past deadline"
          : "Deadline tracked",
      recordedBy: actor?.name || actor?.userId || "System",
    });
  }

  return { ...evalResult, ...patch };
}

/** Refresh all open tasks/projects overdue flags (no completion logs). */
export async function refreshOpenTimeliness({ businessModule } = {}) {
  const taskFilter = { status: { $ne: "done" } };
  const projFilter = { status: { $nin: PROJECT_COMPLETE_STATUSES } };
  if (businessModule) {
    taskFilter.businessModule = businessModule;
    projFilter.businessModule = businessModule;
  }
  const tasks = await Task.find(taskFilter);
  const projects = await Project.find(projFilter);
  for (const t of tasks) {
    await syncTaskTimeliness(t, { event: "status_sync" });
  }
  for (const p of projects) {
    await syncProjectTimeliness(p, { event: "status_sync" });
  }
  return { tasks: tasks.length, projects: projects.length };
}

export async function listTimelinessLogs({
  month,
  entityType,
  userId,
  limit = 200,
} = {}) {
  const q = {};
  if (month) q.monthKey = month;
  if (entityType) q.entityType = entityType;
  if (userId && mongoose.isValidObjectId(userId)) {
    q.userIds = userId;
  }
  const rows = await TimelinessLog.find(q)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return rows.map((r) => ({
    id: r._id.toString(),
    entityType: r.entityType,
    entityId: r.entityId?.toString(),
    entityCode: r.entityCode,
    entityTitle: r.entityTitle,
    userNames: r.userNames || [],
    timelinessStatus: r.timelinessStatus,
    event: r.event,
    dueAt: r.dueAt,
    completedAt: r.completedAt,
    monthKey: r.monthKey,
    note: r.note,
    recordedBy: r.recordedBy,
    createdAt: r.createdAt,
  }));
}

export async function getMonthlyTimelinessReport({
  year,
  month,
  businessModule,
} = {}) {
  const now = new Date();
  const y = year || now.getFullYear();
  const m = month || now.getMonth() + 1;
  const monthKey = `${y}-${String(m).padStart(2, "0")}`;

  const logFilter = { monthKey };
  if (businessModule) logFilter.businessModule = businessModule;

  const logs = await TimelinessLog.find({
    ...logFilter,
    event: { $in: ["completed", "status_sync"] },
    timelinessStatus: { $in: ["on_time", "late", "overdue"] },
  }).lean();

  const summary = {
    monthKey,
    tasks: { on_time: 0, late: 0, overdue: 0, pending: 0, total: 0 },
    projects: { on_time: 0, late: 0, overdue: 0, pending: 0, total: 0 },
  };

  const seen = new Set();
  for (const row of logs) {
    const key = `${row.entityType}:${row.entityId}`;
    if (seen.has(key) && row.event !== "completed") continue;
    seen.add(key);
    const bucket =
      row.entityType === "project" ? summary.projects : summary.tasks;
    bucket.total += 1;
    if (row.timelinessStatus === "on_time") bucket.on_time += 1;
    else if (row.timelinessStatus === "late") bucket.late += 1;
    else if (row.timelinessStatus === "overdue") bucket.overdue += 1;
    else if (row.timelinessStatus === "pending") bucket.pending += 1;
  }

  const taskFilter = businessModule ? { businessModule } : {};
  const openTasks = await Task.find({
    ...taskFilter,
    status: { $ne: "done" },
    timelinessStatus: { $in: ["pending", "overdue"] },
  }).countDocuments();
  const openProjects = await Project.find({
    ...(businessModule ? { businessModule } : {}),
    status: { $nin: PROJECT_COMPLETE_STATUSES },
    timelinessStatus: { $in: ["pending", "overdue"] },
  }).countDocuments();

  summary.tasks.pending = openTasks;
  summary.projects.pending = openProjects;

  return {
    monthKey,
    summary,
    logs: logs.slice(0, 100).map((r) => ({
      id: r._id.toString(),
      entityType: r.entityType,
      entityCode: r.entityCode,
      entityTitle: r.entityTitle,
      timelinessStatus: r.timelinessStatus,
      userNames: r.userNames,
      completedAt: r.completedAt,
      dueAt: r.dueAt,
      createdAt: r.createdAt,
    })),
  };
}

export async function getEmployeeTimelinessSummary({ businessModule } = {}) {
  const employees = await User.find({
    userType: { $in: ["employee", "supervisor", "contractor", "department"] },
    status: "Active",
  })
    .populate("designationId", "name")
    .populate("designationIds", "name")
    .lean();

  const monthKey = monthKeyFromDate();
  const logs = await TimelinessLog.find({
    monthKey,
    timelinessStatus: { $in: ["on_time", "late", "overdue"] },
  }).lean();

  const byUser = new Map();
  for (const emp of employees) {
    byUser.set(emp._id.toString(), {
      userId: emp._id.toString(),
      empCode: emp.userId,
      name: emp.name,
      initials: emp.initials,
      designations: [
        emp.designationId?.name,
        ...(emp.designationIds || []).map((d) => d?.name),
      ].filter(Boolean),
      onTime: 0,
      late: 0,
      overdue: 0,
      overallStatus: "green",
    });
  }

  for (const log of logs) {
    for (const uid of log.userIds || []) {
      const key = uid.toString();
      const row = byUser.get(key);
      if (!row) continue;
      if (log.timelinessStatus === "on_time") row.onTime += 1;
      if (log.timelinessStatus === "late") row.late += 1;
      if (log.timelinessStatus === "overdue") row.overdue += 1;
    }
  }

  const openTasks = await Task.find({
    ...(businessModule ? { businessModule } : {}),
    status: { $ne: "done" },
    timelinessStatus: "overdue",
  })
    .select("assignedIds")
    .lean();

  for (const t of openTasks) {
    for (const aid of t.assignedIds || []) {
      const row = byUser.get(aid?.toString?.() || aid);
      if (row) row.overdue += 1;
    }
  }

  const result = [...byUser.values()].map((row) => {
    if (row.late > 0 || row.overdue > 0) row.overallStatus = "red";
    else if (row.onTime > 0) row.overallStatus = "green";
    else row.overallStatus = "neutral";
    return row;
  });

  result.sort((a, b) => {
    if (a.overallStatus === "red" && b.overallStatus !== "red") return -1;
    if (b.overallStatus === "red" && a.overallStatus !== "red") return 1;
    return a.name.localeCompare(b.name);
  });

  return { monthKey, employees: result };
}
