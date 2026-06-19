import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    mobile: { type: String, trim: true },
    userType: {
      type: String,
      enum: [
        "admin",
        "employee",
        "department",
        "supervisor",
        "vendor",
        "client",
        "contractor",
      ],
      default: "employee",
    },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      default: null,
    },
    /** Employee may hold multiple designations; permissions are merged on login */
    designationIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Designation" },
    ],
    primaryDesignationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      default: null,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    profile: { type: mongoose.Schema.Types.Mixed, default: {} },
    /** Optional per-user overrides (rare); designation is primary RBAC */
    permissionOverrides: { type: [String], default: [] },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
    branchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Branch" }],
    defaultModule: {
      type: String,
      enum: ["residential", "services", "realty", "architecture", "commercial"],
      default: "residential",
    },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    initials: { type: String, maxlength: 4 },
    lastLoginAt: { type: Date },
    failedAttempts: { type: Number, default: 0 },
    inviteToken: { type: String, sparse: true, index: true },
    inviteTokenExpiresAt: { type: Date },
    inviteEnquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.index({ designationId: 1 });

export default mongoose.model("User", userSchema);
