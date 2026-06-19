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
    category: { type: String, default: "" },
    contact: { type: String, default: "" },
    status: { type: String, default: "Active" },
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
    stock: { type: String, default: "In Stock" },
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

export const Client = mongoose.model("Client", clientSchema);
export const Vendor = mongoose.model("Vendor", vendorSchema);
export const Product = mongoose.model("Product", productSchema);
export const Service = mongoose.model("Service", serviceSchema);
