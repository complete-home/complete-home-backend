import AppError from "../../../core/errors/AppError.js";
import { amountNumericFromInput } from "../../../core/utils/money.js";
import { Messages } from "../../../core/http/messages.js";
import { nextCode } from "../../../core/counters/counter.service.js";
import { getInitials } from "../../../core/http/formatHelpers.js";
import {
  getEnquiryQuotation,
  listEnquiryQuotations,
} from "../quotations/quotation.service.js";
import Enquiry, { ENQUIRY_STATUSES } from "./enquiry.model.js";
import EnquiryActivity from "./enquiryActivity.model.js";
import EnquiryFollowUp from "./enquiryFollowUp.model.js";
import { markOverdueFollowUps } from "./followUpOverdue.service.js";
import { mergeGstFromBody } from "../../../core/utils/indiaGst.js";
import EnquiryAppointment from "./enquiryAppointment.model.js";
import EnquiryPayment from "./enquiryPayment.model.js";
import Quotation from "../quotations/quotation.model.js";
import Project from "../projects/project.model.js";
import {
  formatEnquiry,
  formatEnquiryDetailAggregate,
  formatFollowUp,
} from "./enquiry.formatter.js";

async function logActivity(
  enquiryId,
  title,
  desc,
  actor = "EMPLOYEE - System",
) {
  await EnquiryActivity.create({ enquiryId, title, desc, actor });
}

export async function logEnquiryActivity(enquiryId, title, desc, actor) {
  return logActivity(enquiryId, title, desc, actor);
}

function buildAddress(body) {
  return (
    body.fullAddress?.trim() ||
    body.address?.trim() ||
    [body.building, body.area, body.city, body.state].filter(Boolean).join(", ")
  );
}

async function attachRegisterSummaries(items) {
  if (!items.length) return items;
  const ids = items.map((i) => i._id);
  const [appointments, paymentAgg, quotations, projects] = await Promise.all([
    EnquiryAppointment.find({ enquiryId: { $in: ids } }).lean(),
    EnquiryPayment.aggregate([
      { $match: { enquiryId: { $in: ids } } },
      {
        $group: {
          _id: "$enquiryId",
          total: { $sum: { $ifNull: ["$amountNumeric", 0] } },
          count: { $sum: 1 },
        },
      },
    ]),
    Quotation.find({ enquiryId: { $in: ids }, isPrimary: true }).lean(),
    Project.find({ enquiryId: { $in: ids } })
      .select("_id enquiryId code")
      .lean(),
  ]);

  const apptByEnquiry = Object.fromEntries(
    appointments.map((a) => [a.enquiryId.toString(), a]),
  );
  const payByEnquiry = Object.fromEntries(
    paymentAgg.map((p) => [p._id.toString(), p]),
  );
  const quotByEnquiry = Object.fromEntries(
    quotations.map((q) => [q.enquiryId.toString(), q]),
  );
  const projByEnquiry = Object.fromEntries(
    projects.map((p) => [p.enquiryId.toString(), p]),
  );

  return items.map((row) => {
    const id = row._id.toString();
    const appt = apptByEnquiry[id];
    const pay = payByEnquiry[id];
    const quot = quotByEnquiry[id];
    const proj = projByEnquiry[id];
    const visitAt = appt?.startAt || null;
    return formatEnquiry({
      ...row,
      register: {
        visitDate: visitAt,
        visitWhen: appt?.when || "",
        quotationStatus: quot?.status || "",
        quotationDone: ["Approved", "Sent"].includes(quot?.status || ""),
        advancePaid: pay?.total || 0,
        advanceCount: pay?.count || 0,
        projectId: proj?._id?.toString?.() || null,
        projectCode: proj?.code || "",
      },
    });
  });
}

export async function listEnquiries({
  moduleId,
  search,
  status,
  source,
  talkingPoint,
  salesHeadId,
  projectHeadId,
  month,
  page = 1,
  limit = 100,
}) {
  const filter = {};
  if (moduleId) filter.businessModule = moduleId;
  if (status && status !== "all") filter.status = status;
  if (source && source !== "all") filter.source = source;
  if (talkingPoint && talkingPoint !== "all") {
    filter.talkingPoint = new RegExp(
      talkingPoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
  }
  if (salesHeadId) filter.salesHeadId = salesHeadId;
  if (projectHeadId) filter.projectHeadId = projectHeadId;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    filter.createdAt = { $gte: start, $lt: end };
  }
  if (search?.trim()) {
    const q = search.trim();
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { name: re },
      { code: re },
      { mobile: re },
      { email: re },
      { fullAddress: re },
      { talkingPoint: re },
      { workType: re },
    ];
  }

  const skip = Math.max(0, (Number(page) - 1) * Number(limit));
  const [rows, total] = await Promise.all([
    Enquiry.find(filter)
      .populate("salesHeadId", "name userId")
      .populate("projectHeadId", "name userId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Enquiry.countDocuments(filter),
  ]);

  const items = await attachRegisterSummaries(rows);

  return {
    items,
    meta: { total, page: Number(page), limit: Number(limit) },
  };
}

export async function getEnquiryById(id) {
  const row = await Enquiry.findById(id)
    .populate("salesHeadId", "name userId")
    .populate("projectHeadId", "name userId")
    .lean();
  if (!row) throw AppError.notFound(Messages.enquiry.notFound);
  const [formatted] = await attachRegisterSummaries([row]);
  return formatted;
}

export async function getEnquiryDetail(id, quotationId) {
  const enquiry = await Enquiry.findById(id);
  if (!enquiry) throw AppError.notFound(Messages.enquiry.notFound);

  await markOverdueFollowUps({ enquiryId: id });

  const [activityLogs, followUps, appointment, payments] = await Promise.all([
    EnquiryActivity.find({ enquiryId: id }).sort({ createdAt: -1 }),
    EnquiryFollowUp.find({ enquiryId: id }).sort({ createdAt: -1 }),
    EnquiryAppointment.findOne({ enquiryId: id }),
    EnquiryPayment.find({ enquiryId: id }).sort({ createdAt: -1 }),
  ]);

  const [quotations, quotation] = await Promise.all([
    listEnquiryQuotations(id),
    getEnquiryQuotation(id, quotationId),
  ]);

  const aggregate = await formatEnquiryDetailAggregate(enquiry, {
    activityLogs,
    followUps,
    appointment,
    payments,
    quotations,
    quotation,
  });
  const { enquiry: _e, ...detail } = aggregate;
  return detail;
}

export async function createEnquiry(body, user) {
  const code = await nextCode("ENQ", "ENQ-", 4, 1042);
  const workType = body.workType || body.service || "";
  const addr = buildAddress(body);
  const enquiry = await Enquiry.create({
    code,
    name: body.name,
    mobile: body.mobile,
    email: body.email || "",
    pincode: body.pincode || "",
    building: body.building || "",
    area: body.area || "",
    state: body.state || "",
    city: body.city || "",
    address: addr,
    fullAddress: addr,
    source: body.source || "Manual",
    service: body.service || workType,
    workType,
    requirements: body.requirements || "",
    status: body.status || "New Enquiry",
    businessModule: body.businessModule || "residential",
    initials: body.initials || getInitials(body.name),
    branchId: body.branchId,
    clientId: body.clientId,
    assigneeIds: body.assigneeIds || [],
    salesHeadId: body.salesHeadId || undefined,
    projectHeadId: body.projectHeadId || undefined,
    talkingPoint: body.talkingPoint || "",
    talkingPointUpdatedAt: body.talkingPoint ? new Date() : undefined,
    toolkitDone: !!body.toolkitDone,
    qualificationOutcome: body.qualificationOutcome || "",
    budget: body.budget,
    projectType: body.projectType,
  });

  if (body.talkingPoint?.trim()) {
    const EnquiryTalkingPointLog = (
      await import("./enquiryTalkingPointLog.model.js")
    ).default;
    await EnquiryTalkingPointLog.create({
      enquiryId: enquiry._id,
      note: body.talkingPoint.trim(),
      talkingPoint: body.talkingPoint.trim(),
      createdById: user?._id,
      createdByName: user?.name || "Staff",
    });
  }

  await logActivity(
    enquiry._id,
    "Enquiry Created",
    "Enquiry received from manual entry",
    user?.name ? `EMPLOYEE - ${user.name}` : undefined,
  );

  return getEnquiryById(enquiry._id.toString());
}

export async function updateEnquiry(id, body) {
  const allowed = [
    "name",
    "mobile",
    "email",
    "pincode",
    "building",
    "area",
    "state",
    "city",
    "address",
    "fullAddress",
    "source",
    "service",
    "workType",
    "requirements",
    "budget",
    "projectType",
    "status",
    "talkingPoint",
    "salesHeadId",
    "projectHeadId",
    "toolkitDone",
    "qualificationOutcome",
    "clientId",
    "assigneeIds",
  ];
  const patch = {};
  for (const k of allowed) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  if (body.workType !== undefined) {
    patch.workType = body.workType;
    if (!body.service) patch.service = body.workType;
  }
  if (
    body.fullAddress !== undefined ||
    body.address !== undefined ||
    body.building !== undefined
  ) {
    patch.fullAddress = buildAddress({ ...body, ...patch });
    patch.address = patch.fullAddress;
  }
  if (patch.talkingPoint !== undefined) {
    patch.talkingPointUpdatedAt = new Date();
  }
  if (patch.status && !ENQUIRY_STATUSES.includes(patch.status)) {
    throw AppError.badRequest(
      `Invalid status. Allowed: ${ENQUIRY_STATUSES.join(", ")}`,
    );
  }
  if (patch.name) patch.initials = getInitials(patch.name);
  const enquiry = await Enquiry.findByIdAndUpdate(id, patch, { new: true })
    .populate("salesHeadId", "name userId")
    .populate("projectHeadId", "name userId");
  if (!enquiry) throw AppError.notFound(Messages.enquiry.notFound);
  await logActivity(id, "Enquiry updated", "Details were updated");
  const [formatted] = await attachRegisterSummaries([enquiry.toObject()]);
  return formatted;
}

export async function updateEnquiryStatus(id, status) {
  if (!ENQUIRY_STATUSES.includes(status)) {
    throw AppError.badRequest(
      `Invalid status. Allowed: ${ENQUIRY_STATUSES.join(", ")}`,
    );
  }
  const enquiry = await Enquiry.findByIdAndUpdate(
    id,
    { status },
    { new: true },
  );
  if (!enquiry) throw AppError.notFound(Messages.enquiry.notFound);
  await logActivity(id, "Enquiry updated", `Status changed to ${status}`);

  if (status === "Deal") {
    const { convertEnquiryToProject } =
      await import("../projects/project.service.js");
    await convertEnquiryToProject(id, {});
  }

  return formatEnquiry(enquiry);
}

export async function addFollowUp(enquiryId, body) {
  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) throw AppError.notFound(Messages.enquiry.notFound);

  const channelMap = { call: "Call", whatsapp: "WhatsApp", email: "Email" };
  const type = body.type || "call";
  const scheduledAt =
    [body.date, body.time].filter(Boolean).join(" at ") ||
    body.scheduledAt ||
    "—";

  await EnquiryFollowUp.create({
    enquiryId,
    type,
    channel: channelMap[type] || type,
    scheduledAt,
    note: body.notes || body.note || "",
    status: "Scheduled",
    assignedIds: body.assigned || body.assignedIds || [],
    date: body.date,
    time: body.time,
  });

  await logActivity(
    enquiryId,
    "Follow-up Created",
    `Follow-up scheduled via ${channelMap[type] || type}`,
  );

  return getEnquiryDetail(enquiryId);
}

export async function upsertAppointment(enquiryId, body) {
  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) throw AppError.notFound(Messages.enquiry.notFound);

  const payload = {
    title: body.title || "Site visit",
    when: body.when || body.startAt || "To be scheduled",
    mode: body.mode,
    visitAddress: body.visitAddress || enquiry.fullAddress || enquiry.address,
    landmark: body.landmark,
    agenda: body.agenda,
    mapLink: body.mapLink,
    visitingType: body.visitingType,
    visitingCharges: body.visitingCharges,
    assignee: body.assignee,
    assigneeInitials: body.assigneeInitials,
    assigneeId: body.assigneeId,
    startAt: body.startAt ? new Date(body.startAt) : undefined,
    endAt: body.endAt ? new Date(body.endAt) : undefined,
    status: body.status || "Scheduled",
    visitPurpose: body.visitPurpose,
    workManagerLabel: body.workManagerLabel,
    siteWorkerLabel: body.siteWorkerLabel,
    projectHeadLabel: body.projectHeadLabel,
    visitReportNotes: body.visitReportNotes,
  };

  await EnquiryAppointment.findOneAndUpdate(
    { enquiryId },
    { ...payload, enquiryId },
    { upsert: true, new: true },
  );

  await logActivity(enquiryId, "Appointment updated", payload.when);

  return getEnquiryDetail(enquiryId);
}

export async function addPayment(enquiryId, body) {
  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) throw AppError.notFound(Messages.enquiry.notFound);

  const amountStr = body.amount || "₹0";
  const parsed = amountNumericFromInput(amountStr);
  const gst = mergeGstFromBody(body, parsed);
  const total = gst.totalAmount ?? parsed;
  await EnquiryPayment.create({
    enquiryId,
    amount: amountStr.startsWith("₹") ? amountStr : `₹${total}`,
    amountNumeric: total,
    paymentType: body.paymentType,
    paymentMode: body.paymentMode,
    paymentDate: body.paymentDate,
    bankName: body.bankName,
    referenceNumber: body.referenceNumber,
    receiptUrl: body.receiptUrl || "",
    status: body.status || "Completed",
    ...gst,
  });

  await logActivity(
    enquiryId,
    "Payment recorded",
    `Amount ${body.amount || "—"}`,
  );

  return getEnquiryDetail(enquiryId);
}

const FOLLOW_UP_STATUSES = ["Scheduled", "Completed", "Overdue", "Cancelled"];

export async function updateFollowUp(enquiryId, followUpId, body) {
  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) throw AppError.notFound(Messages.enquiry.notFound);

  const fu = await EnquiryFollowUp.findOne({ _id: followUpId, enquiryId });
  if (!fu) throw AppError.notFound("Follow-up not found");

  if (body.status !== undefined) {
    if (!FOLLOW_UP_STATUSES.includes(body.status)) {
      throw AppError.badRequest(
        `Invalid status. Allowed: ${FOLLOW_UP_STATUSES.join(", ")}`,
      );
    }
    fu.status = body.status;
  }
  if (body.note !== undefined) fu.note = body.note;
  if (body.date !== undefined) fu.date = body.date;
  if (body.time !== undefined) fu.time = body.time;
  if (body.date || body.time) {
    fu.scheduledAt = [fu.date, fu.time].filter(Boolean).join(" at ");
  }
  await fu.save();

  await logActivity(enquiryId, "Follow-up updated", `Status: ${fu.status}`);
  return getEnquiryDetail(enquiryId);
}

export async function deleteFollowUp(enquiryId, followUpId) {
  const result = await EnquiryFollowUp.findOneAndDelete({
    _id: followUpId,
    enquiryId,
  });
  if (!result) throw AppError.notFound("Follow-up not found");
  await logActivity(enquiryId, "Follow-up deleted", "Removed from schedule");
  return getEnquiryDetail(enquiryId);
}

export async function createPaymentLink(enquiryId, body) {
  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) throw AppError.notFound(Messages.enquiry.notFound);

  const amount = body.amount || "₹0";
  const paymentLink =
    body.paymentLink ||
    `https://pay.completehome.demo/e/${enquiryId}?amount=${encodeURIComponent(String(amount).replace(/[^\d.]/g, "") || "0")}`;

  await EnquiryPayment.create({
    enquiryId,
    amount,
    amountNumeric: amountNumericFromInput(amount),
    paymentType: body.paymentType || "Advance",
    status: "Pending",
    paymentLink,
    description: body.description || "",
    clientStatus: "pending_confirmation",
  });

  await logActivity(enquiryId, "Payment link created", amount);

  try {
    const { notifyPaymentDue } =
      await import("../../common/notifications/notification.service.js");
    await notifyPaymentDue({ enquiry, amount, paymentLink });
  } catch {
    /* notification optional */
  }

  return { paymentLink, amount };
}

export async function paymentClientAction(enquiryId, paymentId, payload, user) {
  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) throw AppError.notFound(Messages.enquiry.notFound);

  const payment = await EnquiryPayment.findOne({ _id: paymentId, enquiryId });
  if (!payment) throw AppError.notFound("Payment not found");

  const { action, comment = "" } = payload;
  const trimmedComment = String(comment || "").trim();

  if (payment.clientStatus !== "pending_confirmation") {
    throw AppError.badRequest(
      "This payment is not awaiting client confirmation.",
    );
  }

  const actorName = user?.name || user?.userId || "Client";

  if (action === "confirm") {
    payment.clientStatus = "confirmed";
    payment.status = "Completed";
    payment.clientComment = trimmedComment;
    payment.clientActionHistory.push({
      action: "confirm",
      comment: trimmedComment,
      actorName,
    });
    await payment.save();
    await logActivity(
      enquiryId,
      "Payment confirmed by client",
      trimmedComment || payment.amount,
    );
    return getEnquiryDetail(enquiryId);
  }

  if (action === "dispute") {
    if (!trimmedComment) {
      throw AppError.badRequest("Please describe the issue with this payment.");
    }
    payment.clientStatus = "disputed";
    payment.status = "Disputed";
    payment.clientComment = trimmedComment;
    payment.clientActionHistory.push({
      action: "dispute",
      comment: trimmedComment,
      actorName,
    });
    await payment.save();
    await logActivity(enquiryId, "Payment disputed by client", trimmedComment);
    return getEnquiryDetail(enquiryId);
  }

  throw AppError.badRequest(`Unknown payment action: ${action}`);
}
