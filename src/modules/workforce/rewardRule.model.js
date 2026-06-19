import mongoose from "mongoose";

const rewardRuleSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        "task_complete",
        "attendance_approved",
        "payment_received",
        "manual",
      ],
    },
    label: { type: String, required: true },
    description: { type: String, default: "" },
    points: { type: Number, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

rewardRuleSchema.index({ eventType: 1, active: 1 });

export default mongoose.model("RewardRule", rewardRuleSchema);
