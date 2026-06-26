import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import AppError from "../errors/AppError.js";
import User from "../../modules/user-management/users/user.model.js";
import { resolveUserPermissions } from "../permissions/resolvePermissions.js";

const permissionCache = new Map();
const inflightAuth = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function normalizeUserId(userId) {
  return String(userId || "").trim();
}

function getCachedPermissions(userId) {
  const key = normalizeUserId(userId);
  const entry = permissionCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    permissionCache.delete(key);
    return null;
  }
  return entry.permissions;
}

function setCachedPermissions(userId, permissions) {
  const key = normalizeUserId(userId);
  permissionCache.set(key, {
    permissions,
    timestamp: Date.now(),
  });
  if (permissionCache.size > 1000) {
    const oldest = Array.from(permissionCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, 500);
    oldest.forEach(([cacheKey]) => permissionCache.delete(cacheKey));
  }
}

export function clearPermissionCache(userId) {
  if (userId) permissionCache.delete(normalizeUserId(userId));
  else permissionCache.clear();
}

async function loadUserForAuth(userId) {
  const key = normalizeUserId(userId);
  return User.findById(key)
    .select("_id name userId email status userType defaultModule designationId")
    .populate("designationId", "name dashboardProfile")
    .lean();
}

async function resolveAuthContext(userId) {
  const key = normalizeUserId(userId);
  if (!key) throw AppError.unauthorized();

  const cachedPermissions = getCachedPermissions(key);
  if (cachedPermissions) {
    const user = await loadUserForAuth(key);
    if (!user || user.status !== "Active") {
      clearPermissionCache(key);
      throw AppError.unauthorized();
    }
    return { user, permissions: cachedPermissions };
  }

  if (inflightAuth.has(key)) {
    return inflightAuth.get(key);
  }

  const promise = (async () => {
    const user = await loadUserForAuth(key);
    if (!user || user.status !== "Active") {
      throw AppError.unauthorized();
    }

    const permissions = await resolveUserPermissions({ ...user, _id: key });
    setCachedPermissions(key, permissions);
    return { user, permissions };
  })();

  inflightAuth.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightAuth.delete(key);
  }
}

export async function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(AppError.unauthorized());
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const { user, permissions } = await resolveAuthContext(payload.sub);

    req.user = user;
    req.permissions = permissions;
    req.businessModule = payload.businessModule || user.defaultModule;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }
    if (err?.name === "TokenExpiredError" || err?.name === "JsonWebTokenError") {
      return next(
        AppError.unauthorized("Session expired. Please log in again"),
      );
    }
    if (env.nodeEnv !== "production") {
      console.error("authenticate error:", err);
    }
    return next(AppError.unauthorized());
  }
}

/** Optional auth — does not fail if no token */
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();
  return authenticate(req, _res, next);
}
