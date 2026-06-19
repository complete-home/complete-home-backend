import AppError from "../../../core/errors/AppError.js";
import { docId } from "../../../core/http/formatHelpers.js";
import { paymentAmountNumeric, roundMoney } from "../../../core/utils/money.js";
import { Company } from "../../common/organization/organization.model.js";
import Enquiry from "../enquiries/enquiry.model.js";
import EnquiryPayment from "../enquiries/enquiryPayment.model.js";
import Project from "./project.model.js";
import ProjectAgreement from "./projectAgreement.model.js";
import {
  DEFAULT_AGREEMENT_STATUSES,
  DEFAULT_APPROVED_TRADES,
  DEFAULT_CLIENT_MILESTONES,
  DEFAULT_CONSULTANCY_FEE,
  DEFAULT_PENALTY_PER_MONTH,
  DEFAULT_SUBCONTRACTOR_SCHEDULE,
  DEFAULT_WARRANTY_YEARS,
  DEFAULT_WORK_DURATION_MONTHS,
} from "./projectAgreement.constants.js";

function computeMilestoneAmounts(total, milestones) {
  return milestones.map((m) => ({
    ...m,
    amount: roundMoney((total * (m.percent || 0)) / 100),
  }));
}

function sumSqftLines(lines) {
  return (lines || []).reduce(
    (s, l) => s + (Number(l.amount) || 0),
    0,
  );
}

function formatAgreement(doc, linkedPayments = []) {
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
    agreementKind: o.agreementKind || "operation_planning",
    useSqftPricing: !!o.useSqftPricing,
    sqftLines: o.sqftLines || [],
    consultancyFeeTotal: o.consultancyFeeTotal,
    penaltyPerMonth: o.penaltyPerMonth,
    warrantyYears: o.warrantyYears,
    clientMilestones: o.clientMilestones || [],
    subcontractorSchedule: o.subcontractorSchedule || [],
    approvedTrades: o.approvedTrades || [],
    statusOptions: o.statusOptions?.length
      ? o.statusOptions
      : DEFAULT_AGREEMENT_STATUSES,
    notes: o.notes,
    clientSignedAt: o.clientSignedAt,
    consultantSignedAt: o.consultantSignedAt,
    linkedPayments,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

async function loadProjectContext(projectId) {
  const project = await Project.findById(projectId);
  if (!project) throw AppError.notFound("Project not found");

  const [company, enquiry] = await Promise.all([
    Company.findOne({ singletonKey: "default" }).lean(),
    project.enquiryId ? Enquiry.findById(project.enquiryId).lean() : null,
  ]);

  return { project, company, enquiry };
}

function buildDefaultAgreement(project, company, enquiry) {
  const fee = DEFAULT_CONSULTANCY_FEE;
  const milestones = computeMilestoneAmounts(
    fee,
    DEFAULT_CLIENT_MILESTONES.map((m) => ({ ...m })),
  );

  return {
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
    workStartDate: "",
    workDurationMonths: DEFAULT_WORK_DURATION_MONTHS,
    consultancyFeeTotal: fee,
    penaltyPerMonth: DEFAULT_PENALTY_PER_MONTH,
    warrantyYears: DEFAULT_WARRANTY_YEARS,
    clientMilestones: milestones,
    agreementKind: "operation_planning",
    useSqftPricing: false,
    sqftLines: [],
    subcontractorSchedule: [],
    approvedTrades: [],
    statusOptions: [...DEFAULT_AGREEMENT_STATUSES],
    notes: "",
  };
}

async function fetchLinkedPayments(enquiryId, milestones) {
  if (!enquiryId) return [];
  const payments = await EnquiryPayment.find({ enquiryId }).sort({
    createdAt: -1,
  });
  const linkedIds = new Set(
    (milestones || [])
      .map((m) => m.linkedPaymentId?.toString?.())
      .filter(Boolean),
  );

  return payments.map((p) => {
    const o = p.toObject ? p.toObject() : p;
    const id = o._id.toString();
    const numeric = paymentAmountNumeric(o);
    const linkedTo = (milestones || []).find(
      (m) => m.linkedPaymentId?.toString?.() === id,
    );
    return {
      id,
      amount: o.amount,
      amountNumeric: numeric,
      paymentType: o.paymentType,
      status: o.status,
      paymentDate: o.paymentDate,
      linkedMilestoneKey: linkedTo?.key || null,
      isLinked: linkedIds.has(id),
    };
  });
}

function applyPaymentSync(milestones, payments) {
  return milestones.map((m) => {
    if (!m.linkedPaymentId) return m;
    const pay = payments.find((p) => p.id === m.linkedPaymentId?.toString?.());
    if (!pay) return m;
    const paid = pay.status === "Completed" || pay.clientStatus === "confirmed";
    return {
      ...m,
      status: paid ? "paid" : m.status,
      paidAt: paid ? pay.paymentDate : m.paidAt,
    };
  });
}

export async function getProjectAgreement(projectId) {
  await loadProjectContext(projectId);
  let doc = await ProjectAgreement.findOne({ projectId });
  if (!doc) {
    const { project, company, enquiry } = await loadProjectContext(projectId);
    doc = await ProjectAgreement.create(
      buildDefaultAgreement(project, company, enquiry),
    );
  }

  const project = await Project.findById(projectId).lean();
  const linkedPayments = await fetchLinkedPayments(
    project?.enquiryId,
    doc.clientMilestones,
  );
  const milestones = applyPaymentSync(doc.clientMilestones, linkedPayments);
  const formatted = formatAgreement(
    { ...doc.toObject(), clientMilestones: milestones },
    linkedPayments,
  );
  return formatted;
}

export async function updateProjectAgreement(projectId, body) {
  const { project } = await loadProjectContext(projectId);
  let doc = await ProjectAgreement.findOne({ projectId });
  if (!doc) {
    const { company, enquiry } = await loadProjectContext(projectId);
    doc = await ProjectAgreement.create(
      buildDefaultAgreement(project, company, enquiry),
    );
  }

  const useSqft =
    body.useSqftPricing !== undefined
      ? body.useSqftPricing
      : doc.useSqftPricing;
  const sqftLines =
    body.sqftLines !== undefined ? body.sqftLines : doc.sqftLines;

  let fee =
    body.consultancyFeeTotal !== undefined
      ? Number(body.consultancyFeeTotal)
      : doc.consultancyFeeTotal;

  if (useSqft && sqftLines?.length) {
    fee = roundMoney(sumSqftLines(sqftLines));
  }

  let milestones =
    body.clientMilestones !== undefined
      ? body.clientMilestones
      : doc.clientMilestones;

  if (
    body.clientMilestones !== undefined ||
    body.consultancyFeeTotal !== undefined
  ) {
    milestones = computeMilestoneAmounts(fee, milestones).map((m) => ({
      ...m,
      linkedPaymentId: m.linkedPaymentId || null,
    }));
  }

  const patch = {
    status: body.status ?? doc.status,
    agreementDate: body.agreementDate ?? doc.agreementDate,
    clientParty: body.clientParty ?? doc.clientParty,
    consultantParty: body.consultantParty ?? doc.consultantParty,
    siteAddress: body.siteAddress ?? doc.siteAddress,
    workStartDate: body.workStartDate ?? doc.workStartDate,
    workDurationMonths: body.workDurationMonths ?? doc.workDurationMonths,
    useSqftPricing: useSqft,
    sqftLines,
    consultancyFeeTotal: fee,
    penaltyPerMonth: body.penaltyPerMonth ?? doc.penaltyPerMonth,
    warrantyYears: body.warrantyYears ?? doc.warrantyYears,
    clientMilestones: milestones,
    subcontractorSchedule:
      body.subcontractorSchedule !== undefined
        ? body.subcontractorSchedule
        : doc.subcontractorSchedule,
    approvedTrades:
      body.approvedTrades !== undefined
        ? body.approvedTrades
        : doc.approvedTrades,
    statusOptions: body.statusOptions ?? doc.statusOptions,
    notes: body.notes ?? doc.notes,
    clientSignedAt: body.clientSignedAt ?? doc.clientSignedAt,
    consultantSignedAt: body.consultantSignedAt ?? doc.consultantSignedAt,
  };

  const updated = await ProjectAgreement.findOneAndUpdate(
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
      $set: {
        "phases.agreementPct": 100,
        "phases.currentPhase": "planning",
      },
    });
  }

  const linkedPayments = await fetchLinkedPayments(
    project.enquiryId,
    updated.clientMilestones,
  );
  return formatAgreement(updated, linkedPayments);
}

export async function getAgreementForPdf(projectId) {
  const agreement = await getProjectAgreement(projectId);
  const { project, company } = await loadProjectContext(projectId);
  return { agreement, project, company };
}
