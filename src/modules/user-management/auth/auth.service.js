import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../../config/env.js";
import AppError from "../../../core/errors/AppError.js";
import { Messages } from "../../../core/http/messages.js";
import User from "../users/user.model.js";
import {
  resolveUserPermissions,
  resolvePrimaryDesignation,
} from "../../../core/permissions/resolvePermissions.js";

function signToken(user, businessModule) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      userId: user.userId,
      userType: user.userType,
      businessModule: businessModule || user.defaultModule,
    },
    env.jwtSecret,
    { expiresIn: env.jwtAccessExpires },
  );
}

export async function login(userId, password, businessModule) {
  const normalized = String(userId || "")
    .trim()
    .toUpperCase();
  const user = await User.findOne({ userId: normalized })
    .select("+passwordHash")
    .populate("designationId");
  if (!user) {
    throw AppError.unauthorized(Messages.auth.invalidCredentials);
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw AppError.unauthorized(Messages.auth.invalidCredentials);
  }

  if (user.status !== "Active") {
    throw AppError.forbidden("Your account is inactive");
  }

  user.lastLoginAt = new Date();
  user.failedAttempts = 0;
  await user.save();

  const permissions = await resolveUserPermissions(user);
  const primary = await resolvePrimaryDesignation(user);
  const token = signToken(user, businessModule);

  return {
    token,
    user: {
      code: user.userId,
      name: user.name,
      role: user.userType === "admin" ? "Administrator" : user.userType,
      initials: user.initials || user.name?.slice(0, 2)?.toUpperCase(),
      userType: user.userType,
      clientId: user.clientId?.toString() || null,
      vendorId: user.vendorId?.toString() || null,
      designationId: primary?._id?.toString() || null,
      designationName: primary?.name || null,
      designationIds: (user.designationIds || [])
        .map((d) => d?.toString?.())
        .filter(Boolean),
      dashboardProfile:
        user.userType === "admin"
          ? "executive"
          : user.userType === "vendor"
            ? "vendor"
            : primary?.dashboardProfile || "general",
    },
    permissions,
    businessModule: businessModule || user.defaultModule,
  };
}

export async function getMe(userId) {
  const user = await User.findById(userId).populate("designationId");
  if (!user) throw AppError.unauthorized();

  const permissions = await resolveUserPermissions(user);
  const primary = await resolvePrimaryDesignation(user);

  return {
    user: {
      code: user.userId,
      name: user.name,
      role: user.userType === "admin" ? "Administrator" : user.userType,
      userType: user.userType,
      initials: user.initials,
      designationId: primary?._id?.toString(),
      designationName: primary?.name,
      designationIds: (user.designationIds || [])
        .map((d) => d?.toString?.())
        .filter(Boolean),
      clientId: user.clientId?.toString() || null,
      vendorId: user.vendorId?.toString() || null,
      dashboardProfile:
        user.userType === "admin"
          ? "executive"
          : user.userType === "vendor"
            ? "vendor"
            : primary?.dashboardProfile || "general",
    },
    permissions,
  };
}

export async function previewInvite(token) {
  const user = await User.findOne({ inviteToken: token });
  if (!user || !user.inviteTokenExpiresAt) {
    throw AppError.notFound("Invite link is invalid or expired");
  }
  if (user.inviteTokenExpiresAt < new Date()) {
    throw AppError.badRequest("Invite link has expired");
  }
  return {
    clientName: user.name,
    userId: user.userId,
    expiresAt: user.inviteTokenExpiresAt,
  };
}

export async function acceptInvite(token, password) {
  const user = await User.findOne({ inviteToken: token }).select(
    "+passwordHash",
  );
  if (!user || !user.inviteTokenExpiresAt) {
    throw AppError.notFound("Invite link is invalid or expired");
  }
  if (user.inviteTokenExpiresAt < new Date()) {
    throw AppError.badRequest("Invite link has expired");
  }
  if (!password || String(password).length < 6) {
    throw AppError.badRequest("Password must be at least 6 characters");
  }
  const redirectTo = user.inviteEnquiryId
    ? `/client/enquiries/${user.inviteEnquiryId}`
    : "/client/dashboard";

  user.passwordHash = await bcrypt.hash(password, 12);
  user.inviteToken = undefined;
  user.inviteTokenExpiresAt = undefined;
  user.inviteEnquiryId = undefined;
  user.status = "Active";
  await user.save();

  const permissions = await resolveUserPermissions(user);
  const primary = await resolvePrimaryDesignation(user);
  const jwtToken = signToken(user, "residential");

  return {
    token: jwtToken,
    user: {
      code: user.userId,
      name: user.name,
      role: "client",
      initials: user.initials,
      userType: "client",
      clientId: user.clientId?.toString() || null,
      dashboardProfile: "general",
      designationName: primary?.name || null,
    },
    permissions,
    redirectTo,
  };
}
