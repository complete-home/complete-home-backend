import AppError from "../../../core/errors/AppError.js";
import Project from "./project.model.js";
import ProjectPhaseConfig from "./projectPhaseConfig.model.js";
import { MATERIAL_BRAND_SHEETS } from "../checklists/checklistSheetCatalog.js";
import ChecklistInstance from "../checklists/checklistInstance.model.js";

const DEFAULT_MATERIAL_SUBTABS = [
  { id: "tile", title: "Tile Selection", sortOrder: 1 },
  { id: "paint", title: "Paint Colours", sortOrder: 2 },
  { id: "furniture", title: "Furniture", sortOrder: 3 },
  { id: "tile_qty", title: "Tile Quantity", sortOrder: 4 },
];

function slugify(title) {
  return String(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function defaultSectionsForPhase() {
  return [];
}

function phaseField(phase) {
  if (phase === "planning") return "planningSections";
  if (phase === "execution") return "executionSections";
  if (phase === "site_management") return "siteManagementSections";
  throw AppError.badRequest("Invalid phase for sections");
}

export async function getOrCreatePhaseConfig(projectId) {
  const project = await Project.findById(projectId);
  if (!project) throw AppError.notFound("Project not found");

  let doc = await ProjectPhaseConfig.findOne({ projectId });
  if (!doc) {
    doc = await ProjectPhaseConfig.create({
      projectId,
      planningSections: defaultSectionsForPhase(),
      executionSections: defaultSectionsForPhase(),
      siteManagementSections: defaultSectionsForPhase(),
      materialCategories: MATERIAL_BRAND_SHEETS.map((s, i) => ({
        id: s.id,
        title: s.label,
        sortOrder: i + 1,
      })),
      materialSubTabs: DEFAULT_MATERIAL_SUBTABS,
    });
  }

  return formatConfig(doc, project);
}

function formatConfig(doc, project) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    projectId: o.projectId?.toString?.(),
    materialScope: project?.materialScope || "with",
    planningSections: o.planningSections || [],
    executionSections: o.executionSections || [],
    siteManagementSections: o.siteManagementSections || [],
    materialCategories: o.materialCategories || [],
    materialSubTabs: o.materialSubTabs || DEFAULT_MATERIAL_SUBTABS,
  };
}

export async function getPhaseSections(projectId, phase) {
  const cfg = await getOrCreatePhaseConfig(projectId);
  const field = phaseField(phase);
  return cfg[field] || [];
}

export async function addPhaseSection(projectId, { phase, title }) {
  if (!title?.trim()) throw AppError.badRequest("title is required");
  const cfg = await ProjectPhaseConfig.findOne({ projectId });
  if (!cfg) await getOrCreatePhaseConfig(projectId);
  const doc = await ProjectPhaseConfig.findOne({ projectId });
  const field = phaseField(phase);
  const sections = doc[field] || [];
  const id = slugify(title) + `-${Date.now().toString(36).slice(-4)}`;
  sections.push({
    id,
    title: title.trim(),
    sortOrder: sections.length + 1,
  });
  doc[field] = sections;
  await doc.save();
  return getOrCreatePhaseConfig(projectId);
}

export async function addMaterialCategory(projectId, { title }) {
  if (!title?.trim()) throw AppError.badRequest("title is required");
  await getOrCreatePhaseConfig(projectId);
  const doc = await ProjectPhaseConfig.findOne({ projectId });
  const id = slugify(title) + `-${Date.now().toString(36).slice(-4)}`;
  doc.materialCategories.push({
    id,
    title: title.trim(),
    sortOrder: doc.materialCategories.length + 1,
  });
  await doc.save();
  return getOrCreatePhaseConfig(projectId);
}

export async function addMaterialSubTab(projectId, { title }) {
  if (!title?.trim()) throw AppError.badRequest("title is required");
  await getOrCreatePhaseConfig(projectId);
  const doc = await ProjectPhaseConfig.findOne({ projectId });
  const id = slugify(title) + `-${Date.now().toString(36).slice(-4)}`;
  doc.materialSubTabs.push({
    id,
    title: title.trim(),
    sortOrder: doc.materialSubTabs.length + 1,
  });
  await doc.save();
  return getOrCreatePhaseConfig(projectId);
}

export async function updatePhaseSection(
  projectId,
  { phase, sectionId, title },
) {
  if (!sectionId) throw AppError.badRequest("sectionId is required");
  if (!title?.trim()) throw AppError.badRequest("title is required");
  const doc = await ProjectPhaseConfig.findOne({ projectId });
  if (!doc) throw AppError.notFound("Phase config not found");
  const field = phaseField(phase);
  const section = (doc[field] || []).find((s) => s.id === sectionId);
  if (!section) throw AppError.notFound("Section not found");
  section.title = title.trim();
  doc.markModified(field);
  await doc.save();
  return getOrCreatePhaseConfig(projectId);
}

export async function deletePhaseSection(projectId, { phase, sectionId }) {
  if (!sectionId) throw AppError.badRequest("sectionId is required");
  const doc = await ProjectPhaseConfig.findOne({ projectId });
  if (!doc) throw AppError.notFound("Phase config not found");
  const field = phaseField(phase);
  const before = doc[field]?.length || 0;
  doc[field] = (doc[field] || []).filter((s) => s.id !== sectionId);
  if (doc[field].length === before) {
    throw AppError.notFound("Section not found");
  }
  doc.markModified(field);
  await doc.save();

  await ChecklistInstance.deleteMany({
    projectId,
    phase,
    sheetCode: sectionId,
  });

  return getOrCreatePhaseConfig(projectId);
}
