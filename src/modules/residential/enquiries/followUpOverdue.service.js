import EnquiryFollowUp from "./enquiryFollowUp.model.js";

function parseScheduledMs(fu) {
  const raw = fu.scheduledAt || [fu.date, fu.time].filter(Boolean).join(" ");
  if (!raw?.trim()) return null;
  const t = Date.parse(raw.replace(" at ", " "));
  return Number.isFinite(t) ? t : null;
}

/** Mark Scheduled follow-ups past due time as Overdue (idempotent). */
export async function markOverdueFollowUps({ enquiryId } = {}) {
  const q = { status: "Scheduled" };
  if (enquiryId) q.enquiryId = enquiryId;
  const rows = await EnquiryFollowUp.find(q).lean();
  const now = Date.now();
  const ids = rows
    .filter((fu) => {
      const ms = parseScheduledMs(fu);
      return ms != null && ms < now;
    })
    .map((fu) => fu._id);
  if (!ids.length) return 0;
  const result = await EnquiryFollowUp.updateMany(
    { _id: { $in: ids } },
    { $set: { status: "Overdue" } },
  );
  return result.modifiedCount || 0;
}
