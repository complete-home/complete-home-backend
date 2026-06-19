import mongoose from "mongoose";

const operationTeamSchema = new mongoose.Schema(
  {
    department: { type: String, default: "" },
    name: { type: String, default: "" },
    designation: { type: String, default: "" },
    mobile: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true },
);

const contractorSchema = new mongoose.Schema(
  {
    work: { type: String, default: "" },
    workManager: { type: String, default: "" },
    contactNo: { type: String, default: "" },
    materialList: { type: String, default: "" },
    estimate: { type: String, default: "" },
    finalQuotation: { type: String, default: "" },
    unit: { type: String, default: "" },
    review: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true },
);

const vendorSchema = new mongoose.Schema(
  {
    material: { type: String, default: "" },
    shopName: { type: String, default: "" },
    contactNo: { type: String, default: "" },
    review: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true },
);

const projectSiteManagementSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
      index: true,
    },
    operationTeam: [operationTeamSchema],
    contractors: [contractorSchema],
    vendors: [vendorSchema],
    initialized: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model(
  "ProjectSiteManagement",
  projectSiteManagementSchema,
);
