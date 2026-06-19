import mongoose from "mongoose";

const enquiryAppointmentSchema = new mongoose.Schema(
  {
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      required: true,
      unique: true,
    },
    title: { type: String, default: "Site visit" },
    when: { type: String },
    mode: { type: String, enum: ["online", "offline"], default: "offline" },
    visitAddress: { type: String },
    landmark: { type: String },
    agenda: { type: String },
    mapLink: { type: String },
    visitingType: { type: String, enum: ["free", "paid"], default: "free" },
    visitingCharges: { type: String },
    assignee: { type: String },
    assigneeInitials: { type: String },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    startAt: { type: Date },
    endAt: { type: Date },
    status: { type: String, default: "Scheduled" },
    visitPurpose: { type: String, trim: true },
    workManagerLabel: { type: String, trim: true },
    siteWorkerLabel: { type: String, trim: true },
    projectHeadLabel: { type: String, trim: true },
    visitReportNotes: { type: String, trim: true },
  },
  { timestamps: true },
);

export default mongoose.model("EnquiryAppointment", enquiryAppointmentSchema);
