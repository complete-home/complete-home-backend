import mongoose from "mongoose";

const partySchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    company: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  { _id: false },
);

const clientMilestoneSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, default: "" },
    percent: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    trigger: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "paid"],
      default: "pending",
    },
    linkedPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EnquiryPayment",
      default: null,
    },
    paidAt: { type: Date, default: null },
  },
  { _id: false },
);

const subcontractorStageSchema = new mongoose.Schema(
  {
    stageNo: { type: Number, required: true },
    description: { type: String, default: "" },
    percent: { type: Number, default: 0 },
    condition: { type: String, default: "" },
  },
  { _id: false },
);

const sqftLineSchema = new mongoose.Schema(
  {
    description: { type: String, default: "" },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    areaSqft: { type: Number, default: null },
    ratePerSqft: { type: Number, default: null },
    amount: { type: Number, default: 0 },
  },
  { _id: false },
);

const approvedTradeSchema = new mongoose.Schema(
  {
    trade: { type: String, required: true },
    contractorName: { type: String, default: "" },
    mobile: { type: String, default: "" },
    contractAmount: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { _id: false },
);

const projectAgreementSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "finalized", "signed"],
      default: "draft",
    },
    agreementDate: { type: String, default: "" },
    clientParty: { type: partySchema, default: () => ({}) },
    consultantParty: { type: partySchema, default: () => ({}) },
    siteAddress: { type: String, default: "" },
    workStartDate: { type: String, default: "" },
    workDurationMonths: { type: Number, default: 7 },
    agreementKind: {
      type: String,
      enum: ["operation_planning"],
      default: "operation_planning",
    },
    useSqftPricing: { type: Boolean, default: false },
    sqftLines: { type: [sqftLineSchema], default: [] },
    consultancyFeeTotal: { type: Number, default: 194850 },
    penaltyPerMonth: { type: Number, default: 50000 },
    warrantyYears: { type: Number, default: 1 },
    clientMilestones: { type: [clientMilestoneSchema], default: [] },
    subcontractorSchedule: {
      type: [subcontractorStageSchema],
      default: [],
    },
    approvedTrades: { type: [approvedTradeSchema], default: [] },
    statusOptions: { type: [String], default: [] },
    notes: { type: String, default: "" },
    clientSignedAt: { type: Date, default: null },
    consultantSignedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("ProjectAgreement", projectAgreementSchema);
