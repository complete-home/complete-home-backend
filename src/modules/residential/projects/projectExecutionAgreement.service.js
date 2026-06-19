import AppError from "../../../core/errors/AppError.js";
import { docId } from "../../../core/http/formatHelpers.js";
import { paymentAmountNumeric, roundMoney } from "../../../core/utils/money.js";
import { Company } from "../../common/organization/organization.model.js";
import Enquiry from "../enquiries/enquiry.model.js";
import EnquiryPayment from "../enquiries/enquiryPayment.model.js";
import Project from "./project.model.js";
import ProjectAgreement from "./projectAgreement.model.js";
import ProjectExecutionAgreement from "./projectExecutionAgreement.model.js";
import {
  DEFAULT_AGREEMENT_STATUSES,
  DEFAULT_APPROVED_TRADES,
  DEFAULT_PENALTY_PER_MONTH,
  DEFAULT_SUBCONTRACTOR_SCHEDULE,
  DEFAULT_WARRANTY_YEARS,
  DEFAULT_WORK_DURATION_MONTHS,
} from "./projectAgreement.constants.js";

function sumSqftLines(lines) {
  return (lines || []).reduce((s, l) => s + (Number(l.amount) || 0), 0);
}

function computeMilestoneAmounts(total, milestones) {
  return (milestones || []).map((m) => ({
    ...m,
    amount: roundMoney((total * (m.percent || 0)) / 100),
  }));
}

async function fetchLinkedPayments(enquiryId) {
  if (!enquiryId) return [];
  const payments = await EnquiryPayment.find({ enquiryId }).sort({
    createdAt: -1,
  });
  return payments.map((p) => ({
    id: p._id.toString(),
    amount: p.amount,
    amountNumeric: paymentAmountNumeric(p),
    paymentType: p.paymentType || "",
    status: p.status,
    completed: p.status === "Completed" && p.clientStatus !== "disputed",
  }));
}

function formatExecutionAgreement(doc, linkedPayments = []) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: docId(o),
    projectId: o.projectId?.toString?.() || o.projectId,
    status: o.status,
    agreementDate: o.agreementDate,
    clientParty: o.clientParty || {},
    consultantParty: o.consultantParty || {},
    siteAddress: o.siteAddress,
    workStartDate: o.workStartDate,
    workDurationMonths: o.workDurationMonths,
    contractValueTotal: o.contractValueTotal,
    penaltyPerMonth: o.penaltyPerMonth,
    warrantyYears: o.warrantyYears,
    clientMilestones: o.clientMilestones || [],
    statusOptions: o.statusOptions?.length
      ? o.statusOptions
      : DEFAULT_AGREEMENT_STATUSES,
    useSqftPricing: !!o.useSqftPricing,
    sqftLines: o.sqftLines || [],
    assigneeType: o.assigneeType || "",
    assigneeId: o.assigneeId?.toString?.() || o.assigneeId || null,
    assigneeName: o.assigneeName || "",
    subcontractorSchedule: o.subcontractorSchedule || [],
    approvedTrades: o.approvedTrades || [],
    scopeNotes: o.scopeNotes || "",
    notes: o.notes || "",
    linkedPayments,
    clientSignedAt: o.clientSignedAt,
    consultantSignedAt: o.consultantSignedAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

async function loadProjectContext(projectId) {
  const project = await Project.findById(projectId);
  if (!project) throw AppError.notFound("Project not found");

  const [company, enquiry, legacyOp] = await Promise.all([
    Company.findOne({ singletonKey: "default" }).lean(),
    project.enquiryId ? Enquiry.findById(project.enquiryId).lean() : null,
    ProjectAgreement.findOne({ projectId }).lean(),
  ]);

  return { project, company, enquiry, legacyOp };
}

function buildDefaultExecution(project, company, enquiry, legacyOp) {
  const contractTotal = 0;
  const base = {
    projectId: project._id,
    status: "draft",
    agreementDate: "",
    clientParty: {
      name: enquiry?.name || project.client || "",
      address: enquiry?.address || project.siteAddress || "",
      phone: enquiry?.mobile || project.clientPhone || "",
    },
    consultantParty: {
      name: "",
      company: company?.name || "Complete Home",
      address: [company?.address, company?.area, company?.city]
        .filter(Boolean)
        .join(", "),
      phone: company?.mobile || "",
    },
    siteAddress: project.siteAddress || enquiry?.address || "",
    workStartDate: legacyOp?.workStartDate || "",
    workDurationMonths:
      legacyOp?.workDurationMonths ?? DEFAULT_WORK_DURATION_MONTHS,
    contractValueTotal: contractTotal,
    penaltyPerMonth: legacyOp?.penaltyPerMonth ?? DEFAULT_PENALTY_PER_MONTH,
    warrantyYears: legacyOp?.warrantyYears ?? DEFAULT_WARRANTY_YEARS,
    clientMilestones: computeMilestoneAmounts(contractTotal, []),
    statusOptions: [...DEFAULT_AGREEMENT_STATUSES],
    useSqftPricing: false,
    sqftLines: [],
    assigneeType: "",
    assigneeId: null,
    assigneeName: "",
    scopeNotes:
      "Turnkey execution — all materials, cement, labour, and site delivery.",
    notes: "",
  };

  if (legacyOp) {
    base.subcontractorSchedule = (
      legacyOp.subcontractorSchedule || DEFAULT_SUBCONTRACTOR_SCHEDULE
    ).map((s) => ({ ...s }));
    base.approvedTrades = (
      legacyOp.approvedTrades || DEFAULT_APPROVED_TRADES
    ).map((t) => ({ ...t }));
    if (legacyOp.clientParty?.name) {
      base.clientParty = { ...legacyOp.clientParty };
    }
    if (legacyOp.consultantParty) {
      base.consultantParty = { ...legacyOp.consultantParty };
    }
  } else {
    base.subcontractorSchedule = DEFAULT_SUBCONTRACTOR_SCHEDULE.map((s) => ({
      ...s,
    }));
    base.approvedTrades = DEFAULT_APPROVED_TRADES.map((t) => ({ ...t }));
  }

  return base;
}

export async function getProjectExecutionAgreement(projectId) {
  const { project } = await loadProjectContext(projectId);
  let doc = await ProjectExecutionAgreement.findOne({ projectId });
  if (!doc) {
    const { company, enquiry, legacyOp } = await loadProjectContext(projectId);
    doc = await ProjectExecutionAgreement.create(
      buildDefaultExecution(project, company, enquiry, legacyOp),
    );
  }

  const linkedPayments = await fetchLinkedPayments(project.enquiryId);
  return formatExecutionAgreement(doc, linkedPayments);
}

export async function updateProjectExecutionAgreement(projectId, body) {
  const { project } = await loadProjectContext(projectId);
  let doc = await ProjectExecutionAgreement.findOne({ projectId });
  if (!doc) {
    const { company, enquiry, legacyOp } = await loadProjectContext(projectId);
    doc = await ProjectExecutionAgreement.create(
      buildDefaultExecution(project, company, enquiry, legacyOp),
    );
  }

  const useSqft =
    body.useSqftPricing !== undefined
      ? body.useSqftPricing
      : doc.useSqftPricing;
  const sqftLines =
    body.sqftLines !== undefined ? body.sqftLines : doc.sqftLines;

  let contractTotal =
    body.contractValueTotal !== undefined
      ? Number(body.contractValueTotal)
      : doc.contractValueTotal;

  if (useSqft && sqftLines?.length) {
    contractTotal = roundMoney(sumSqftLines(sqftLines));
  }

  let milestones =
    body.clientMilestones !== undefined
      ? body.clientMilestones
      : doc.clientMilestones;

  if (
    body.clientMilestones !== undefined ||
    body.contractValueTotal !== undefined ||
    useSqft
  ) {
    milestones = computeMilestoneAmounts(contractTotal, milestones).map(
      (m) => ({
        ...m,
        linkedPaymentId: m.linkedPaymentId || null,
      }),
    );
  }

  const patch = {
    status: body.status ?? doc.status,
    agreementDate: body.agreementDate ?? doc.agreementDate,
    clientParty: body.clientParty ?? doc.clientParty,
    consultantParty: body.consultantParty ?? doc.consultantParty,
    siteAddress: body.siteAddress ?? doc.siteAddress,
    workStartDate: body.workStartDate ?? doc.workStartDate,
    workDurationMonths: body.workDurationMonths ?? doc.workDurationMonths,
    contractValueTotal: contractTotal,
    penaltyPerMonth: body.penaltyPerMonth ?? doc.penaltyPerMonth,
    warrantyYears: body.warrantyYears ?? doc.warrantyYears,
    clientMilestones: milestones,
    statusOptions: body.statusOptions ?? doc.statusOptions,
    useSqftPricing: useSqft,
    sqftLines,
    assigneeType: body.assigneeType ?? doc.assigneeType,
    assigneeId: body.assigneeId ?? doc.assigneeId,
    assigneeName: body.assigneeName ?? doc.assigneeName,
    subcontractorSchedule:
      body.subcontractorSchedule ?? doc.subcontractorSchedule,
    approvedTrades: body.approvedTrades ?? doc.approvedTrades,
    scopeNotes: body.scopeNotes ?? doc.scopeNotes,
    notes: body.notes ?? doc.notes,
    clientSignedAt: body.clientSignedAt ?? doc.clientSignedAt,
    consultantSignedAt: body.consultantSignedAt ?? doc.consultantSignedAt,
  };

  const updated = await ProjectExecutionAgreement.findOneAndUpdate(
    { projectId },
    patch,
    { new: true },
  );

  if (body.siteAddress && body.siteAddress !== project.siteAddress) {
    await Project.findByIdAndUpdate(projectId, {
      siteAddress: body.siteAddress,
    });
  }

  if (body.status === "signed" || body.markPhaseComplete) {
    await Project.findByIdAndUpdate(projectId, {
      $set: { "phases.executionPct": 10 },
    });
  }

  const linkedPayments = await fetchLinkedPayments(project.enquiryId);
  return formatExecutionAgreement(updated, linkedPayments);
}
