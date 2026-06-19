import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    location: { type: String, default: "" },
    type: { type: String, default: "BRANCH" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
  },
  { timestamps: true },
);

const departmentSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    teamCount: { type: Number, default: 0 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    initials: { type: String, maxlength: 4 },
  },
  { timestamps: true },
);

const companySchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "default", unique: true },
    name: { type: String, default: "" },
    website: { type: String, default: "" },
    mobile: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    landmark: { type: String, default: "" },
    pincode: { type: String, default: "" },
    area: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    cin: { type: String, default: "" },
    pan: { type: String, default: "" },
    gst: { type: String, default: "" },
    logoPreview: { type: String, default: null },
    banks: { type: Array, default: [] },
  },
  { timestamps: true },
);

export const Branch = mongoose.model("Branch", branchSchema);
export const Department = mongoose.model("Department", departmentSchema);
export const Company = mongoose.model("Company", companySchema);
