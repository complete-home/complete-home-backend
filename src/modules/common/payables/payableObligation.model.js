import mongoose from "mongoose";

const STATUSES = ["draft", "active", "closed", "cancelled"];

const payableObligationSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true,
    },
    payeeKind: {
      type: String,
      enum: ["vendor", "siteContractor", "contractor"],
      default: "vendor",
    },
    payeeKey: { type: String, default: "", index: true },
    siteContractorRowId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    payeeDisplayName: { type: String, default: "" },
    title: { type: String, required: true, trim: true },
    committedAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", trim: true, uppercase: true },
    status: {
      type: String,
      enum: STATUSES,
      default: "active",
      index: true,
    },
    businessModule: {
      type: String,
      enum: ["residential", "services"],
      default: "residential",
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      default: null,
    },
    dueDate: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export { STATUSES as PAYABLE_OBLIGATION_STATUSES };
export default mongoose.model("PayableObligation", payableObligationSchema);
