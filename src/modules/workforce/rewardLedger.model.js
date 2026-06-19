import mongoose from "mongoose";

const rewardLedgerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    points: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    refType: { type: String, default: "" },
    refId: { type: String, default: "" },
    createdBy: { type: String, default: "System" },
  },
  { timestamps: true },
);

export default mongoose.model("RewardLedger", rewardLedgerSchema);
