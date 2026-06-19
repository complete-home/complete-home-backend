import mongoose from "mongoose";

const projectReportValueSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    team: {
      type: String,
      enum: ["mcs", "bpd", "psq", "ala"],
      required: true,
      index: true,
    },
    fieldKey: { type: String, required: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, default: "" },
  },
  { timestamps: true },
);

projectReportValueSchema.index(
  { projectId: 1, team: 1, fieldKey: 1 },
  { unique: true },
);

export default mongoose.model("ProjectReportValue", projectReportValueSchema);
