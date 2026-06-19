import AppError from "../errors/AppError.js";
import { hasPermission } from "../permissions/permissionUtils.js";

/**
 * Require one permission (from designation + overrides on JWT resolution).
 * @param {string} permissionId
 */
export function requirePermission(permissionId) {
  return (req, _res, next) => {
    if (!req.permissions) {
      return next(AppError.unauthorized());
    }
    if (!hasPermission(req.permissions, permissionId)) {
      return next(AppError.forbidden());
    }
    next();
  };
}

/** Require any of the listed permissions */
export function requireAnyPermission(...permissionIds) {
  return (req, _res, next) => {
    if (!req.permissions) return next(AppError.unauthorized());
    const ok = permissionIds.some((id) => hasPermission(req.permissions, id));
    if (!ok) return next(AppError.forbidden());
    next();
  };
}
