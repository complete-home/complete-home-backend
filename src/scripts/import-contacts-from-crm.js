/**
 * Bulk import contacts from enquiries, clients, vendors, site rows, agreement trades.
 * Run: node src/scripts/import-contacts-from-crm.js
 */
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { importContactsFromCrm } from "../modules/common/contacts/contact.service.js";

async function main() {
  await mongoose.connect(env.mongoUri);
  const adminId = new mongoose.Types.ObjectId();
  const result = await importContactsFromCrm(adminId, { setPublic: true });
  console.log("Import complete:", result);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
