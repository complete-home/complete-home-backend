import mongoose from "mongoose";
import {
  QUOTATION_FORMAT_TYPES,
  TEMPLATE_STATUSES,
} from "./quotationTemplate.constants.js";
import {
  categorySectionSchema,
  paymentMilestoneSchema,
} from "./quotationCategorySections.js";

const templateLineSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ["catalog", "manual"],
      default: "manual",
    },
    itemType: {
      type: String,
      enum: ["product", "service", "particular"],
      default: "service",
    },
    catalogId: { type: mongoose.Schema.Types.ObjectId, default: null },
    group: { type: String, default: "" },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    unit: { type: String, default: "nos" },
    defaultQuantity: { type: String, default: "1" },
    defaultRate: { type: String, default: "0" },
    marginPercentage: { type: String, default: "" },
    gstPercentage: { type: String, default: "18" },
    hsnCode: { type: String, default: "" },
    isOptional: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true },
);

const paymentScheduleSchema = new mongoose.Schema(
  {
    label: String,
    percent: String,
    terms: String,
  },
  { _id: false },
);

const quotationTemplateSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    /** Built-in slug or custom slug from lookup `quotationFormatTypes` */
    formatType: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: TEMPLATE_STATUSES,
      default: "Active",
    },
    businessModule: { type: String, default: "residential" },
    description: { type: String, default: "" },
    defaultTaxPercent: { type: String, default: "18" },
    displayDefaults: {
      showRate: { type: Boolean, default: true },
      showGst: { type: Boolean, default: true },
      showDimension: { type: Boolean, default: true },
      showGroupWise: { type: Boolean, default: true },
      showSqftBased: { type: Boolean, default: false },
    },
    termsText: { type: String, default: "" },
    notesText: { type: String, default: "" },
    lines: [templateLineSchema],
    selectedCategories: [{ type: String }],
    categorySections: [categorySectionSchema],
    paymentMilestones: [paymentMilestoneSchema],
    paymentSchedule: [paymentScheduleSchema],
    freezeRatesOnApply: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    updatedBy: { type: String, default: "" },
    versionHistory: [
      {
        version: Number,
        snapshot: mongoose.Schema.Types.Mixed,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: String, default: "" },
        changeNote: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("QuotationTemplate", quotationTemplateSchema);
