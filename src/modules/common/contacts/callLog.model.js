import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    phoneDialed: { type: String, default: "" },
    outcome: {
      type: String,
      enum: ["attempted", "connected", "missed"],
      default: "attempted",
    },
    durationSeconds: { type: Number, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("CallLog", callLogSchema);
