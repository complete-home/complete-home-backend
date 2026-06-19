import Designation from "../../modules/user-management/designations/designation.model.js";
import { expandPermissions } from "./permissionUtils.js";
import { ROLE_TEMPLATES } from "./permissionTree.js";

async function loadDesignationsForUser(user) {
  const ids = [];
  if (user.designationIds?.length) {
    for (const id of user.designationIds) {
      const s = id?.toString?.() || id;
      if (s) ids.push(s);
    }
  }
  if (user.designationId) {
    const s =
      user.designationId._id?.toString?.() || user.designationId.toString?.();
    if (s && !ids.includes(s)) ids.unshift(s);
  }
  if (!ids.length) return [];
  return Designation.find({ _id: { $in: ids }, status: "Active" }).lean();
}

/**
 * Resolve effective permissions for a user.
 * Priority: overrides > union(all designations) > userType template > admin *
 */
export async function resolveUserPermissions(user) {
  if (user.permissionOverrides?.includes("*")) {
    return expandPermissions(["*"]);
  }

  let base = user.permissionOverrides?.length
    ? [...user.permissionOverrides]
    : [];

  const designations = await loadDesignationsForUser(user);
  for (const d of designations) {
    if (d.permissionIds?.length) {
      base = [...new Set([...base, ...d.permissionIds])];
    }
  }

  if (user.userType === "admin" && !base.length) {
    base = ["*"];
  }

  if (!base.length && ROLE_TEMPLATES[user.userType]?.permissionIds) {
    base = [...ROLE_TEMPLATES[user.userType].permissionIds];
  }

  return expandPermissions(base);
}

/** Primary designation for dashboard profile label */
export async function resolvePrimaryDesignation(user) {
  const primaryId =
    user.primaryDesignationId?._id?.toString?.() ||
    user.primaryDesignationId?.toString?.() ||
    user.designationId?._id?.toString?.() ||
    user.designationId?.toString?.();
  if (primaryId) {
    const d = await Designation.findById(primaryId).lean();
    if (d) return d;
  }
  const list = await loadDesignationsForUser(user);
  return list[0] || null;
}
