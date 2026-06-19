import mongoose from "mongoose";

const workflowTaskSchema = new mongoose.Schema(
  {
    code: { type: String },
    title: { type: String, required: true },
  },
  { _id: true },
);

const workflowStageSchema = new mongoose.Schema(
  {
    order: { type: Number, default: 0 },
    title: { type: String, required: true },
    serviceId: { type: String },
    serviceCode: { type: String },
    expanded: { type: Boolean, default: true },
    tasks: [workflowTaskSchema],
  },
  { _id: true },
);

const workflowSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    status: { type: String, default: "Draft" },
    stages: [workflowStageSchema],
    businessModule: { type: String, default: "residential" },
  },
  { timestamps: true },
);

export default mongoose.model("Workflow", workflowSchema);
