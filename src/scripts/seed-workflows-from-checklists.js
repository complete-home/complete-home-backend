/**
 * Publish checklist templates as Workflow definitions for hub testing.
 * Usage: npm run seed:workflows-from-checklists
 */
import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import ChecklistTemplate from "../modules/residential/checklists/checklistTemplate.model.js";
import Workflow from "../modules/residential/workflows/workflow.model.js";
import { getSheetLabel } from "../modules/residential/checklists/checklistSheetCatalog.js";

const PHASE_LABELS = {
  planning: "Planning",
  execution: "Site Execution",
  site_management: "Site Management",
  material_brand: "Material Brands",
};

async function buildWorkflowsFromTemplates() {
  const templates = await ChecklistTemplate.find({}).sort({
    phase: 1,
    sheetCode: 1,
    sortOrder: 1,
  });

  const groups = new Map();
  for (const t of templates) {
    const key = `${t.phase}::${t.sheetCode}`;
    if (!groups.has(key)) {
      groups.set(key, {
        phase: t.phase,
        sheetCode: t.sheetCode,
        items: [],
      });
    }
    groups.get(key).items.push(t);
  }

  const created = [];
  for (const g of groups.values()) {
    const phaseLabel = PHASE_LABELS[g.phase] || g.phase;
    const sheetLabel = getSheetLabel(g.phase, g.sheetCode, g.sheetCode);
    const name = `${phaseLabel} — ${sheetLabel}`;

    const stageMap = new Map();
    for (const item of g.items) {
      const stageTitle = item.stage || "General";
      if (!stageMap.has(stageTitle)) {
        stageMap.set(stageTitle, []);
      }
      stageMap.get(stageTitle).push(item);
    }

    const stages = [...stageMap.entries()].map(([title, items], idx) => ({
      order: idx + 1,
      title,
      expanded: true,
      tasks: items.map((it, ti) => ({
        code: String(ti + 1).padStart(2, "0"),
        title: it.label,
      })),
    }));

    const existing = await Workflow.findOne({
      name,
      businessModule: "residential",
    });
    if (existing) {
      existing.stages = stages;
      existing.status = "Published";
      existing.description = `Auto-generated from checklist templates (${g.phase}/${g.sheetCode})`;
      await existing.save();
      created.push({ name, updated: true });
      continue;
    }

    await Workflow.create({
      name,
      description: `Auto-generated from checklist templates (${g.phase}/${g.sheetCode})`,
      status: "Published",
      businessModule: "residential",
      stages,
    });
    created.push({ name, updated: false });
  }

  return created;
}

async function main() {
  await connectDatabase();
  const rows = await buildWorkflowsFromTemplates();
  console.log("Workflows from checklists:", rows.length);
  console.log(
    rows
      .slice(0, 8)
      .map((r) => `${r.updated ? "↻" : "+"} ${r.name}`)
      .join("\n"),
    rows.length > 8 ? `\n… and ${rows.length - 8} more` : "",
  );
  await disconnectDatabase();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
