import AppError from "../../../core/errors/AppError.js";
import { Messages } from "../../../core/http/messages.js";
import Enquiry from "./enquiry.model.js";
import EnquiryTalkingPointLog from "./enquiryTalkingPointLog.model.js";

function formatLog(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o._id.toString(),
    enquiryId: o.enquiryId?.toString?.() || o.enquiryId,
    note: o.note,
    talkingPoint: o.talkingPoint || "",
    logDate: o.logDate,
    createdByName: o.createdByName || "",
    createdAt: o.createdAt,
  };
}

export async function listTalkingPoints(enquiryId) {
  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) throw AppError.notFound(Messages.enquiry.notFound);
  const rows = await EnquiryTalkingPointLog.find({ enquiryId })
    .sort({ logDate: -1, createdAt: -1 })
    .lean();
  return rows.map((r) => formatLog({ ...r, _id: r._id }));
}

export async function addTalkingPoint(enquiryId, body, user) {
  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) throw AppError.notFound(Messages.enquiry.notFound);
  const note = body.note?.trim() || body.talkingPoint?.trim();
  if (!note) throw AppError.badRequest("note is required");

  const logDate = body.logDate ? new Date(body.logDate) : new Date();
  const doc = await EnquiryTalkingPointLog.create({
    enquiryId,
    note,
    talkingPoint: body.talkingPoint?.trim() || "",
    logDate,
    createdById: user?._id,
    createdByName: user?.name || "Staff",
  });

  enquiry.talkingPoint = body.talkingPoint?.trim() || note;
  enquiry.talkingPointUpdatedAt = logDate;
  if (body.qualificationOutcome) {
    enquiry.qualificationOutcome = body.qualificationOutcome;
  }
  await enquiry.save();

  return formatLog(doc);
}

export async function deleteTalkingPoint(enquiryId, logId) {
  const row = await EnquiryTalkingPointLog.findOneAndDelete({
    _id: logId,
    enquiryId,
  });
  if (!row) throw AppError.notFound("Talking point entry not found");
  return { deleted: true };
}
