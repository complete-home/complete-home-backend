import mongoose from "mongoose";

const checklistInstanceSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChecklistTemplate",
      default: null,
      index: true,
    },
    phase: { type: String, required: true, index: true },
    sheetCode: { type: String, required: true, index: true },
    stage: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    label: { type: String, default: "" },
    status: {
      type: String,
      enum: ["done", "not_done", "na", "pending"],
      default: "pending",
    },
    /** Selected brand / notes (material_brand phase) */
    value: { type: String, default: "" },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    signedAt: { type: Date, default: null },
    photos: [{ type: String }],
    note: { type: String, default: "" },
    source: {
      type: String,
      enum: ["template", "workflow", "custom"],
      default: "template",
    },
    deletable: { type: Boolean, default: false },
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workflow",
      default: null,
    },
    workflowStageId: { type: String, default: "" },
    workflowTaskId: { type: String, default: "" },
  },
  { timestamps: true },
);

checklistInstanceSchema.index(
  { projectId: 1, templateId: 1 },
  {
    unique: true,
    partialFilterExpression: { templateId: { $exists: true, $ne: null } },
  },
);
checklistInstanceSchema.index({ projectId: 1, phase: 1, sheetCode: 1 });

export default mongoose.model("ChecklistInstance", checklistInstanceSchema);
