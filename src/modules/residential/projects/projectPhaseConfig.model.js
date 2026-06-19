import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const materialCategorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const materialSubTabSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const projectPhaseConfigSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
      index: true,
    },
    planningSections: { type: [sectionSchema], default: [] },
    executionSections: { type: [sectionSchema], default: [] },
    siteManagementSections: { type: [sectionSchema], default: [] },
    materialCategories: { type: [materialCategorySchema], default: [] },
    materialSubTabs: { type: [materialSubTabSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("ProjectPhaseConfig", projectPhaseConfigSchema);
