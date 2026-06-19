import mongoose from "mongoose";

const timelinessLogSchema = new mongoose.Schema(
  {
    entityType: { type: String, enum: ["task", "project"], required: true },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    entityCode: { type: String, default: "" },
    entityTitle: { type: String, default: "" },
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    userNames: [{ type: String }],
    timelinessStatus: {
      type: String,
      enum: ["on_time", "late", "overdue", "pending", "not_applicable"],
      required: true,
    },
    event: {
      type: String,
      enum: ["deadline_set", "completed", "status_sync", "reopened"],
      default: "status_sync",
    },
    dueAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    monthKey: { type: String, index: true },
    businessModule: { type: String, default: "residential" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    note: { type: String, default: "" },
    recordedBy: { type: String, default: "System" },
  },
  { timestamps: true },
);

timelinessLogSchema.index({ monthKey: 1, entityType: 1 });
timelinessLogSchema.index({ userIds: 1, monthKey: 1 });

export default mongoose.model("TimelinessLog", timelinessLogSchema);
