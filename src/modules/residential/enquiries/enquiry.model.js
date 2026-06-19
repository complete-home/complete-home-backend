import mongoose from "mongoose";

const ENQUIRY_STATUSES = [
  "New Enquiry",
  "In Progress",
  "Deal",
  "On hold",
  "Lost",
];

const enquirySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    pincode: { type: String, trim: true },
    building: { type: String, trim: true },
    area: { type: String, trim: true },
    state: { type: String, trim: true },
    city: { type: String, trim: true },
    address: { type: String, trim: true },
    source: { type: String, trim: true },
    service: { type: String, trim: true },
    requirements: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ENQUIRY_STATUSES,
      default: "New Enquiry",
    },
    businessModule: {
      type: String,
      enum: ["residential", "services"],
      default: "residential",
    },
    initials: { type: String, maxlength: 4 },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    assigneeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    budget: { type: String },
    projectType: { type: String },
    workType: { type: String, trim: true },
    fullAddress: { type: String, trim: true },
    talkingPoint: { type: String, trim: true },
    talkingPointUpdatedAt: { type: Date },
    salesHeadId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    projectHeadId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    toolkitDone: { type: Boolean, default: false },
    qualificationOutcome: { type: String, trim: true },
  },
  { timestamps: true },
);

enquirySchema.index({ businessModule: 1, status: 1 });
enquirySchema.index({ source: 1 });
enquirySchema.index({ talkingPoint: 1 });
enquirySchema.index({ salesHeadId: 1 });
enquirySchema.index({ projectHeadId: 1 });
enquirySchema.index({ createdAt: -1 });

export { ENQUIRY_STATUSES };
export default mongoose.model("Enquiry", enquirySchema);
