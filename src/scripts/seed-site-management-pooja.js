/**
 * Seed Site Management pooja checklist (readable sheet id: pooja-kickoff).
 * Usage: npm run seed:site-management
 */
import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import ChecklistTemplate from "../modules/residential/checklists/checklistTemplate.model.js";
import { DEFAULT_POOJA_ITEMS } from "../modules/residential/siteManagement/siteManagement.defaults.js";
import { getSheetLabel } from "../modules/residential/checklists/checklistSheetCatalog.js";

const VERSION = "manoj-2025-v1";
const SHEET_ID = "pooja-kickoff";

async function main() {
  const templates = DEFAULT_POOJA_ITEMS.map((label, i) => ({
    phase: "site_management",
    sheetCode: SHEET_ID,
    sheetTitle: getSheetLabel("site_management", SHEET_ID),
    category: getSheetLabel("site_management", SHEET_ID),
    stage: "Pooja & kickoff",
    sortOrder: i + 1,
    label,
    inputType: "ok_na",
    templateVersion: VERSION,
  }));

  await connectDatabase();

  await ChecklistTemplate.deleteMany({
    phase: "site_management",
    templateVersion: VERSION,
  });

  await ChecklistTemplate.insertMany(templates, { ordered: false });
  console.log("Seeded site management pooja templates:", templates.length);

  await disconnectDatabase();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
