import mongoose from "mongoose";

const historySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    comment: { type: String, default: "" },
    actorName: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const projectApprovalSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["design", "boq", "milestone"],
      default: "design",
    },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "sent", "approved", "rejected", "changes_requested"],
      default: "draft",
    },
    clientComment: { type: String, default: "" },
    sentAt: { type: Date },
    clientActionAt: { type: Date },
    history: [historySchema],
  },
  { timestamps: true },
);

export default mongoose.model("ProjectApproval", projectApprovalSchema);
