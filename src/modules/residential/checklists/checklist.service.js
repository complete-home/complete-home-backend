import mongoose from "mongoose";
import AppError from "../../../core/errors/AppError.js";
import { docId } from "../../../core/http/formatHelpers.js";
import Project from "../projects/project.model.js";
import ChecklistTemplate from "./checklistTemplate.model.js";
import ChecklistInstance from "./checklistInstance.model.js";
import Workflow from "../workflows/workflow.model.js";
import { getPhaseSections } from "../projects/projectPhaseConfig.service.js";
import {
  getSheetLabel,
  resolveSheetId,
  sortSheetCodes,
} from "./checklistSheetCatalog.js";

const WORKFLOW_PHASES = ["planning", "execution", "site_management"];

function formatInstance(row) {
  const o = row.toObject ? row.toObject() : row;
  return {
    id: docId(o),
    projectId: o.projectId?.toString?.(),
    templateId: o.templateId?.toString?.() || null,
    phase: o.phase,
    sheetCode: o.sheetCode,
    stage: o.stage,
    sortOrder: o.sortOrder,
    label: o.label,
    status: o.status,
    value: o.value || "",
    assigneeId: o.assigneeId?.toString?.() || null,
    signedAt: o.signedAt,
    photos: o.photos || [],
    note: o.note || "",
    source: o.source || "template",
    deletable: Boolean(o.deletable),
    workflowId: o.workflowId?.toString?.() || null,
    workflowStageId: o.workflowStageId || "",
    workflowTaskId: o.workflowTaskId || "",
  };
}

async function syncPhasePct(projectId, phase, pctField) {
  const instances = await ChecklistInstance.find({ projectId, phase }).lean();
  if (!instances.length) return;
  const done = instances.filter((i) => {
    if (phase === "material_brand") {
      return (
        i.status === "done" ||
        i.status === "na" ||
        (i.value && String(i.value).trim())
      );
    }
    return i.status === "done" || i.status === "na";
  }).length;
  const pct = Math.round((done / instances.length) * 100);
  await Project.findByIdAndUpdate(projectId, {
    $set: { [`phases.${pctField}`]: pct },
  });
  return pct;
}

async function syncPlanningPct(projectId) {
  return syncPhasePct(projectId, "planning", "planningPct");
}

async function syncMaterialBrandPct(projectId) {
  return syncPhasePct(projectId, "material_brand", "materialPct");
}

async function syncExecutionPct(projectId) {
  return syncPhasePct(projectId, "execution", "executionPct");
}

async function syncSiteMgmtPct(projectId) {
  return syncPhasePct(projectId, "site_management", "siteMgmtPct");
}

export async function listProjectChecklists(projectId, { phase, sheetCode }) {
  const project = await Project.findById(projectId);
  if (!project) throw AppError.notFound("Project not found");

  const q = { projectId };
  if (phase) q.phase = phase;
  if (sheetCode) q.sheetCode = sheetCode;

  const rows = await ChecklistInstance.find(q).sort({
    sheetCode: 1,
    sortOrder: 1,
  });

  const phaseKey = phase || rows[0]?.phase || "planning";
  const bySheet = {};
  for (const row of rows) {
    const code = resolveSheetId(phaseKey, row.sheetCode);
    if (!bySheet[code]) {
      bySheet[code] = {
        sheetCode: code,
        sheetLabel: getSheetLabel(phaseKey, code),
        sheetTitle: getSheetLabel(phaseKey, code),
        items: [],
        done: 0,
        total: 0,
      };
    }
    const item = formatInstance(row);
    bySheet[code].items.push(item);
    bySheet[code].total += 1;
    const brandDone = item.status === "done" || item.status === "na";
    if (brandDone) {
      bySheet[code].done += 1;
    }
  }

  let sheetOrder = sortSheetCodes(phaseKey, Object.keys(bySheet));
  if (WORKFLOW_PHASES.includes(phaseKey)) {
    try {
      const sections = await getPhaseSections(projectId, phaseKey);
      for (const sec of sections) {
        if (!bySheet[sec.id]) {
          bySheet[sec.id] = {
            sheetCode: sec.id,
            sheetLabel: sec.title,
            sheetTitle: sec.title,
            items: [],
            done: 0,
            total: 0,
          };
        } else {
          bySheet[sec.id].sheetLabel = sec.title;
          bySheet[sec.id].sheetTitle = sec.title;
        }
      }
      sheetOrder = sections
        .map((s) => s.id)
        .concat(sheetOrder.filter((id) => !sections.some((s) => s.id === id)));
    } catch {
      /* phase config optional */
    }
  }

  const sheets = sheetOrder.map((code) => {
    const s = bySheet[code];
    return {
      ...s,
      pct: s.total ? Math.round((s.done / s.total) * 100) : 0,
    };
  });

  const total = rows.length;
  const done = rows.filter(
    (r) => r.status === "done" || r.status === "na",
  ).length;

  return {
    phase: phase || "planning",
    sheets,
    progress: {
      done,
      total,
      pct: total ? Math.round((done / total) * 100) : 0,
    },
    initialized: total > 0,
  };
}

export async function initializeProjectChecklists(projectId, { phase }) {
  const project = await Project.findById(projectId);
  if (!project) throw AppError.notFound("Project not found");
  if (!phase) throw AppError.badRequest("phase is required");

  const existing = await ChecklistInstance.countDocuments({
    projectId,
    phase,
  });
  if (existing > 0) {
    return {
      created: 0,
      existing,
      message: "Checklists already initialized for this phase",
    };
  }

  const templates = await ChecklistTemplate.find({ phase }).sort({
    sheetCode: 1,
    sortOrder: 1,
  });
  if (!templates.length) {
    throw AppError.notFound(
      `No checklist templates for phase "${phase}". Run seed script first.`,
    );
  }

  const docs = templates.map((t) => ({
    projectId,
    templateId: t._id,
    phase: t.phase,
    sheetCode: t.sheetCode,
    stage: t.stage,
    sortOrder: t.sortOrder,
    label: t.label,
    status: "pending",
    source: "template",
    deletable: true,
  }));

  await ChecklistInstance.insertMany(docs, { ordered: false });

  if (phase === "planning") {
    await syncPlanningPct(projectId);
  }
  if (phase === "material_brand") {
    await syncMaterialBrandPct(projectId);
  }
  if (phase === "execution") {
    await syncExecutionPct(projectId);
  }
  if (phase === "site_management") {
    await syncSiteMgmtPct(projectId);
  }

  return { created: docs.length, existing: 0 };
}

export async function bulkUpdateChecklistInstances(projectId, { updates }) {
  if (!Array.isArray(updates) || !updates.length) {
    throw AppError.badRequest("updates array is required");
  }
  if (!mongoose.isValidObjectId(projectId)) {
    throw AppError.badRequest("Invalid project id");
  }

  const projectOid = new mongoose.Types.ObjectId(projectId);
  let modified = 0;

  for (const u of updates) {
    if (!u.id || !u.status || !mongoose.isValidObjectId(u.id)) continue;

    const patch = {
      status: u.status,
      note: u.note ?? "",
      signedAt: u.status === "done" || u.status === "na" ? new Date() : null,
    };
    if (u.value !== undefined) patch.value = u.value;

    const result = await ChecklistInstance.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(u.id), projectId: projectOid },
      { $set: patch },
      { new: true },
    );
    if (result) modified += 1;
  }

  if (modified === 0) {
    throw AppError.notFound(
      "No checklist items were updated. Refresh the page and try again.",
    );
  }

  const phase = updates[0]?.phase || "planning";
  let planningPct;
  let materialPct;
  let executionPct;
  let siteMgmtPct;
  if (phase === "planning") {
    planningPct = await syncPlanningPct(projectId);
  }
  if (phase === "material_brand") {
    materialPct = await syncMaterialBrandPct(projectId);
  }
  if (phase === "execution") {
    executionPct = await syncExecutionPct(projectId);
  }
  if (phase === "site_management") {
    siteMgmtPct = await syncSiteMgmtPct(projectId);
  }

  return {
    updated: modified,
    planningPct,
    materialPct,
    executionPct,
    siteMgmtPct,
  };
}

export async function attachWorkflowToSection(
  projectId,
  { phase, sheetCode, workflowId },
) {
  if (!phase || !sheetCode || !workflowId) {
    throw AppError.badRequest("phase, sheetCode, and workflowId are required");
  }
  const workflow = await Workflow.findById(workflowId);
  if (!workflow) throw AppError.notFound("Workflow not found");

  const maxSort = await ChecklistInstance.findOne({
    projectId,
    phase,
    sheetCode,
  })
    .sort({ sortOrder: -1 })
    .lean();
  let sortOrder = maxSort?.sortOrder || 0;
  const docs = [];

  for (const stage of workflow.stages || []) {
    const stageId = stage._id?.toString?.() || "";
    for (const task of stage.tasks || []) {
      sortOrder += 1;
      docs.push({
        projectId,
        templateId: null,
        phase,
        sheetCode,
        stage: stage.title,
        sortOrder,
        label: task.title,
        status: "pending",
        source: "workflow",
        deletable: true,
        workflowId: workflow._id,
        workflowStageId: stageId,
        workflowTaskId: task._id?.toString?.() || "",
      });
    }
  }

  if (!docs.length) {
    throw AppError.badRequest("Workflow has no tasks");
  }

  await ChecklistInstance.insertMany(docs, { ordered: false });
  await syncPhasePctForPhase(projectId, phase);
  return { created: docs.length, workflowName: workflow.name };
}

async function syncPhasePctForPhase(projectId, phase) {
  if (phase === "planning") return syncPlanningPct(projectId);
  if (phase === "material_brand") return syncMaterialBrandPct(projectId);
  if (phase === "execution") return syncExecutionPct(projectId);
  if (phase === "site_management") return syncSiteMgmtPct(projectId);
}

export async function addCustomChecklistItem(
  projectId,
  { phase, sheetCode, stage, label },
) {
  if (!phase || !sheetCode || !label?.trim()) {
    throw AppError.badRequest("phase, sheetCode, and label are required");
  }
  const maxSort = await ChecklistInstance.findOne({
    projectId,
    phase,
    sheetCode,
  })
    .sort({ sortOrder: -1 })
    .lean();
  const sortOrder = (maxSort?.sortOrder || 0) + 1;
  const doc = await ChecklistInstance.create({
    projectId,
    phase,
    sheetCode,
    stage: stage || "General",
    sortOrder,
    label: label.trim(),
    status: "pending",
    source: "custom",
    deletable: true,
  });
  await syncPhasePctForPhase(projectId, phase);
  return formatInstance(doc);
}

export async function deleteChecklistItem(projectId, itemId) {
  if (!mongoose.isValidObjectId(itemId)) {
    throw AppError.badRequest("Invalid item id");
  }
  const row = await ChecklistInstance.findOneAndDelete({
    _id: itemId,
    projectId,
  });
  if (!row) throw AppError.notFound("Checklist item not found");
  await syncPhasePctForPhase(projectId, row.phase);
  return { deleted: true };
}

export async function getChecklistTemplateStats() {
  const agg = await ChecklistTemplate.aggregate([
    {
      $group: {
        _id: { phase: "$phase", sheetCode: "$sheetCode" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.phase": 1, "_id.sheetCode": 1 } },
  ]);
  return agg.map((r) => ({
    phase: r._id.phase,
    sheetCode: r._id.sheetCode,
    count: r.count,
  }));
}
