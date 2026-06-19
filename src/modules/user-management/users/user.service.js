import bcrypt from "bcryptjs";
import AppError from "../../../core/errors/AppError.js";
import { nextCode } from "../../../core/counters/counter.service.js";
import { docId, getInitials } from "../../../core/http/formatHelpers.js";
import User from "./user.model.js";
import Designation from "../designations/designation.model.js";
import {
  Branch,
  Department,
} from "../../common/organization/organization.model.js";

async function resolveDesignationId(designationNameOrId) {
  if (!designationNameOrId) return null;
  if (String(designationNameOrId).match(/^[a-f0-9]{24}$/i)) {
    return designationNameOrId;
  }
  const d = await Designation.findOne({
    name: new RegExp(`^${String(designationNameOrId).trim()}$`, "i"),
  });
  return d?._id || null;
}

async function resolveDesignationIds(body) {
  if (Array.isArray(body.designationIds) && body.designationIds.length) {
    const ids = [];
    for (const raw of body.designationIds) {
      const id = await resolveDesignationId(raw);
      if (id) ids.push(id);
    }
    return [...new Set(ids.map((x) => x.toString()))];
  }
  const single = await resolveDesignationId(
    body.primaryDesignationId || body.designationId || body.designation,
  );
  return single ? [single.toString()] : [];
}

async function resolveDepartmentId(departmentNameOrId) {
  if (!departmentNameOrId) return null;
  if (String(departmentNameOrId).match(/^[a-f0-9]{24}$/i)) {
    return departmentNameOrId;
  }
  const d = await Department.findOne({
    name: new RegExp(`^${String(departmentNameOrId).trim()}$`, "i"),
  });
  return d?._id || null;
}

async function resolveBranchId(branchNameOrId) {
  if (!branchNameOrId) return null;
  if (String(branchNameOrId).match(/^[a-f0-9]{24}$/i)) {
    return branchNameOrId;
  }
  const b = await Branch.findOne({
    name: new RegExp(`^${String(branchNameOrId).trim()}$`, "i"),
  });
  return b?._id || null;
}

function fmtEmployee(
  user,
  primaryDesignation,
  department,
  branch,
  allDesignations = [],
) {
  const o = user.toObject ? user.toObject() : user;
  const designationIds = (o.designationIds || [])
    .map((d) => d?.toString?.() || d)
    .filter(Boolean);
  return {
    id: docId(o),
    empId: o.userId,
    name: o.name,
    email: o.email || "",
    mobile: o.mobile || "",
    role: primaryDesignation?.name || o.userType,
    designation: primaryDesignation?.name || "",
    designationId:
      o.primaryDesignationId?.toString?.() ||
      o.designationId?.toString?.() ||
      designationIds[0] ||
      null,
    designationIds,
    designations: allDesignations.map((d) => ({
      id: d._id?.toString?.() || d.id,
      name: d.name,
      code: d.code,
    })),
    primaryDesignationId:
      o.primaryDesignationId?.toString?.() ||
      o.designationId?.toString?.() ||
      designationIds[0] ||
      null,
    department: department?.name || "",
    departmentId: o.departmentId?.toString?.() || o.departmentId || null,
    branch: branch?.name || "",
    branchId: o.branchIds?.[0]?.toString?.() || null,
    location: branch?.name || "",
    status: o.status,
    initials: o.initials || getInitials(o.name),
    profile: o.profile || {},
    permissionOverrides: o.permissionOverrides || [],
    dashboardProfile: primaryDesignation?.dashboardProfile || "general",
  };
}

async function loadEmployeeDesignations(user) {
  const ids = user.designationIds?.length
    ? user.designationIds
    : user.designationId
      ? [user.designationId]
      : [];
  if (!ids.length) return [];
  return Designation.find({ _id: { $in: ids } }).sort({ name: 1 });
}

export async function listEmployees() {
  const users = await User.find({ userType: { $ne: "admin" } })
    .sort({ name: 1 })
    .populate("designationId");
  const deptIds = users.map((u) => u.departmentId).filter(Boolean);
  const branchIds = users.flatMap((u) => u.branchIds || []);
  const [departments, branches] = await Promise.all([
    Department.find({ _id: { $in: deptIds } }),
    Branch.find({ _id: { $in: branchIds } }),
  ]);
  const deptMap = Object.fromEntries(
    departments.map((d) => [d._id.toString(), d]),
  );
  const branchMap = Object.fromEntries(
    branches.map((b) => [b._id.toString(), b]),
  );

  return Promise.all(
    users.map(async (u) => {
      const dept = u.departmentId ? deptMap[u.departmentId.toString()] : null;
      const branchId = u.branchIds?.[0]?.toString();
      const branch = branchId ? branchMap[branchId] : null;
      const allDsg = await loadEmployeeDesignations(u);
      const primaryId =
        u.primaryDesignationId?.toString?.() || u.designationId?.toString?.();
      const primary =
        allDsg.find((d) => d._id.toString() === primaryId) ||
        allDsg[0] ||
        u.designationId;
      return fmtEmployee(u, primary, dept, branch, allDsg);
    }),
  );
}

function normalizePermissionOverrides(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((x) => typeof x === "string" && x.trim()))];
}

export async function createEmployee(body) {
  const normalizedUserId =
    body.userId?.trim().toUpperCase() ||
    (await nextCode("USRSEQ", "USR", 4, 1001));

  const existing = await User.findOne({ userId: normalizedUserId });
  if (existing) throw AppError.badRequest("Employee ID already exists");

  const designationIds = await resolveDesignationIds(body);
  const primaryRaw =
    body.primaryDesignationId ||
    body.designationId ||
    designationIds[0] ||
    null;
  const primaryDesignationId = primaryRaw
    ? await resolveDesignationId(primaryRaw)
    : null;
  const departmentId = await resolveDepartmentId(
    body.departmentId || body.department,
  );
  const branchId = await resolveBranchId(body.branchId || body.branch);
  const password = body.password || "changeme123";
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    userId: normalizedUserId,
    passwordHash,
    name: body.name,
    email: body.email,
    mobile: body.mobile,
    userType: "employee",
    designationId: primaryDesignationId,
    designationIds,
    primaryDesignationId: primaryDesignationId || designationIds[0] || null,
    departmentId,
    branchIds: branchId ? [branchId] : [],
    initials: body.initials || getInitials(body.name),
    status: body.status || "Active",
    profile: body.profile || {},
    permissionOverrides: normalizePermissionOverrides(body.permissionOverrides),
  });

  const allDsg = await loadEmployeeDesignations(user);
  const primary =
    allDsg.find(
      (d) =>
        d._id.toString() ===
        (user.primaryDesignationId || user.designationId)?.toString(),
    ) || allDsg[0];
  const dept = departmentId ? await Department.findById(departmentId) : null;
  const branch = branchId ? await Branch.findById(branchId) : null;
  return fmtEmployee(user, primary, dept, branch, allDsg);
}

export async function updateEmployee(id, body) {
  const user = await User.findById(id);
  if (!user || user.userType === "admin") {
    throw AppError.notFound("Employee not found");
  }

  if (body.name !== undefined) user.name = body.name;
  if (body.email !== undefined) user.email = body.email;
  if (body.mobile !== undefined) user.mobile = body.mobile;
  if (body.status !== undefined) user.status = body.status;
  if (body.initials !== undefined) user.initials = body.initials;
  if (body.profile !== undefined) user.profile = body.profile;

  if (
    body.designationIds !== undefined ||
    body.designationId !== undefined ||
    body.designation !== undefined ||
    body.primaryDesignationId !== undefined
  ) {
    const designationIds = await resolveDesignationIds(body);
    user.designationIds = designationIds;
    const primaryRaw =
      body.primaryDesignationId ||
      body.designationId ||
      designationIds[0] ||
      null;
    user.primaryDesignationId = primaryRaw
      ? await resolveDesignationId(primaryRaw)
      : null;
    user.designationId = user.primaryDesignationId;
  }
  if (body.departmentId !== undefined || body.department !== undefined) {
    user.departmentId = await resolveDepartmentId(
      body.departmentId || body.department,
    );
  }
  if (body.branchId !== undefined || body.branch !== undefined) {
    const branchId = await resolveBranchId(body.branchId || body.branch);
    user.branchIds = branchId ? [branchId] : [];
  }
  if (body.password) {
    user.passwordHash = await bcrypt.hash(body.password, 12);
  }
  if (body.permissionOverrides !== undefined) {
    user.permissionOverrides = normalizePermissionOverrides(
      body.permissionOverrides,
    );
  }

  await user.save();
  const allDsg = await loadEmployeeDesignations(user);
  const primary =
    allDsg.find(
      (d) =>
        d._id.toString() ===
        (user.primaryDesignationId || user.designationId)?.toString(),
    ) || allDsg[0];
  const dept = user.departmentId
    ? await Department.findById(user.departmentId)
    : null;
  const branchId = user.branchIds?.[0];
  const branch = branchId ? await Branch.findById(branchId) : null;
  return fmtEmployee(user, primary, dept, branch, allDsg);
}

export async function deleteEmployee(id) {
  const user = await User.findOneAndDelete({
    _id: id,
    userType: { $ne: "admin" },
  });
  if (!user) throw AppError.notFound("Employee not found");
  return { id };
}
