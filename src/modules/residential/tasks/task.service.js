import AppError from "../../../core/errors/AppError.js";
import { nextCode } from "../../../core/counters/counter.service.js";
import { getInitials, docId } from "../../../core/http/formatHelpers.js";
import Task, { TASK_STATUSES } from "./task.model.js";
import User from "../../user-management/users/user.model.js";

function formatTask(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: docId(o),
    taskCode: o.taskCode,
    title: o.title,
    taskType: o.taskType,
    description: o.description,
    priority: o.priority,
    status: o.status,
    startDate: o.startDate,
    endDate: o.endDate,
    followUpNotes: o.followUpNotes,
    assignedIds: o.assignedIds || [],
    assigneeInitials: o.assigneeInitials,
    attachments: o.attachments ?? 0,
    comments: o.comments ?? 0,
    clientId: o.clientId?.toString?.() || o.clientId || null,
    projectId: o.projectId?.toString?.() || o.projectId || null,
    enquiryId: o.enquiryId?.toString?.() || o.enquiryId || null,
    stage: o.stage,
  };
}

export async function listTasks({ moduleId, projectId } = {}) {
  const filter = {};
  if (moduleId) filter.businessModule = moduleId;
  if (projectId) filter.projectId = projectId;
  const rows = await Task.find(filter).sort({ updatedAt: -1 });
  const { syncTaskTimeliness } =
    await import("../../workforce/timeliness.service.js");
  const out = [];
  for (const row of rows) {
    if (row.status !== "done") {
      await syncTaskTimeliness(row, { event: "status_sync" });
      const fresh = await Task.findById(row._id);
      out.push(formatTask(fresh));
    } else {
      out.push(formatTask(row));
    }
  }
  return out;
}

export async function getTaskById(id) {
  const row = await Task.findById(id);
  if (!row) throw AppError.notFound("Task not found");
  return formatTask(row);
}

export async function createTask(body) {
  const taskCode = await nextCode("TSK", "", 4, 1);
  const task = await Task.create({
    taskCode,
    title: body.title,
    taskType: body.taskType || "General",
    description: body.description || "",
    priority: body.priority || "Medium",
    status: body.status || "todo",
    startDate: body.startDate || "",
    endDate: body.endDate || "",
    followUpNotes: body.followUpNotes || "",
    assignedIds: body.assignedIds || [],
    assigneeInitials: body.assigneeInitials || "",
    clientId: body.clientId,
    projectId: body.projectId,
    enquiryId: body.enquiryId,
    stage: body.stage || "",
    businessModule: body.businessModule || "residential",
  });
  const { syncTaskTimeliness } =
    await import("../../workforce/timeliness.service.js");
  await syncTaskTimeliness(task, { event: "deadline_set" });
  const fresh = await Task.findById(task._id);
  return formatTask(fresh);
}

export async function updateTask(id, body) {
  const allowed = [
    "title",
    "taskType",
    "description",
    "priority",
    "status",
    "startDate",
    "endDate",
    "followUpNotes",
    "assignedIds",
    "assigneeInitials",
    "clientId",
    "stage",
  ];
  const patch = {};
  for (const k of allowed) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  if (patch.status && !TASK_STATUSES.includes(patch.status)) {
    throw AppError.badRequest(
      `Invalid status. Allowed: ${TASK_STATUSES.join(", ")}`,
    );
  }
  const prev = await Task.findById(id);
  if (!prev) throw AppError.notFound("Task not found");
  const task = await Task.findByIdAndUpdate(id, patch, { new: true });
  if (
    patch.status === "done" &&
    prev.status !== "done" &&
    task.assignedIds?.length
  ) {
    try {
      const { applyRewardForEvent } =
        await import("../../workforce/rewardRules.service.js");
      for (const assigneeId of task.assignedIds) {
        if (!assigneeId) continue;
        await applyRewardForEvent("task_complete", assigneeId, {
          refType: "task",
          refId: task._id.toString(),
        });
      }
    } catch {
      /* rewards optional */
    }
  }
  return formatTask(task);
}

export async function deleteTask(id) {
  const task = await Task.findByIdAndDelete(id);
  if (!task) throw AppError.notFound("Task not found");
  return { deleted: true };
}

/** Assignees for modals: users + clients + vendors */
export async function listAssignees() {
  const users = await User.find({ status: "Active" })
    .select("userId name initials userType")
    .lean();
  return {
    employees: users.map((u) => ({
      id: u._id.toString(),
      empId: u.userId,
      name: u.name,
      role: u.userType,
      status: "Active",
      initials: u.initials || getInitials(u.name),
    })),
  };
}
