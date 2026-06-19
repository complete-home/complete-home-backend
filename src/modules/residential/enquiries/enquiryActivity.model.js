import mongoose from "mongoose";

const enquiryActivitySchema = new mongoose.Schema(
  {
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      required: true,
      index: true,
    },
    actor: { type: String, default: "EMPLOYEE - System" },
    title: { type: String, required: true },
    desc: { type: String, default: "" },
  },
  { timestamps: true },
);

enquiryActivitySchema.virtual("time").get(function formatTime() {
  return this.createdAt
    ? new Date(this.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
});

enquiryActivitySchema.set("toJSON", { virtuals: true });
enquiryActivitySchema.set("toObject", { virtuals: true });

export default mongoose.model("EnquiryActivity", enquiryActivitySchema);
