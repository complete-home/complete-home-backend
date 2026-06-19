import AppError from "../../../core/errors/AppError.js";
import { Messages } from "../../../core/http/messages.js";
import { nextCode } from "../../../core/counters/counter.service.js";
import { getAllPermissionIds } from "../../../core/permissions/permissionUtils.js";
import { DASHBOARD_PROFILE_DEFAULT_PERMISSIONS } from "../../../core/permissions/dashboardProfiles.js";
import {
  menuKeysToPermissionIds,
  validateMenuAccess,
} from "../../../core/permissions/menuAccess.js";
import Designation from "./designation.model.js";
import User from "../users/user.model.js";

function formatDesignation(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o._id.toString(),
    code: o.code || "",
    name: o.name,
    description: o.description,
    permissionIds: o.permissionIds || [],
    menuAccess: o.menuAccess || [],
    dashboardProfile: o.dashboardProfile || "general",
    status: o.status,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

function validatePermissionIds(ids) {
  if (ids.includes("*")) return ids;
  const allowed = new Set(getAllPermissionIds());
  const invalid = ids.filter((id) => !allowed.has(id));
  if (invalid.length) {
    throw AppError.validation("Invalid permission IDs", {
      permissionIds: `Unknown: ${invalid.slice(0, 3).join(", ")}${invalid.length > 3 ? "…" : ""}`,
    });
  }
  return ids;
}

function resolveDesignationPermissions({
  menuAccess,
  permissionIds,
  dashboardProfile,
  seedDefaultPermissions,
}) {
  const profile = dashboardProfile || "general";
  const menus = validateMenuAccess(menuAccess || []);
  let ids = [...(permissionIds || [])];
  if (menus.length) {
    ids = [...new Set([...ids, ...menuKeysToPermissionIds(menus)])];
  }
  if (
    !ids.length &&
    (seedDefaultPermissions === true || seedDefaultPermissions === "true")
  ) {
    ids = DASHBOARD_PROFILE_DEFAULT_PERMISSIONS[profile] || [];
  }
  if (!ids.length && menus.length) {
    ids = menuKeysToPermissionIds(menus);
  }
  if (!ids.length) {
    throw AppError.validation("Select at least one menu access checkbox");
  }
  return { menus, ids: validatePermissionIds(ids) };
}

export async function listDesignations() {
  const rows = await Designation.find().sort({ name: 1 });
  return rows.map(formatDesignation);
}

export async function getDesignation(id) {
  const row = await Designation.findById(id);
  if (!row) throw AppError.notFound("Designation");
  return formatDesignation(row);
}

export async function createDesignation(body) {
  const code = await nextCode("DSG", "DSG-", 4, 1);
  const profile = body.dashboardProfile || "general";
  const { menus, ids } = resolveDesignationPermissions({
    menuAccess: body.menuAccess,
    permissionIds: body.permissionIds,
    dashboardProfile: profile,
    seedDefaultPermissions: body.seedDefaultPermissions,
  });
  const doc = await Designation.create({
    code,
    name: body.name,
    description: body.description || "",
    dashboardProfile: profile,
    menuAccess: menus,
    permissionIds: ids,
    status: body.status || "Active",
  });
  return formatDesignation(doc);
}

export async function updateDesignation(id, body) {
  const existing = await Designation.findById(id);
  if (!existing) throw AppError.notFound("Designation");

  const updates = { ...body };
  if (body.menuAccess !== undefined) {
    updates.menuAccess = validateMenuAccess(body.menuAccess);
  }
  if (body.permissionIds !== undefined || body.menuAccess !== undefined) {
    const { ids } = resolveDesignationPermissions({
      menuAccess: body.menuAccess ?? existing.menuAccess,
      permissionIds: body.permissionIds ?? existing.permissionIds,
      dashboardProfile: body.dashboardProfile ?? existing.dashboardProfile,
      seedDefaultPermissions: false,
    });
    updates.permissionIds = ids;
  }

  const row = await Designation.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });
  return formatDesignation(row);
}

export async function updateDesignationPermissions(id, permissionIds) {
  const row = await Designation.findByIdAndUpdate(
    id,
    { permissionIds: validatePermissionIds(permissionIds || []) },
    { new: true },
  );
  if (!row) throw AppError.notFound("Designation");
  return formatDesignation(row);
}

export async function deleteDesignation(id) {
  const inUse = await User.countDocuments({
    $or: [{ designationId: id }, { designationIds: id }],
  });
  if (inUse > 0) throw AppError.conflict(Messages.designation.inUse);
  const row = await Designation.findByIdAndDelete(id);
  if (!row) throw AppError.notFound("Designation");
  return { deleted: true };
}
