import mongoose from "mongoose";

/**
 * Designation = job title with hierarchical permission checkboxes.
 * Employees inherit permissionIds from their designation.
 */
const designationSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    /** Flat permission IDs from permission tree (leaves); ["*"] = full access */
    permissionIds: { type: [String], default: [] },
    /** Residential sidebar menu keys this role may access (see menuAccess.js) */
    menuAccess: { type: [String], default: [] },
    /**
     * Which dashboard widget layout employees with this designation see.
     * executive | sales | finance | operations | general
     */
    dashboardProfile: {
      type: String,
      enum: ["executive", "sales", "finance", "operations", "general"],
      default: "general",
    },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true },
);

designationSchema.index({ name: 1 });

export default mongoose.model("Designation", designationSchema);
