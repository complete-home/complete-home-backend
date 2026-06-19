import crypto from "crypto";
import bcrypt from "bcryptjs";
import { env } from "../../../config/env.js";
import AppError from "../../../core/errors/AppError.js";
import { nextCode } from "../../../core/counters/counter.service.js";
import { getInitials } from "../../../core/http/formatHelpers.js";
import { Client } from "../../common/masters/master.model.js";
import { notifyClientInvite } from "../../common/notifications/notification.service.js";
import User from "../../user-management/users/user.model.js";
import Enquiry from "./enquiry.model.js";
import EnquiryActivity from "./enquiryActivity.model.js";

export async function createClientInvite(enquiryId, actor) {
  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) throw AppError.notFound("Enquiry not found");
  if (!enquiry.email && !enquiry.mobile) {
    throw AppError.badRequest(
      "Enquiry needs email or mobile to send a client invite",
    );
  }

  let client = null;
  if (enquiry.clientId) {
    client = await Client.findById(enquiry.clientId);
  }
  if (!client && enquiry.email) {
    client = await Client.findOne({
      email: enquiry.email.toLowerCase(),
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  let user = await User.findOne({
    userType: "client",
    $or: [
      ...(client?._id ? [{ clientId: client._id }] : []),
      ...(enquiry.email ? [{ email: enquiry.email.toLowerCase() }] : []),
    ],
  });

  const placeholderPassword = crypto.randomBytes(12).toString("hex");
  const passwordHash = await bcrypt.hash(placeholderPassword, 12);

  if (!user) {
    const userId = await nextCode("CLTUSR", "CLTUSR", 4, 2206);
    user = await User.create({
      userId,
      passwordHash,
      name: enquiry.name,
      email: enquiry.email?.toLowerCase() || "",
      mobile: enquiry.mobile || "",
      userType: "client",
      clientId: client?._id || null,
      initials: enquiry.initials || getInitials(enquiry.name),
      status: "Active",
      defaultModule: "residential",
      inviteToken: token,
      inviteTokenExpiresAt: expires,
      inviteEnquiryId: enquiryId,
    });
  } else {
    user.inviteToken = token;
    user.inviteTokenExpiresAt = expires;
    user.inviteEnquiryId = enquiryId;
    await user.save();
  }

  const inviteLink = `${env.appPublicUrl}/accept-invite?token=${encodeURIComponent(token)}`;

  await notifyClientInvite({ enquiry, user, inviteLink });
  await EnquiryActivity.create({
    enquiryId,
    type: "invite",
    title: "Client portal invite sent",
    detail: inviteLink,
    at: new Date().toISOString(),
  });

  return {
    inviteLink,
    expiresAt: expires,
    clientUserId: user.userId,
    clientName: user.name,
  };
}
