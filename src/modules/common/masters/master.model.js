import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    status: { type: String, default: "Active" },
    initials: String,
    email: String,
    mobile: String,
    city: String,
    project: String,
  },
  { timestamps: true },
);

const vendorSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, default: "" },
    vendorTypes: [{ type: String }],
    tradeDesignations: [{ type: String }],
    category: { type: String, default: "" },
    contact: { type: String, default: "" },
    status: { type: String, default: "Active" },
    profile: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

const productSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    group: String,
    category: String,
    brand: String,
    imageUrl: { type: String, default: "" },
    unit: { type: String, default: "" },
    purchasePrice: { type: String, default: "0" },
    salePrice: { type: String, default: "0" },
    gst18: { type: Boolean, default: false },
    stock: { type: String, default: "In Stock" },
    openingStock: { type: Number, default: 0 },
    stockQuantity: { type: Number, default: 0 },
    lowStockAlert: { type: Number, default: 0 },
    hsnCode: { type: String, default: "" },
    asOfDate: { type: Date, default: () => new Date() },
    stockMovements: [
      {
        date: { type: Date, default: Date.now },
        quantityAfter: Number,
        delta: Number,
        note: String,
        refType: String,
        refId: String,
      },
    ],
    marginPercentage: { type: String, default: "10" },
    gstPercentage: { type: String, default: "0" },
    status: { type: String, default: "Active" },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
    vendorName: { type: String, default: "" },
  },
  { timestamps: true },
);

const serviceSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    unit: String,
    group: String,
    displayOnEnquiry: { type: Boolean, default: false },
    estimatedAmount: { type: String, default: "0" },
    marginPercentage: { type: String, default: "10" },
    status: { type: String, default: "Active" },
  },
  { timestamps: true },
);

const materialSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    company: { type: String, default: "" },
    variant: { type: String, default: "" },
    colourName: { type: String, default: "" },
    colourCode: { type: String, default: "" },
    status: { type: String, default: "Active" },
    businessModule: { type: String, default: "residential" },
  },
  { timestamps: true },
);

materialSchema.index({ category: 1, company: 1 });
materialSchema.index({ businessModule: 1, updatedAt: -1 });

export const Client = mongoose.model("Client", clientSchema);
export const Vendor = mongoose.model("Vendor", vendorSchema);
export const Product = mongoose.model("Product", productSchema);
export const Service = mongoose.model("Service", serviceSchema);
export const Material = mongoose.model("Material", materialSchema);
