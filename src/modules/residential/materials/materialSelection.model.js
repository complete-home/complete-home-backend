import mongoose from "mongoose";

const TYPES = ["tile", "paint", "furniture", "tile_qty"];

const materialSelectionSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    selectionType: {
      type: String,
      enum: TYPES,
      required: true,
      index: true,
    },
    sortOrder: { type: Number, default: 0 },
    space: { type: String, default: "" },
    company: { type: String, default: "" },
    productName: { type: String, default: "" },
    code: { type: String, default: "" },
    floor: { type: String, default: "" },
    areaSqft: { type: Number, default: null },
    areaText: { type: String, default: "" },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
    notes: { type: String, default: "" },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

materialSelectionSchema.index({ projectId: 1, selectionType: 1, sortOrder: 1 });

export { TYPES as MATERIAL_SELECTION_TYPES };
export default mongoose.model("MaterialSelection", materialSelectionSchema);
