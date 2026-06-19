import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: { type: String, required: true, index: true },
    checkInAt: { type: Date, required: true },
    checkOutAt: { type: Date, default: null },
    geo: {
      lat: { type: Number },
      lng: { type: Number },
      accuracy: { type: Number },
      label: { type: String, default: "" },
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    status: {
      type: String,
      enum: ["open", "pending_approval", "approved", "rejected"],
      default: "open",
    },
    correctionNote: { type: String, default: "" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    businessModule: { type: String, default: "residential" },
  },
  { timestamps: true },
);

attendanceSchema.index({ userId: 1, date: 1 });

export default mongoose.model("Attendance", attendanceSchema);
