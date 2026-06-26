import mongoose from "mongoose";

const enquiryFollowUpSchema = new mongoose.Schema(
  {
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      required: true,
      index: true,
    },
    type: { type: String, enum: ["call", "whatsapp", "email"], required: true },
    channel: { type: String },
    scheduledAt: { type: String },
    note: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Overdue", "Cancelled"],
      default: "Scheduled",
    },
    assignedIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    date: { type: String },
    time: { type: String },
  },
  { timestamps: true },
);

// Performance indexes
enquiryFollowUpSchema.index({ enquiryId: 1, createdAt: -1 });
enquiryFollowUpSchema.index({ status: 1, scheduledAt: 1 });
enquiryFollowUpSchema.index({ date: 1, status: 1 });

export default mongoose.model("EnquiryFollowUp", enquiryFollowUpSchema);
