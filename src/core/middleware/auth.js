import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import AppError from "../errors/AppError.js";
import User from "../../modules/user-management/users/user.model.js";
import { resolveUserPermissions } from "../permissions/resolvePermissions.js";

export async function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(AppError.unauthorized());
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).populate("designationId");
    if (!user || user.status !== "Active") {
      return next(AppError.unauthorized());
    }

    const permissions = await resolveUserPermissions(user);

    req.user = user;
    req.permissions = permissions;
    req.businessModule = payload.businessModule || user.defaultModule;
    next();
  } catch {
    next(AppError.unauthorized("Session expired. Please log in again"));
  }
}

/** Optional auth — does not fail if no token */
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();
  return authenticate(req, _res, next);
}
