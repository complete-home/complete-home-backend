/**
 * One-time migration: C-1 / C1 style codes → readable sheet ids.
 * Usage: npm run migrate:sheet-codes
 */
import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import ChecklistTemplate from "../modules/residential/checklists/checklistTemplate.model.js";
import ChecklistInstance from "../modules/residential/checklists/checklistInstance.model.js";
import { getAllLegacyMappings } from "../modules/residential/checklists/checklistSheetCatalog.js";

async function main() {
  await connectDatabase();
  const mappings = getAllLegacyMappings();
  let templates = 0;
  let instances = 0;

  for (const { phase, legacy, id, label } of mappings) {
    const t = await ChecklistTemplate.updateMany(
      { phase, sheetCode: legacy },
      { $set: { sheetCode: id, sheetTitle: label } },
    );
    templates += t.modifiedCount;

    const i = await ChecklistInstance.updateMany(
      { phase, sheetCode: legacy },
      { $set: { sheetCode: id } },
    );
    instances += i.modifiedCount;
  }

  console.log("Migrated checklist sheet codes:");
  console.log("  templates:", templates);
  console.log("  instances:", instances);

  await disconnectDatabase();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
