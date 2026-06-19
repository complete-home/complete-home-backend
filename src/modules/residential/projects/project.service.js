import AppError from "../../../core/errors/AppError.js";
import { Messages } from "../../../core/http/messages.js";
import { nextCode } from "../../../core/counters/counter.service.js";
import {
  formatShortDate,
  getInitials,
  docId,
} from "../../../core/http/formatHelpers.js";
import Project from "./project.model.js";
import Task from "../tasks/task.model.js";
import Enquiry from "../enquiries/enquiry.model.js";

function formatProject(doc, taskStats) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: docId(o),
    code: o.code,
    name: o.name,
    client: o.client,
    clientInitials: o.clientInitials,
    manager: o.manager,
    managerInitials: o.managerInitials,
    managerRole: o.managerRole,
    deadline: o.deadline,
    progress: o.progress,
    status: o.status,
    enquiryCode: o.enquiryCode,
    enquiryId: o.enquiryId?.toString?.() || o.enquiryId || null,
    taskStats: taskStats || {
      total: 0,
      done: 0,
      todo: 0,
      inProgress: 0,
      inReview: 0,
    },
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    dueAt: o.dueAt,
    completedAt: o.completedAt,
    timelinessStatus: o.timelinessStatus || "not_applicable",
    siteAddress: o.siteAddress || "",
    clientPhone: o.clientPhone || "",
    materialScope: o.materialScope || "with",
    workType: o.workType || "",
    source: o.source || "",
    managerId: o.managerId?.toString?.() || o.managerId || null,
    salesHeadId: o.salesHeadId?.toString?.() || o.salesHeadId || null,
    projectHeadId: o.projectHeadId?.toString?.() || o.projectHeadId || null,
    phases: o.phases || {
      currentPhase: "agreement",
      agreementPct: 0,
      planningPct: 0,
      materialPct: 0,
      executionPct: 0,
      siteMgmtPct: 0,
    },
  };
}

async function buildTaskStats(projectId) {
  const tasks = await Task.find({ projectId }).lean();
  if (!tasks.length) {
    return { total: null, done: 0, todo: 0, inProgress: 0, inReview: 0 };
  }
  return {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "done").length,
    todo: tasks.filter((t) => t.status === "todo").length,
    inProgress: tasks.filter((t) => t.status === "progress").length,
    inReview: tasks.filter((t) => t.status === "review").length,
  };
}

export async function listProjects({ moduleId } = {}) {
  const filter = moduleId ? { businessModule: moduleId } : {};
  const rows = await Project.find(filter).sort({ updatedAt: -1 });
  const { syncProjectTimeliness } =
    await import("../../workforce/timeliness.service.js");
  return Promise.all(
    rows.map(async (r) => {
      if (!["Completed", "Closed", "Done"].includes(r.status)) {
        await syncProjectTimeliness(r, { event: "status_sync" });
        const fresh = await Project.findById(r._id);
        return formatProject(fresh, await buildTaskStats(fresh._id));
      }
      return formatProject(r, await buildTaskStats(r._id));
    }),
  );
}

export async function getProjectById(id) {
  const row = await Project.findById(id);
  if (!row) throw AppError.notFound("Project not found");
  return formatProject(row, await buildTaskStats(row._id));
}

export async function getProjectTasksKanban(projectId) {
  const tasks = await Task.find({ projectId }).sort({ createdAt: 1 }).lean();
  const columns = [
    { id: "todo", title: "To do", tasks: [] },
    { id: "progress", title: "In progress", tasks: [] },
    { id: "review", title: "In review", tasks: [] },
    { id: "done", title: "Done", tasks: [] },
  ];
  const map = Object.fromEntries(columns.map((c) => [c.id, c]));
  for (const t of tasks) {
    const col = map[t.status] || map.todo;
    col.tasks.push({
      id: t._id.toString(),
      title: t.title,
      stage: t.stage || "",
      priority: t.priority,
      start: t.startDate,
      end: t.endDate,
      status: t.status,
      timelinessStatus: t.timelinessStatus || "not_applicable",
    });
  }
  return columns;
}

export async function createProject(body) {
  const code = await nextCode("PRJ", "PRJ-", 4, 38);
  const project = await Project.create({
    code,
    name: body.name,
    client: body.client || "",
    clientInitials: body.clientInitials || getInitials(body.client),
    manager: body.manager || "",
    managerInitials: body.managerInitials || getInitials(body.manager),
    managerRole: body.managerRole || "Project Manager",
    deadline: body.deadline || "—",
    progress: body.progress ?? 0,
    status: body.status || "Active",
    enquiryId: body.enquiryId,
    enquiryCode: body.enquiryCode || "",
    businessModule: body.businessModule || "residential",
    workflowId: body.workflowId,
    siteAddress: body.siteAddress || "",
    clientPhone: body.clientPhone || "",
    clientId: body.clientId,
    materialScope: body.materialScope || "with",
  });
  return formatProject(project, await buildTaskStats(project._id));
}

export async function getProjectPhases(id) {
  const row = await Project.findById(id);
  if (!row) throw AppError.notFound("Project not found");
  return row.phases || formatProject(row).phases;
}

export async function updateProjectPhases(id, body) {
  const row = await Project.findById(id);
  if (!row) throw AppError.notFound("Project not found");
  const phases = { ...(row.phases?.toObject?.() || row.phases || {}) };
  const allowed = [
    "currentPhase",
    "agreementPct",
    "planningPct",
    "materialPct",
    "executionPct",
    "siteMgmtPct",
  ];
  for (const k of allowed) {
    if (body[k] !== undefined) phases[k] = body[k];
  }
  row.phases = phases;
  await row.save();
  return formatProject(row, await buildTaskStats(row._id));
}

export async function updateProject(id, body) {
  const allowed = [
    "name",
    "client",
    "clientInitials",
    "manager",
    "managerInitials",
    "managerRole",
    "deadline",
    "progress",
    "status",
    "siteAddress",
    "clientPhone",
    "materialScope",
    "phases",
  ];
  const patch = {};
  for (const k of allowed) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  const prev = await Project.findById(id);
  if (!prev) throw AppError.notFound("Project not found");
  const project = await Project.findByIdAndUpdate(id, patch, { new: true });
  const { syncProjectTimeliness } =
    await import("../../workforce/timeliness.service.js");
  const completedNow =
    ["Completed", "Closed", "Done"].includes(project.status) &&
    !["Completed", "Closed", "Done"].includes(prev.status);
  const progressDone = project.progress >= 100 && (prev.progress || 0) < 100;
  await syncProjectTimeliness(project, {
    event: completedNow || progressDone ? "completed" : "status_sync",
  });
  const fresh = await Project.findById(id);
  return formatProject(fresh, await buildTaskStats(fresh._id));
}

export async function convertEnquiryToProject(enquiryId, body = {}) {
  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) throw AppError.notFound(Messages.enquiry.notFound);

  const existing = await Project.findOne({ enquiryId });
  if (existing)
    return formatProject(existing, await buildTaskStats(existing._id));

  const managerId = body.managerId || body.projectHeadId || enquiry.projectHeadId;
  let managerName = body.manager || "";
  let managerInitials = body.managerInitials || "";
  if (managerId && !managerName) {
    const User = (await import("../../user-management/users/user.model.js"))
      .default;
    const mgr = await User.findById(managerId).lean();
    if (mgr) {
      managerName = mgr.name;
      managerInitials = getInitials(mgr.name);
    }
  }
  if (!managerName && enquiry.projectHeadId) {
    const User = (await import("../../user-management/users/user.model.js"))
      .default;
    const mgr = await User.findById(enquiry.projectHeadId).lean();
    if (mgr) {
      managerName = mgr.name;
      managerInitials = getInitials(mgr.name);
    }
  }

  const siteAddress =
    body.siteAddress ||
    enquiry.fullAddress ||
    enquiry.address ||
    [enquiry.building, enquiry.area, enquiry.city].filter(Boolean).join(", ");

  const code = await nextCode("PRJ", "PRJ-", 4, 38);
  const project = await Project.create({
    code,
    name: body.name || `${enquiry.name} Project`,
    client: enquiry.name,
    clientInitials: enquiry.initials || getInitials(enquiry.name),
    clientId: enquiry.clientId,
    clientPhone: enquiry.mobile || body.clientPhone || "",
    siteAddress,
    workType: enquiry.workType || enquiry.service || "",
    source: enquiry.source || "",
    salesHeadId: enquiry.salesHeadId || undefined,
    projectHeadId:
      managerId || enquiry.projectHeadId || undefined,
    manager: managerName,
    managerInitials,
    managerId: managerId || enquiry.projectHeadId || undefined,
    managerRole: body.managerRole || "Project Head",
    enquiryId: enquiry._id,
    enquiryCode: enquiry.code,
    businessModule: enquiry.businessModule,
    deadline: body.deadline || "—",
    materialScope: body.materialScope || "with",
  });

  const Quotation = (await import("../quotations/quotation.model.js")).default;
  await Quotation.updateMany(
    { enquiryId: enquiry._id },
    { $set: { projectId: project._id } },
  );

  if (enquiry.status !== "Deal") {
    enquiry.status = "Deal";
    await enquiry.save();
  }

  return formatProject(project, await buildTaskStats(project._id));
}
