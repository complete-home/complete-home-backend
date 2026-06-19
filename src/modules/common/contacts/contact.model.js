import mongoose from "mongoose";

export const CONTACT_TYPES = [
  "client",
  "vendor",
  "contractor",
  "architect",
  "supplier",
  "other",
];

const contactSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    company: { type: String, default: "" },
    designation: { type: String, default: "" },
    primaryPhone: { type: String, required: true, trim: true },
    phoneNormalized: { type: String, required: true, index: true },
    secondaryPhone: { type: String, default: "" },
    email: { type: String, default: "", trim: true, lowercase: true },
    whatsapp: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    contactType: {
      type: String,
      enum: CONTACT_TYPES,
      default: "other",
    },
    tags: [{ type: String, trim: true }],
    linkedClientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    linkedVendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
    linkedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    linkedEnquiryIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Enquiry" },
    ],
    linkedProjectIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    ],
    lastCalledAt: { type: Date, default: null },
    callCount: { type: Number, default: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isPublic: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

contactSchema.index({ name: "text", company: "text", primaryPhone: "text" });

export default mongoose.model("Contact", contactSchema);
