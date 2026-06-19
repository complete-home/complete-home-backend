import mongoose from "mongoose";
import { gstPaymentFields } from "../../../core/schemas/gstPaymentFields.js";

const enquiryPaymentSchema = new mongoose.Schema(
  {
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      required: true,
      index: true,
    },
    amount: { type: String, required: true },
    amountNumeric: { type: Number, default: null },
    paymentType: { type: String },
    paymentMode: { type: String },
    paymentDate: { type: String },
    bankName: { type: String },
    referenceNumber: { type: String },
    status: { type: String, default: "Completed" },
    clientStatus: {
      type: String,
      enum: ["none", "pending_confirmation", "confirmed", "disputed"],
      default: "none",
    },
    clientComment: { type: String, default: "" },
    clientActionHistory: [
      {
        action: { type: String, enum: ["confirm", "dispute"] },
        comment: String,
        actorName: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    receiptUrl: { type: String },
    paymentLink: { type: String },
    description: { type: String },
    ...gstPaymentFields,
  },
  { timestamps: true },
);

export default mongoose.model("EnquiryPayment", enquiryPaymentSchema);
