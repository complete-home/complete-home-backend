/**
 * Seed Planning phase checklist templates from spec file.
 * Usage: node src/scripts/seed-planning-checklists.js [path-to-spec.txt]
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import ChecklistTemplate from "../modules/residential/checklists/checklistTemplate.model.js";
import {
  getSheetLabel,
  mapLegacyPlanningCode,
} from "../modules/residential/checklists/checklistSheetCatalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SPEC =
  process.env.PLANNING_SPEC_PATH ||
  "/home/shaan/.cursor/projects/home-shaan-Documents-ai-complete-home/uploads/Untitled-2-L1-L2338-0.txt";

const VERSION = "manoj-2025-v1";

function extractPlanningSection(text) {
  const start = text.indexOf("=========== Planning Phase ============");
  const end = text.indexOf("================ Material Phase ==========");
  if (start < 0 || end < 0) {
    throw new Error("Could not find Planning Phase section in spec file");
  }
  return text.slice(start, end);
}

function parsePlanningTemplates(section) {
  const lines = section.split(/\r?\n/);
  let sheetCode = "C-1";
  let sheetTitle = "";
  let stage = "";
  let sortOrder = 0;
  const templates = [];

  const sheetHeaderRe = /^\*{10}\s*(C-\d+)\s*\*{10}/;
  const categoryRe = /^CATEGORY\s+\d+:\s*(.+?)(?:\s+DONE)?\s*$/i;
  const stageRe = /STAGE\s+\d+:\s*(.+?)(?:\s+DONE)?\s*$/i;
  const itemRe = /^(\d+)\t(.+?)(?:\t+(OK|-|))?\s*$/;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) continue;

    const sheetMatch = line.match(sheetHeaderRe);
    if (sheetMatch) {
      sheetCode = mapLegacyPlanningCode(sheetMatch[1]);
      sortOrder = 0;
      continue;
    }

    const catMatch = line.match(categoryRe);
    if (catMatch) {
      sheetTitle = catMatch[1].replace(/\t.*$/, "").trim();
      continue;
    }

    if (/^S\. No\./i.test(line)) {
      const st = line.match(stageRe);
      if (st) stage = st[1].replace(/\t.*$/, "").trim();
      continue;
    }

    const itemMatch = line.match(itemRe);
    if (itemMatch) {
      const label = itemMatch[2].trim();
      if (label.length < 3) continue;
      sortOrder += 1;
      templates.push({
        phase: "planning",
        sheetCode,
        sheetTitle: sheetTitle || getSheetLabel("planning", sheetCode),
        category: sheetTitle,
        stage,
        sortOrder,
        label,
        inputType: "ok_na",
        templateVersion: VERSION,
      });
    }
  }

  return templates;
}

async function main() {
  const specPath = process.argv[2] || DEFAULT_SPEC;
  if (!fs.existsSync(specPath)) {
    console.error("Spec file not found:", specPath);
    process.exit(1);
  }

  const text = fs.readFileSync(specPath, "utf8");
  const section = extractPlanningSection(text);
  const templates = parsePlanningTemplates(section);

  if (!templates.length) {
    console.error("No templates parsed");
    process.exit(1);
  }

  await connectDatabase();

  const deleted = await ChecklistTemplate.deleteMany({
    phase: "planning",
    templateVersion: VERSION,
  });
  console.log("Removed old planning templates:", deleted.deletedCount);

  await ChecklistTemplate.insertMany(templates, { ordered: false });

  const bySheet = {};
  for (const t of templates) {
    bySheet[t.sheetCode] = (bySheet[t.sheetCode] || 0) + 1;
  }

  console.log("Seeded planning checklist templates:", templates.length);
  console.log("By sheet:", bySheet);

  await disconnectDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
