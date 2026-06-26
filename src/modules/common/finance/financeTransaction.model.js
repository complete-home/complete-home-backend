import mongoose from "mongoose";

const financeTransactionSchema = new mongoose.Schema(
  {
    transactionType: {
      type: String,
      enum: ["cash_in", "cash_out", "extra_expense"],
      required: true,
    },
    personType: {
      type: String,
      enum: ["vendor", "contractor", "client", "other"],
      default: "other",
    },
    personId: { type: mongoose.Schema.Types.ObjectId, default: null },
    personName: { type: String, required: true, trim: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    projectName: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    paymentDate: { type: Date, default: () => new Date() },
    paymentTime: { type: String, default: "" },
    paymentMode: {
      type: String,
      enum: ["Cash", "Bank Transfer", "UPI", "Cheque", "Other"],
      default: "Cash",
    },
    purpose: { type: String, default: "" },
    notes: { type: String, default: "" },
    attachmentUrl: { type: String, default: "" },
    referenceNumber: { type: String, default: "" },
    expenseCategory: { type: String, default: "" },
    status: {
      type: String,
      enum: ["completed", "pending", "cancelled"],
      default: "completed",
    },
    businessModule: {
      type: String,
      enum: ["residential", "services", "hr"],
      default: "residential",
    },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

financeTransactionSchema.index({ transactionType: 1, paymentDate: -1 });
financeTransactionSchema.index({ projectId: 1, paymentDate: -1 });
financeTransactionSchema.index({ personType: 1, personId: 1 });

export default mongoose.model("FinanceTransaction", financeTransactionSchema);
