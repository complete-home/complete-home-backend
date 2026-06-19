import mongoose from "mongoose";
import { gstPaymentFields } from "../../core/schemas/gstPaymentFields.js";

const employeePaymentSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paymentType: {
      type: String,
      enum: ["salary", "advance", "bonus", "reimbursement", "other"],
      default: "salary",
    },
    paymentMode: { type: String, default: "Bank Transfer" },
    reference: { type: String, default: "" },
    notes: { type: String, default: "" },
    paidAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["completed", "pending", "cancelled"],
      default: "completed",
    },
    businessModule: { type: String, default: "residential" },
    ...gstPaymentFields,
  },
  { timestamps: true },
);

export default mongoose.model("EmployeePayment", employeePaymentSchema);
