/**
 * One-time migration: quotation formatType → with_material | supervision_only
 * Run: node src/scripts/migrate-quotation-format-types.js
 */
import mongoose from "mongoose";
import { env } from "../config/env.js";
import Quotation from "../modules/residential/quotations/quotation.model.js";

const MAP = {
  full_boq: "with_material",
  lump_sum: null,
  hybrid: null,
  services_only: "supervision_only",
  rate_hidden: "supervision_only",
  with_material: "with_material",
  supervision_only: "supervision_only",
};

function resolveType(doc) {
  const current = doc.formatType;
  if (current === "with_material" || current === "supervision_only") {
    return current;
  }
  const mapped = MAP[current];
  if (mapped) return mapped;
  const hasProducts = (doc.products || []).length > 0;
  if (current === "hybrid" || current === "lump_sum") {
    return hasProducts ? "with_material" : "supervision_only";
  }
  return hasProducts ? "with_material" : "supervision_only";
}

async function main() {
  await mongoose.connect(env.mongoUri);
  const rows = await Quotation.find({});
  let updated = 0;
  for (const doc of rows) {
    const next = resolveType(doc);
    if (doc.formatType !== next) {
      doc.formatType = next;
      await doc.save();
      updated += 1;
      console.log(`${doc.code}: ${doc.formatType} → ${next}`);
    }
  }
  console.log(`Done. Updated ${updated} of ${rows.length} quotations.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
