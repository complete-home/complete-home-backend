import mongoose from "mongoose";
import { gstPaymentFields } from "../../../core/schemas/gstPaymentFields.js";

const payableLedgerEntrySchema = new mongoose.Schema(
  {
    obligationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayableObligation",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paidAt: { type: Date, default: Date.now },
    paymentMode: { type: String, default: "Other", trim: true },
    reference: { type: String, default: "", trim: true },
    invoiceNumber: { type: String, default: "", trim: true },
    invoiceDate: { type: Date, default: null },
    placeOfSupply: { type: String, default: "", trim: true },
    amountInWords: { type: String, default: "", trim: true },
    amountReceived: { type: Number, default: null },
    balanceAmount: { type: Number, default: null },
    note: { type: String, default: "", trim: true },
    receiptUrl: { type: String, default: "", trim: true },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    source: {
      type: String,
      enum: ["manual", "import", "bank_feed"],
      default: "manual",
    },
    ...gstPaymentFields,
  },
  { timestamps: true },
);

export default mongoose.model("PayableLedgerEntry", payableLedgerEntrySchema);
