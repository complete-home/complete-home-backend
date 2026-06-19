import mongoose from "mongoose";

const notificationLogSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ["email", "sms", "log"], required: true },
    template: { type: String, required: true },
    recipient: { type: String, required: true },
    subject: { type: String },
    body: { type: String },
    status: {
      type: String,
      enum: ["queued", "sent", "failed", "skipped"],
      default: "queued",
    },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    error: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model("NotificationLog", notificationLogSchema);
