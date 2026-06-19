/**
 * Upsert enquiry-related lookups without full database reseed.
 * Run: node src/scripts/seed-enquiry-lookups.js
 */
import { connectDatabase } from "../config/database.js";
import Lookup from "../modules/common/lookups/lookup.model.js";

const PATCH = {
  enquirySources: [
    "Manual",
    "JustDial",
    "Google",
    "References (Client/Friends)",
    "Website",
    "Referral",
    "Walk-in",
    "Social Media",
    "Campaign",
  ],
  enquiryTalkingPoints: [
    "Interested",
    "No response",
    "No requirement",
    "Invalid number",
    "Busy",
    "Call back later",
    "Work in progress",
    "Cancel project",
    "Site visit scheduled",
    "Not interested",
  ],
  workTypes: [
    "Interior",
    "HPD",
    "Planning",
    "Renovation",
    "Modular kitchen",
    "Civil work",
    "Construction",
    "BPD",
    "Permission & planning",
    "Interior + Renovation",
  ],
};

async function main() {
  await connectDatabase();
  for (const [key, values] of Object.entries(PATCH)) {
    await Lookup.findOneAndUpdate(
      { key },
      { key, values },
      { upsert: true, new: true },
    );
    console.log(`Updated lookup: ${key} (${values.length} values)`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
