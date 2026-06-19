import mongoose from "mongoose";

const lookupSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    values: { type: [String], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("Lookup", lookupSchema);
