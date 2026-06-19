import mongoose from "mongoose";

/** Last 10 digits for dedupe (India mobiles). */
export function normalizePhoneDigits(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length > 10) return digits.slice(-10);
  return "";
}

export function buildAccessFilter(userId) {
  const raw = userId?._id ?? userId;
  const oid = mongoose.Types.ObjectId.isValid(raw)
    ? new mongoose.Types.ObjectId(raw)
    : raw;
  return {
    $or: [
      { isPublic: true },
      { createdBy: oid },
      { sharedWith: oid },
    ],
  };
}
