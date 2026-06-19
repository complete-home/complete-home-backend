import mongoose from "mongoose";

export const TASK_STATUSES = ["todo", "progress", "review", "done"];

const taskSchema = new mongoose.Schema(
  {
    taskCode: { type: String, required: true, index: true },
    title: { type: String, required: true },
    taskType: { type: String, default: "General" },
    description: { type: String, default: "" },
    priority: { type: String, default: "Medium" },
    status: { type: String, enum: TASK_STATUSES, default: "todo" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    followUpNotes: { type: String, default: "" },
    assignedIds: [{ type: String }],
    assigneeInitials: { type: String, default: "" },
    attachments: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "Enquiry" },
    stage: { type: String, default: "" },
    businessModule: { type: String, default: "residential" },
    dueAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    timelinessStatus: {
      type: String,
      enum: ["on_time", "late", "overdue", "pending", "not_applicable"],
      default: "not_applicable",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Task", taskSchema);
