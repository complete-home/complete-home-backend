import mongoose from "mongoose";

const descriptionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

const productCategorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true, trim: true },
    descriptions: [descriptionSchema],
  },
  { timestamps: true },
);

export default mongoose.model("ProductCategory", productCategorySchema);
