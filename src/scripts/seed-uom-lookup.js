/**
 * Upsert uom lookup without full reseed.
 * Usage: node src/scripts/seed-uom-lookup.js
 */
import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import Lookup from "../modules/common/lookups/lookup.model.js";

const UOM = [
  "m",
  "mm",
  "cm",
  "kg",
  "sq. ft",
  "sqm",
  "nos",
  "rft",
  "lump sum",
  "Bag",
  "Piece",
  "Unit",
  "HUNDA",
  "PER SQFT",
];

async function main() {
  await connectDatabase();
  const doc = await Lookup.findOneAndUpdate(
    { key: "uom" },
    { $addToSet: { values: { $each: UOM } } },
    { upsert: true, new: true },
  );
  console.log("uom lookup values:", doc.values.length);
  await disconnectDatabase();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
