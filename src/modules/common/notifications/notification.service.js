import { env } from "../../../config/env.js";
import NotificationLog from "./notificationLog.model.js";

function normalizePhone(mobile) {
  if (!mobile) return null;
  const digits = String(mobile).replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
}

async function logNotification(entry) {
  const doc = await NotificationLog.create(entry);
  if (env.nodeEnv !== "test") {
    console.log(
      `[notify:${entry.channel}] ${entry.template} → ${entry.recipient} (${entry.status})`,
    );
  }
  return doc;
}

async function trySendEmail({ to, subject, body }) {
  if (!env.notifyEmailEnabled || !to) {
    return { status: "skipped", reason: "email disabled or no recipient" };
  }
  // Placeholder for SMTP integration — logs until provider is configured
  return { status: "sent", provider: "console" };
}

async function trySendSms({ to, body }) {
  if (!env.notifySmsEnabled || !to) {
    return { status: "skipped", reason: "sms disabled or no recipient" };
  }
  return { status: "sent", provider: "console" };
}

/**
 * Notify client when a quotation is sent for review.
 */
export async function notifyQuotationSent({ enquiry, quotation }) {
  const clientName = enquiry?.name || "Client";
  const clientEmail = enquiry?.email;
  const clientMobile = enquiry?.mobile;
  const code = quotation?.code || "Quotation";
  const amount = quotation?.grandTotal || quotation?.amount || "";
  const portalHint = env.appPublicUrl
    ? `Review it in your portal: ${env.appPublicUrl}/client/dashboard`
    : "Log in to the Complete Home client portal to review.";

  const subject = `Quotation ${code} ready for your review`;
  const body = `Dear ${clientName},

Your quotation ${code} (${amount}) has been sent for your review.

${portalHint}

Thank you,
Complete Home`;

  const smsBody = `Complete Home: Quotation ${code} (${amount}) is ready for review. ${env.appPublicUrl || "Check your client portal"}.`;

  const results = [];

  if (clientEmail) {
    const emailResult = await trySendEmail({
      to: clientEmail,
      subject,
      body,
    });
    results.push(
      await logNotification({
        channel: "email",
        template: "quotation_sent",
        recipient: clientEmail,
        subject,
        body,
        status: emailResult.status === "sent" ? "sent" : "skipped",
        meta: { enquiryId: enquiry?._id?.toString(), quotationCode: code },
      }),
    );
  }

  const phone = normalizePhone(clientMobile);
  if (phone) {
    const smsResult = await trySendSms({ to: phone, body: smsBody });
    results.push(
      await logNotification({
        channel: "sms",
        template: "quotation_sent",
        recipient: phone,
        body: smsBody,
        status: smsResult.status === "sent" ? "sent" : "skipped",
        meta: { enquiryId: enquiry?._id?.toString(), quotationCode: code },
      }),
    );
  }

  if (!clientEmail && !phone) {
    results.push(
      await logNotification({
        channel: "log",
        template: "quotation_sent",
        recipient: enquiry?._id?.toString() || "unknown",
        subject,
        body,
        status: "skipped",
        meta: { reason: "no client email or mobile on enquiry" },
      }),
    );
  }

  return results;
}

/** Notify client with magic-link invite to portal. */
export async function notifyClientInvite({ enquiry, user, inviteLink }) {
  const clientName = user?.name || enquiry?.name || "Client";
  const clientEmail = user?.email || enquiry?.email;
  const clientMobile = user?.mobile || enquiry?.mobile;
  const subject = "You're invited to Complete Home client portal";
  const body = `Dear ${clientName},

Use this secure link to set your password and access your project (valid 7 days):

${inviteLink}

Thank you,
Complete Home`;
  const smsBody = `Complete Home: Set up your client portal: ${inviteLink}`;

  const results = [];
  if (clientEmail) {
    await trySendEmail({ to: clientEmail, subject, body });
    results.push(
      await logNotification({
        channel: "email",
        template: "client_invite",
        recipient: clientEmail,
        subject,
        body,
        status: env.notifyEmailEnabled ? "sent" : "skipped",
        meta: { enquiryId: enquiry?._id?.toString(), inviteLink },
      }),
    );
  }
  const phone = normalizePhone(clientMobile);
  if (phone) {
    await trySendSms({ to: phone, body: smsBody });
    results.push(
      await logNotification({
        channel: "sms",
        template: "client_invite",
        recipient: phone,
        body: smsBody,
        status: env.notifySmsEnabled ? "sent" : "skipped",
        meta: { enquiryId: enquiry?._id?.toString() },
      }),
    );
  }
  if (!clientEmail && !phone) {
    results.push(
      await logNotification({
        channel: "log",
        template: "client_invite",
        recipient: inviteLink,
        subject,
        body,
        status: "skipped",
        meta: { reason: "no email/mobile — copy link manually" },
      }),
    );
  }
  return results;
}

/** Log when a payment link is created (payment due reminder). */
export async function notifyPaymentDue({ enquiry, amount, paymentLink }) {
  const clientName = enquiry?.name || "Client";
  const clientEmail = enquiry?.email;
  const clientMobile = enquiry?.mobile;
  const subject = "Payment request — Complete Home";
  const body = `Dear ${clientName},

A payment of ${amount} is requested.

${paymentLink ? `Pay or review: ${paymentLink}` : "See your client portal for details."}

Thank you,
Complete Home`;
  const smsBody = `Complete Home: Payment ${amount} due. ${paymentLink || env.appPublicUrl}`;

  const results = [];
  if (clientEmail) {
    await trySendEmail({ to: clientEmail, subject, body });
    results.push(
      await logNotification({
        channel: "email",
        template: "payment_due",
        recipient: clientEmail,
        subject,
        body,
        status: env.notifyEmailEnabled ? "sent" : "skipped",
        meta: { enquiryId: enquiry?._id?.toString(), amount },
      }),
    );
  }
  const phone = normalizePhone(clientMobile);
  if (phone) {
    await trySendSms({ to: phone, body: smsBody });
    results.push(
      await logNotification({
        channel: "sms",
        template: "payment_due",
        recipient: phone,
        body: smsBody,
        status: env.notifySmsEnabled ? "sent" : "skipped",
        meta: { enquiryId: enquiry?._id?.toString() },
      }),
    );
  }
  return results;
}
