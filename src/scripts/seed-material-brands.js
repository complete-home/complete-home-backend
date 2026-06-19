/**
 * Seed Material phase brand checklist templates (C1–C6).
 * Usage: node src/scripts/seed-material-brands.js [path-to-spec.txt]
 */
import "dotenv/config";
import fs from "fs";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import ChecklistTemplate from "../modules/residential/checklists/checklistTemplate.model.js";
import {
  getSheetLabel,
  mapLegacyMaterialCode,
} from "../modules/residential/checklists/checklistSheetCatalog.js";

const DEFAULT_SPEC =
  process.env.PLANNING_SPEC_PATH ||
  "/home/shaan/.cursor/projects/home-shaan-Documents-ai-complete-home/uploads/Untitled-2-L1-L2338-0.txt";

const VERSION = "manoj-2025-v1";

function extractMaterialSection(text) {
  const start = text.indexOf("================ Material Phase ==========");
  const end = text.indexOf("============ Site Execution Phase ==========");
  if (start < 0 || end < 0) {
    throw new Error("Could not find Material Phase section");
  }
  return text.slice(start, end);
}

function parseMaterialBrandTemplates(section) {
  const lines = section.split(/\r?\n/);
  let sheetCode = "land-structure";
  let sheetTitle = "";
  let stage = "";
  let sortOrder = 0;
  const templates = [];

  const sheetHeaderRe = /^\*+\s*C(\d+)\s*\*+/i;
  const categoryRe = /^CATEGORY\s+\d+:\s*(.+?)(?:\s+DONE)?\s*$/i;
  const stageRe = /STAGE\s+\d+\s*:?\s*(.+?)(?:\s+DONE)?\s*$/i;
  const itemRe = /^(\d+)\t([^\t]+?)(?:\t+([^\t]*))?\s*$/;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) continue;
    if (
      line.startsWith("**** Tile") ||
      line.startsWith("**** Paint") ||
      line.startsWith("***** Furniture") ||
      line.startsWith("***** Tiles QTY")
    ) {
      break;
    }

    const sheetMatch = line.match(sheetHeaderRe);
    if (sheetMatch) {
      sheetCode = mapLegacyMaterialCode(`C${sheetMatch[1]}`);
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
      if (label.length < 2) continue;
      const defaultValue = (itemMatch[3] || "").trim();
      sortOrder += 1;
      templates.push({
        phase: "material_brand",
        sheetCode,
        sheetTitle: sheetTitle || getSheetLabel("material_brand", sheetCode),
        category: sheetTitle,
        stage,
        sortOrder,
        label,
        inputType: "text",
        templateVersion: VERSION,
        _defaultValue: defaultValue,
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
  const templates = parseMaterialBrandTemplates(extractMaterialSection(text));

  if (!templates.length) {
    console.error("No material brand templates parsed");
    process.exit(1);
  }

  await connectDatabase();

  await ChecklistTemplate.deleteMany({
    phase: "material_brand",
    templateVersion: VERSION,
  });

  const toInsert = templates.map(({ _defaultValue, ...t }) => t);
  await ChecklistTemplate.insertMany(toInsert, { ordered: false });

  const bySheet = {};
  for (const t of templates) {
    bySheet[t.sheetCode] = (bySheet[t.sheetCode] || 0) + 1;
  }

  console.log("Seeded material brand templates:", templates.length);
  console.log("By sheet:", bySheet);

  await disconnectDatabase();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
