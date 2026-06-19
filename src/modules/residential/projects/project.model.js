import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    client: { type: String, default: "" },
    clientInitials: { type: String, default: "" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    manager: { type: String, default: "" },
    managerInitials: { type: String, default: "" },
    managerRole: { type: String, default: "Project Manager" },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deadline: { type: String, default: "—" },
    progress: { type: Number, default: 0 },
    status: { type: String, default: "Active" },
    enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "Enquiry" },
    enquiryCode: { type: String, default: "" },
    businessModule: { type: String, default: "residential" },
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: "Workflow" },
    dueAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    timelinessStatus: {
      type: String,
      enum: ["on_time", "late", "overdue", "pending", "not_applicable"],
      default: "not_applicable",
    },
    siteAddress: { type: String, default: "" },
    clientPhone: { type: String, default: "" },
    workType: { type: String, default: "" },
    source: { type: String, default: "" },
    salesHeadId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    projectHeadId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    /** with | without | both — controls material phase on hub */
    materialScope: {
      type: String,
      enum: ["with", "without", "both"],
      default: "with",
    },
    phases: {
      currentPhase: {
        type: String,
        enum: [
          "agreement",
          "planning",
          "material",
          "execution",
          "site_management",
        ],
        default: "agreement",
      },
      agreementPct: { type: Number, default: 0, min: 0, max: 100 },
      planningPct: { type: Number, default: 0, min: 0, max: 100 },
      materialPct: { type: Number, default: 0, min: 0, max: 100 },
      executionPct: { type: Number, default: 0, min: 0, max: 100 },
      siteMgmtPct: { type: Number, default: 0, min: 0, max: 100 },
    },
  },
  { timestamps: true },
);

export default mongoose.model("Project", projectSchema);
