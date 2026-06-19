function formatActivity(log) {
  return {
    id: log._id.toString(),
    actor: log.actor,
    time: log.time || formatDisplayDate(log.createdAt),
    title: log.title,
    desc: log.desc,
  };
}

function formatDisplayDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function userLabel(ref) {
  if (!ref) return "";
  if (typeof ref === "string") return "";
  return ref.name || ref.userId || "";
}

export function formatEnquiry(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const fullAddress =
    o.fullAddress ||
    o.address ||
    [o.building, o.area, o.city, o.state].filter(Boolean).join(", ");
  return {
    id: o._id.toString(),
    code: o.code,
    name: o.name,
    mobile: o.mobile,
    email: o.email,
    pincode: o.pincode,
    building: o.building,
    area: o.area,
    state: o.state,
    city: o.city,
    address: o.address,
    fullAddress,
    source: o.source,
    service: o.service,
    workType: o.workType || o.service || "",
    requirements: o.requirements,
    status: o.status,
    businessModule: o.businessModule,
    initials: o.initials,
    budget: o.budget,
    projectType: o.projectType,
    talkingPoint: o.talkingPoint || "",
    talkingPointUpdatedAt: o.talkingPointUpdatedAt,
    salesHeadId: o.salesHeadId?.toString?.() || o.salesHeadId || null,
    projectHeadId: o.projectHeadId?.toString?.() || o.projectHeadId || null,
    salesHeadName: userLabel(o.salesHeadId),
    projectHeadName: userLabel(o.projectHeadId),
    toolkitDone: !!o.toolkitDone,
    qualificationOutcome: o.qualificationOutcome || "",
    clientId: o.clientId?.toString?.() || o.clientId || null,
    assigneeIds: (o.assigneeIds || []).map((id) => id?.toString?.() || id),
    register: o.register || undefined,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export function formatFollowUp(fu) {
  const o = fu.toObject ? fu.toObject() : fu;
  const channelMap = { call: "Call", whatsapp: "WhatsApp", email: "Email" };
  return {
    id: o._id.toString(),
    channel: o.channel || channelMap[o.type] || o.type,
    scheduledAt: o.scheduledAt,
    note: o.note,
    createdAt: formatDisplayDate(o.createdAt),
    status: o.status,
  };
}

export function formatAppointment(ap) {
  if (!ap) return null;
  const o = ap.toObject ? ap.toObject() : ap;
  return {
    id: o._id?.toString?.(),
    title: o.title,
    when: o.when,
    startAt: o.startAt,
    endAt: o.endAt,
    createdAt: formatDisplayDate(o.createdAt),
    assignee: o.assignee,
    assigneeInitials: o.assigneeInitials,
    status: o.status,
    mode: o.mode,
    visitingType: o.visitingType,
    visitingCharges: o.visitingCharges,
    landmark: o.landmark,
    agenda: o.agenda,
    mapLink: o.mapLink,
    visitAddress: o.visitAddress,
    visitPurpose: o.visitPurpose,
    workManagerLabel: o.workManagerLabel,
    siteWorkerLabel: o.siteWorkerLabel,
    projectHeadLabel: o.projectHeadLabel,
    visitReportNotes: o.visitReportNotes,
  };
}

export function formatPayment(p) {
  const o = p.toObject ? p.toObject() : p;
  return {
    id: o._id.toString(),
    amount: o.amount,
    status: o.status,
    date: o.paymentDate || o.createdAt?.toISOString?.()?.slice(0, 10),
    paymentType: o.paymentType,
    paymentMode: o.paymentMode,
    paymentLink: o.paymentLink,
    clientStatus: o.clientStatus || "none",
    clientComment: o.clientComment || "",
    canClientConfirm:
      o.clientStatus === "pending_confirmation" && o.status === "Pending",
    canClientDispute:
      o.clientStatus === "pending_confirmation" && o.status === "Pending",
  };
}

export function buildFollowUpStats(followUps) {
  const list = followUps || [];
  return {
    total: list.length,
    scheduled: list.filter((f) => f.status === "Scheduled").length,
    completed: list.filter((f) => f.status === "Completed").length,
    overdue: list.filter((f) => f.status === "Overdue").length,
  };
}

export async function formatEnquiryDetailAggregate(enquiry, extras) {
  const {
    activityLogs,
    followUps,
    appointment,
    payments,
    quotation,
    quotations = [],
  } = extras;
  return {
    enquiry: formatEnquiry(enquiry),
    activityLog: activityLogs.map(formatActivity),
    followUps: followUps.map(formatFollowUp),
    followUpStats: buildFollowUpStats(followUps.map((f) => formatFollowUp(f))),
    appointment: formatAppointment(appointment),
    quotations,
    quotation: quotation || null,
    payments: payments.map(formatPayment),
  };
}
