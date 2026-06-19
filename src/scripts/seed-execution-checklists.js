/**
 * Seed Site Execution phase checklist templates (C-1..C-12).
 * Usage: node src/scripts/seed-execution-checklists.js [path-to-spec.txt]
 */
import "dotenv/config";
import fs from "fs";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import ChecklistTemplate from "../modules/residential/checklists/checklistTemplate.model.js";
import {
  getSheetLabel,
  mapLegacyExecutionCode,
} from "../modules/residential/checklists/checklistSheetCatalog.js";

const DEFAULT_SPEC =
  process.env.PLANNING_SPEC_PATH ||
  "/home/shaan/.cursor/projects/home-shaan-Documents-ai-complete-home/uploads/Untitled-2-L1-L2338-0.txt";

const VERSION = "manoj-2025-v1";

function extractExecutionSection(text) {
  const start = text.indexOf("============ Site Execution Phase ==========");
  const end = text.indexOf(
    "============== Site Management Phase ===============",
  );
  if (start < 0 || end < 0) {
    throw new Error("Could not find Site Execution Phase section");
  }
  return text.slice(start, end);
}

function legacySheetNum(n) {
  return `C-${Number(n)}`;
}

function toSheetId(legacyOrNum) {
  const legacy =
    typeof legacyOrNum === "number" ? legacySheetNum(legacyOrNum) : legacyOrNum;
  return mapLegacyExecutionCode(legacy);
}

function parseExecutionTemplates(section) {
  const lines = section.split(/\r?\n/);
  let sheetCode = toSheetId(1);
  let sheetTitle = getSheetLabel("execution", sheetCode);
  let stage = "";
  const sortOrderBySheet = {};
  const templates = [];

  const sheetHeaderRe = /^[*=\s]+C\s*-?\s*(\d+)\s*[*=\s]+$/i;
  const categoryRe = /^CATEGORY\s+(\d+):\s*(.+?)(?:\s+DONE)?\s*$/i;
  const stageRe = /STAGE\s+([A-Z0-9]+)\s*:?\s*(.+?)(?:\s+DONE)?\s*$/i;
  const itemRe = /^(\d+)\t(.+?)(?:\t+(ok|OK|-|not done|NOT DONE))?\s*$/i;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line || line.startsWith("*** Index")) continue;
    if (/^S\. NO\.\s+SHEETS/i.test(line)) continue;
    if (/^C-\d+\t/.test(line) && !line.includes("CATEGORY")) continue;

    const sheetMatch = line.match(sheetHeaderRe);
    if (sheetMatch) {
      sheetCode = toSheetId(parseInt(sheetMatch[1], 10));
      sheetTitle = getSheetLabel("execution", sheetCode);
      continue;
    }

    const catMatch = line.match(categoryRe);
    if (catMatch) {
      const titleText = catMatch[2].replace(/\t.*$/, "").trim();
      let num = parseInt(catMatch[1], 10);
      if (/SNAG\s+LIST/i.test(titleText)) num = 12;
      sheetCode = toSheetId(num);
      sheetTitle = getSheetLabel("execution", sheetCode) || titleText;
      continue;
    }

    if (/^S\. No\./i.test(line) || /^\tSTAGE/i.test(line)) {
      const st = line.match(stageRe);
      if (st) stage = st[2]?.replace(/\t.*$/, "").trim() || st[1];
      continue;
    }

    const stOnly = line.match(/^\t(STAGE\s+.+)$/i);
    if (stOnly) {
      const st = stOnly[1].match(stageRe);
      if (st) stage = st[2]?.replace(/\t.*$/, "").trim() || st[1];
      continue;
    }

    const itemMatch = line.match(itemRe);
    if (itemMatch) {
      const label = itemMatch[2].trim();
      if (label.length < 3) continue;
      if (
        /^(SITE NOTES|YOUR OWN|FINAL |CHECKED BY|DATE |REMARK)/i.test(label)
      ) {
        continue;
      }
      sortOrderBySheet[sheetCode] = (sortOrderBySheet[sheetCode] || 0) + 1;
      templates.push({
        phase: "execution",
        sheetCode,
        sheetTitle,
        category: sheetTitle,
        stage,
        sortOrder: sortOrderBySheet[sheetCode],
        label,
        inputType: "ok_na",
        templateVersion: VERSION,
      });
    }
  }

  return appendMissingSheets(templates, sortOrderBySheet);
}

/** C-9 body is missing from spec export; seed a minimal joinery checklist. */
function appendMissingSheets(templates, sortOrderBySheet) {
  if (!templates.some((t) => t.sheetCode === "carpentry-joinery")) {
    const stages = [
      {
        stage: "Kitchen & wardrobes",
        labels: [
          "Kitchen carcass plumb and secured",
          "Shutters aligned with even gaps",
          "Soft-close hardware tested",
          "Wardrobe internals fitted per drawing",
          "Edge banding and finish approved",
        ],
      },
      {
        stage: "Doors & trims",
        labels: [
          "Door frames fixed plumb",
          "Architraves and skirting fitted",
          "Veneer/laminate joints invisible",
          "Hardware cut-outs aligned",
        ],
      },
      {
        stage: "Final carpentry sign-off",
        labels: [
          "No sharp edges or loose panels",
          "Client walk-through of joinery completed",
        ],
      },
    ];
    for (const { stage, labels } of stages) {
      for (const label of labels) {
        sortOrderBySheet["carpentry-joinery"] =
          (sortOrderBySheet["carpentry-joinery"] || 0) + 1;
        templates.push({
          phase: "execution",
          sheetCode: "carpentry-joinery",
          sheetTitle: getSheetLabel("execution", "carpentry-joinery"),
          category: getSheetLabel("execution", "carpentry-joinery"),
          stage,
          sortOrder: sortOrderBySheet["carpentry-joinery"],
          label,
          inputType: "ok_na",
          templateVersion: VERSION,
        });
      }
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
  const templates = parseExecutionTemplates(extractExecutionSection(text));

  if (!templates.length) {
    console.error("No execution templates parsed");
    process.exit(1);
  }

  await connectDatabase();

  await ChecklistTemplate.deleteMany({
    phase: "execution",
    templateVersion: VERSION,
  });

  await ChecklistTemplate.insertMany(templates, { ordered: false });

  const bySheet = {};
  for (const t of templates) {
    bySheet[t.sheetCode] = (bySheet[t.sheetCode] || 0) + 1;
  }

  console.log("Seeded execution checklist templates:", templates.length);
  console.log("By sheet:", bySheet);

  await disconnectDatabase();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
