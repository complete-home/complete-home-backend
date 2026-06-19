import mongoose from "mongoose";

const enquiryTalkingPointLogSchema = new mongoose.Schema(
  {
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      required: true,
      index: true,
    },
    note: { type: String, required: true, trim: true },
    talkingPoint: { type: String, trim: true },
    logDate: { type: Date, default: Date.now },
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String, trim: true },
  },
  { timestamps: true },
);

export default mongoose.model(
  "EnquiryTalkingPointLog",
  enquiryTalkingPointLogSchema,
);
