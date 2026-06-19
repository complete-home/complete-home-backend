import mongoose from "mongoose";

const checklistTemplateSchema = new mongoose.Schema(
  {
    phase: {
      type: String,
      enum: ["planning", "execution", "material_brand", "site_management"],
      required: true,
      index: true,
    },
    sheetCode: { type: String, required: true, index: true },
    sheetTitle: { type: String, default: "" },
    category: { type: String, default: "" },
    /** Optional: 2d | 3d for BPD report rollups */
    dimension: { type: String, default: "" },
    stage: { type: String, default: "" },
    sortOrder: { type: Number, required: true, index: true },
    label: { type: String, required: true },
    inputType: {
      type: String,
      enum: ["ok_na", "text", "number", "photo"],
      default: "ok_na",
    },
    templateVersion: { type: String, default: "manoj-2025-v1", index: true },
  },
  { timestamps: true },
);

checklistTemplateSchema.index(
  { phase: 1, sheetCode: 1, sortOrder: 1, templateVersion: 1 },
  { unique: true },
);

export default mongoose.model("ChecklistTemplate", checklistTemplateSchema);
