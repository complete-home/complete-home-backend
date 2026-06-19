import mongoose from "mongoose";

const reportFieldDefinitionSchema = new mongoose.Schema(
  {
    team: {
      type: String,
      enum: ["mcs", "bpd", "psq", "ala"],
      required: true,
      index: true,
    },
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    dataType: {
      type: String,
      enum: ["text", "number", "date", "lookup", "percent"],
      default: "text",
    },
    source: {
      type: String,
      enum: ["derived", "manual", "lookup"],
      default: "manual",
    },
    lookupKey: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

reportFieldDefinitionSchema.index({ team: 1, key: 1 }, { unique: true });

export default mongoose.model(
  "ReportFieldDefinition",
  reportFieldDefinitionSchema,
);
