import mongoose from "mongoose";
import { QUOTATION_STATUSES } from "./quotation.constants.js";
import {
  categorySectionSchema,
  paymentMilestoneSchema,
} from "../../common/quotation-templates/quotationCategorySections.js";

const quotationItemSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: ["particular", "product", "service"],
      default: "particular",
    },
    group: String,
    title: String,
    name: String,
    description: String,
    hsnCode: String,
    gstPercentage: String,
    rate: String,
    currency: { type: String, default: "INR" },
    marginPercentage: String,
    unit: String,
    measurementType: String,
    quantity: String,
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    areaSqft: { type: Number, default: null },
    ratePerSqft: { type: Number, default: null },
    price: String,
    source: { type: String, enum: ["catalog", "manual"], default: "manual" },
    catalogId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { _id: true },
);

const approvalHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["approve", "reject", "request_changes", "request_revision"],
      required: true,
    },
    comment: { type: String, default: "" },
    actorName: { type: String, default: "System" },
    actorType: {
      type: String,
      enum: ["employee", "client", "system"],
      default: "employee",
    },
  },
  { timestamps: true },
);

const revisionRequestSchema = new mongoose.Schema(
  {
    comment: { type: String, required: true },
    actorName: { type: String, default: "Client" },
    actorType: {
      type: String,
      enum: ["employee", "client"],
      default: "client",
    },
    status: {
      type: String,
      enum: ["open", "acknowledged"],
      default: "open",
    },
  },
  { timestamps: true },
);

const quotationSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    client: { type: String, default: "" },
    clientDisplay: { type: String, default: "—" },
    amount: { type: String, default: "₹0" },
    status: {
      type: String,
      enum: QUOTATION_STATUSES,
      default: "Draft",
    },
    enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "Enquiry" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    partyType: {
      type: String,
      enum: ["client", "contractor", "vendor"],
      default: "client",
      index: true,
    },
    payeeKind: {
      type: String,
      enum: ["client", "vendor", "siteContractor"],
      default: "client",
    },
    payeeId: { type: mongoose.Schema.Types.ObjectId, default: null },
    payeeLabel: { type: String, default: "" },
    showRate: { type: Boolean, default: true },
    showGst: { type: Boolean, default: true },
    showDimension: { type: Boolean, default: true },
    showGroupWise: { type: Boolean, default: true },
    showSqftBased: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    products: [quotationItemSchema],
    services: [quotationItemSchema],
    subtotal: { type: String, default: "₹0" },
    taxPercent: { type: String, default: "18" },
    taxAmount: { type: String, default: "₹0" },
    grandTotal: { type: String, default: "₹0" },
    businessModule: { type: String, default: "residential" },
    /** Latest client-facing note from approve/reject/request */
    clientComment: { type: String, default: "" },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    approvalHistory: [approvalHistorySchema],
    /** Post-approval change requests — quotation content stays locked */
    revisionRequests: [revisionRequestSchema],
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuotationTemplate",
      default: null,
    },
    templateVersion: { type: Number, default: null },
    templateCode: { type: String, default: "" },
    formatType: { type: String, default: null },
    variantLabel: { type: String, default: "" },
    isPrimary: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    termsText: { type: String, default: "" },
    paymentSchedule: [
      {
        label: String,
        percent: String,
        terms: String,
      },
    ],
    selectedCategories: [{ type: String }],
    categorySections: [categorySectionSchema],
    paymentMilestones: [paymentMilestoneSchema],
    categoryGrandTotal: { type: String, default: "" },
    copiedFromQuotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      default: null,
    },
    copiedFromQuotationCode: { type: String, default: "" },
    validityDays: { type: String, default: "" },
    validUntil: { type: Date, default: null },
    scopeNotes: { type: String, default: "" },
    exclusions: { type: String, default: "" },
    internalNotes: { type: String, default: "" },
    preparedBy: { type: String, default: "" },
    siteAddress: { type: String, default: "" },
    discountPercent: { type: String, default: "" },
    /** Vendor / manual quote capture */
    projectRef: { type: String, default: "" },
    sourceChannel: {
      type: String,
      enum: ["crm", "vendor_portal", "admin_capture"],
      default: "crm",
    },
    attachmentUrls: [{ type: String, trim: true }],
    linkedPayableObligationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayableObligation",
      default: null,
    },
  },
  { timestamps: true },
);

quotationSchema.index({ enquiryId: 1, sortOrder: 1 });
quotationSchema.index({ projectId: 1, partyType: 1 });
quotationSchema.index({ payeeId: 1, partyType: 1, status: 1 });

export { QUOTATION_STATUSES };
export default mongoose.model("Quotation", quotationSchema);
