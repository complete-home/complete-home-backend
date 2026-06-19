import AppError from "../../../core/errors/AppError.js";
import { nextCode } from "../../../core/counters/counter.service.js";
import { docId } from "../../../core/http/formatHelpers.js";
import Workflow from "./workflow.model.js";

function countWorkflowMeta(stages = []) {
  const serviceIds = new Set();
  let totalTasks = 0;
  for (const s of stages) {
    if (s.serviceId) serviceIds.add(s.serviceId);
    totalTasks += (s.tasks || []).length;
  }
  return { services: serviceIds.size || stages.length, totalTasks };
}

function formatWorkflowList(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const meta = countWorkflowMeta(o.stages);
  return {
    id: docId(o),
    name: o.name,
    description: o.description,
    status: o.status,
    services: meta.services,
    totalTasks: meta.totalTasks,
  };
}

function formatWorkflowDetail(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const stages = (o.stages || []).map((s, idx) => ({
    id: s._id.toString(),
    order: s.order ?? idx + 1,
    title: s.title,
    serviceCode: s.serviceCode || s.serviceId || "",
    taskCount: (s.tasks || []).length,
    expanded: s.expanded !== false,
    tasks: (s.tasks || []).map((t, ti) => ({
      id: t._id.toString(),
      code: t.code || String(ti + 1).padStart(2, "0"),
      title: t.title,
    })),
  }));
  return {
    id: docId(o),
    name: o.name,
    description: o.description,
    status: o.status,
    stages,
  };
}

export async function listWorkflows({ moduleId } = {}) {
  const filter = moduleId ? { businessModule: moduleId } : {};
  const rows = await Workflow.find(filter).sort({ updatedAt: -1 });
  return rows.map(formatWorkflowList);
}

export async function getWorkflowById(id) {
  const row = await Workflow.findById(id);
  if (!row) throw AppError.notFound("Workflow not found");
  return formatWorkflowDetail(row);
}

export async function createWorkflow(body) {
  const stages = await normalizeStages(body.stages || []);
  const workflow = await Workflow.create({
    name: body.name,
    description: body.description || "",
    status: body.status || "Draft",
    stages,
    businessModule: body.businessModule || "residential",
  });
  return formatWorkflowList(workflow);
}

async function normalizeStages(stages) {
  let taskCounter = 0;
  const out = [];
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    const tasks = [];
    for (const t of s.tasks || []) {
      taskCounter += 1;
      tasks.push({
        code: t.code || String(taskCounter).padStart(2, "0"),
        title: t.title || "Task",
      });
    }
    out.push({
      order: i + 1,
      title: s.title || s.serviceId || `Stage ${i + 1}`,
      serviceId: s.serviceId,
      serviceCode: s.serviceCode || s.serviceId,
      expanded: s.expanded !== false,
      tasks,
    });
  }
  return out;
}

export async function updateWorkflow(id, body) {
  const patch = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.description !== undefined) patch.description = body.description;
  if (body.status !== undefined) patch.status = body.status;
  if (body.stages !== undefined)
    patch.stages = await normalizeStages(body.stages);

  const workflow = await Workflow.findByIdAndUpdate(id, patch, { new: true });
  if (!workflow) throw AppError.notFound("Workflow not found");
  return formatWorkflowDetail(workflow);
}

export async function publishWorkflow(id) {
  const workflow = await Workflow.findByIdAndUpdate(
    id,
    { status: "Published" },
    { new: true },
  );
  if (!workflow) throw AppError.notFound("Workflow not found");
  return formatWorkflowDetail(workflow);
}
