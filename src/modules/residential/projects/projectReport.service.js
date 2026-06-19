import AppError from "../../../core/errors/AppError.js";
import { paymentAmountNumeric, roundMoney } from "../../../core/utils/money.js";
import ChecklistInstance from "../checklists/checklistInstance.model.js";
import Enquiry from "../enquiries/enquiry.model.js";
import EnquiryAppointment from "../enquiries/enquiryAppointment.model.js";
import EnquiryPayment from "../enquiries/enquiryPayment.model.js";
import Quotation from "../quotations/quotation.model.js";
import MaterialSelection from "../materials/materialSelection.model.js";
import ProjectSiteManagement from "../siteManagement/projectSiteManagement.model.js";
import Project from "./project.model.js";
import ProjectAgreement from "./projectAgreement.model.js";
import ProjectReportValue from "./projectReportValue.model.js";
import ReportFieldDefinition from "./reportFieldDefinition.model.js";
import * as projectApprovalService from "./projectApproval.service.js";
import { getProjectFinanceSummary } from "./projectFinance.service.js";

const TEAMS = ["mcs", "bpd", "psq", "ala"];

function pctLabel(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n)}%`;
}

function statusFromPct(n) {
  if (n >= 100) return "Complete";
  if (n > 0) return "In progress";
  return "Not started";
}

async function loadManualValues(projectId, team) {
  const rows = await ProjectReportValue.find({ projectId, team }).lean();
  return Object.fromEntries(rows.map((r) => [r.fieldKey, r.value]));
}

async function loadCustomFields(team) {
  return ReportFieldDefinition.find({ team, active: true })
    .sort({ sortOrder: 1 })
    .lean();
}

async function loadContext(projectId) {
  const project = await Project.findById(projectId).lean();
  if (!project) throw AppError.notFound("Project not found");

  let enquiry = null;
  if (project.enquiryId) {
    enquiry = await Enquiry.findById(project.enquiryId).lean();
  }

  const [
    appointment,
    quotations,
    agreement,
    siteMgmt,
    materials,
    planningRows,
    executionRows,
    finance,
  ] = await Promise.all([
    project.enquiryId
      ? EnquiryAppointment.findOne({ enquiryId: project.enquiryId }).lean()
      : null,
    project.enquiryId
      ? Quotation.find({ enquiryId: project.enquiryId })
          .sort({ isPrimary: -1, sortOrder: 1 })
          .lean()
      : Quotation.find({ projectId }).sort({ sortOrder: 1 }).lean(),
    ProjectAgreement.findOne({ projectId }).lean(),
    ProjectSiteManagement.findOne({ projectId }).lean(),
    MaterialSelection.find({ projectId }).lean(),
    ChecklistInstance.find({ projectId, phase: "planning" }).lean(),
    ChecklistInstance.find({ projectId, phase: "execution" }).lean(),
    getProjectFinanceSummary(projectId).catch(() => null),
  ]);

  const primaryQuot =
    quotations.find((q) => q.isPrimary) || quotations[0] || null;

  let approvals = [];
  try {
    approvals = await projectApprovalService.listProjectApprovals(projectId);
  } catch {
    approvals = [];
  }

  const phases = project.phases || {};

  return {
    project,
    enquiry,
    appointment,
    quotations,
    primaryQuot,
    agreement,
    siteMgmt,
    materials,
    planningRows,
    executionRows,
    finance,
    approvals,
    phases,
  };
}

function planningPctByDimension(rows, dimension) {
  const filtered = rows.filter((r) => {
    const code = (r.sheetCode || "").toLowerCase();
    const stage = (r.stage || "").toLowerCase();
    const label = (r.label || "").toLowerCase();
    if (dimension === "2d") {
      return (
        code.includes("2d") ||
        stage.includes("2d") ||
        label.includes("2d") ||
        (r.sheetCode || "").match(/^C-[12]/i)
      );
    }
    return (
      code.includes("3d") ||
      stage.includes("3d") ||
      label.includes("3d") ||
      (r.sheetCode || "").match(/^C-[3456]/i)
    );
  });
  if (!filtered.length) return null;
  const done = filtered.filter(
    (r) => r.status === "done" || r.status === "na",
  ).length;
  return Math.round((done / filtered.length) * 100);
}

function materialCompletionPct(materials) {
  if (!materials.length) return null;
  const done = materials.filter((m) => m.completed).length;
  return Math.round((done / materials.length) * 100);
}

function buildMcs(ctx, manual) {
  const { project, enquiry, appointment, primaryQuot } = ctx;
  const fields = {
    projectName: project.name,
    clientName: project.client || enquiry?.name || "—",
    leadSource: enquiry?.source || project.source || "—",
    inquiryStatus: enquiry?.status || "—",
    siteVisitStatus: appointment
      ? appointment.status || appointment.when || "Scheduled"
      : "Not scheduled",
    quotationStatus: primaryQuot?.status || "—",
    clientDiscussionStatus:
      enquiry?.talkingPoint || manual.clientDiscussionStatus || "—",
    projectType:
      enquiry?.workType || enquiry?.service || project.workType || "—",
    closingProbability: manual.closingProbability || "—",
    remarks: manual.remarksMcs || manual.remarks || "",
  };
  return { team: "mcs", label: "MCS Team (Pre-sale)", fields };
}

function buildBpd(ctx, manual) {
  const { project, primaryQuot, planningRows, approvals, phases } = ctx;
  const pct2d = planningPctByDimension(planningRows, "2d");
  const pct3d = planningPctByDimension(planningRows, "3d");
  const boqApproval = approvals.find((a) => a.type === "boq");
  const designApproval = approvals.find((a) => a.type === "design");

  const fields = {
    projectName: project.name,
    clientName: project.client || "—",
    planning2dStatus:
      pct2d != null ? statusFromPct(pct2d) : pctLabel(phases.planningPct),
    planning2dPct: pct2d ?? phases.planningPct ?? 0,
    planning3dStatus:
      pct3d != null ? statusFromPct(pct3d) : pctLabel(phases.planningPct),
    planning3dPct: pct3d ?? phases.planningPct ?? 0,
    boqStatus: boqApproval?.status || primaryQuot?.status || "—",
    clientApprovalStatus: designApproval?.status || "—",
    pendingRevisionStatus:
      primaryQuot?.status === "Changes Requested"
        ? "Changes requested"
        : primaryQuot?.revisionRequests?.length
          ? "Open revisions"
          : "—",
    designDeliveryDate: manual.designDeliveryDate || "—",
    remarks: manual.remarksBpd || manual.remarks || "",
  };
  return { team: "bpd", label: "BPD Team (Design)", fields };
}

function buildPsq(ctx, manual) {
  const { project, siteMgmt, materials, executionRows, phases } = ctx;
  const execDone = executionRows.filter(
    (r) => r.status === "done" || r.status === "na",
  ).length;
  const execPct = executionRows.length
    ? Math.round((execDone / executionRows.length) * 100)
    : phases.executionPct ?? 0;

  const matPct = materialCompletionPct(materials) ?? phases.materialPct ?? 0;
  const contractorCount = siteMgmt?.contractors?.length || 0;
  const vendorCount = siteMgmt?.vendors?.length || 0;

  const fields = {
    projectName: project.name,
    clientName: project.client || "—",
    siteStatus: statusFromPct(phases.executionPct ?? execPct),
    workContribution: pctLabel(execPct),
    materialStatus: statusFromPct(matPct),
    vendorStatus: vendorCount ? `${vendorCount} vendor(s)` : "—",
    contractorStatus: contractorCount
      ? `${contractorCount} contractor(s)`
      : "—",
    qualityCheck: statusFromPct(execPct),
    pendingWorkAgreement: pctLabel(phases.agreementPct),
    pendingWorkPlanning: pctLabel(phases.planningPct),
    pendingWorkMaterial: pctLabel(phases.materialPct),
    pendingWorkExecution: pctLabel(phases.executionPct),
    pendingWorkSiteManagement: pctLabel(phases.siteMgmtPct),
    remarks: manual.remarksPsq || manual.remarks || "",
  };
  return { team: "psq", label: "PSQ Team (Site)", fields };
}

function buildAla(ctx, manual) {
  const { project, agreement, primaryQuot, finance } = ctx;
  const totalFromAgreement = agreement?.consultancyFeeTotal;
  const totalFromQuot = primaryQuot?.grandTotal
    ? parseFloat(String(primaryQuot.grandTotal).replace(/[^\d.]/g, "")) || 0
    : 0;
  const total = totalFromAgreement || totalFromQuot || 0;
  const received = finance?.client?.received ?? 0;
  const pending = roundMoney(Math.max(0, total - received));

  const nextMilestone = (agreement?.clientMilestones || []).find(
    (m) => m.status !== "paid" && m.status !== "Paid",
  );

  const fields = {
    projectName: project.name,
    clientName: project.client || "—",
    totalProjectAmount: total ? `₹${roundMoney(total).toLocaleString("en-IN")}` : "—",
    amountReceived: received
      ? `₹${roundMoney(received).toLocaleString("en-IN")}`
      : "—",
    pendingAmount: pending
      ? `₹${pending.toLocaleString("en-IN")}`
      : "—",
    paymentDueDate:
      manual.paymentDueDate ||
      nextMilestone?.trigger ||
      agreement?.workStartDate ||
      "—",
    billingStatus: manual.billingStatus || "—",
    agreementStatus: agreement?.status || "—",
    legalStatus: manual.legalStatus || "—",
    adminRemark: manual.adminRemark || manual.remarks || "",
  };
  return { team: "ala", label: "ALA Team (Accounts)", fields };
}

function mergeCustomFields(board, customDefs, manual) {
  const custom = [];
  for (const def of customDefs) {
    if (def.source === "derived") continue;
    const val =
      manual[def.key] ??
      (def.source === "lookup" ? "" : "");
    custom.push({
      key: def.key,
      label: def.label,
      dataType: def.dataType,
      value: val,
    });
  }
  return { ...board, customFields: custom };
}

export async function getProjectReport(projectId, team = "mcs") {
  const normalized = String(team).toLowerCase();
  if (!TEAMS.includes(normalized)) {
    throw AppError.badRequest(`Invalid team. Use: ${TEAMS.join(", ")}`);
  }

  const ctx = await loadContext(projectId);
  const manual = await loadManualValues(projectId, normalized);
  const customDefs = await loadCustomFields(normalized);

  let board;
  switch (normalized) {
    case "mcs":
      board = buildMcs(ctx, manual);
      break;
    case "bpd":
      board = buildBpd(ctx, manual);
      break;
    case "psq":
      board = buildPsq(ctx, manual);
      break;
    case "ala":
      board = buildAla(ctx, manual);
      break;
    default:
      board = buildMcs(ctx, manual);
  }

  return mergeCustomFields(
    {
      projectId,
      enquiryId: ctx.project.enquiryId?.toString?.() || null,
      enquiryCode: ctx.project.enquiryCode || "",
      ...board,
      updatedAt: new Date().toISOString(),
    },
    customDefs,
    manual,
  );
}

export async function getAllProjectReports(projectId) {
  const reports = await Promise.all(
    TEAMS.map((t) => getProjectReport(projectId, t)),
  );
  return { projectId, teams: reports };
}

export async function updateProjectReportValues(projectId, team, values = {}) {
  const normalized = String(team).toLowerCase();
  if (!TEAMS.includes(normalized)) {
    throw AppError.badRequest(`Invalid team`);
  }
  const project = await Project.findById(projectId);
  if (!project) throw AppError.notFound("Project not found");

  const ops = Object.entries(values).map(([fieldKey, value]) =>
    ProjectReportValue.findOneAndUpdate(
      { projectId, team: normalized, fieldKey },
      { value },
      { upsert: true, new: true },
    ),
  );
  await Promise.all(ops);
  return getProjectReport(projectId, normalized);
}

export async function listReportFieldDefinitions(team) {
  const q = team ? { team: String(team).toLowerCase(), active: true } : { active: true };
  return ReportFieldDefinition.find(q).sort({ team: 1, sortOrder: 1 }).lean();
}

export async function createReportFieldDefinition(body) {
  const doc = await ReportFieldDefinition.create({
    team: body.team,
    key: body.key,
    label: body.label,
    dataType: body.dataType || "text",
    source: body.source || "manual",
    lookupKey: body.lookupKey || "",
    sortOrder: body.sortOrder ?? 0,
  });
  return doc.toObject();
}

export async function listPortfolioReports({ team, moduleId } = {}) {
  const filter = moduleId ? { businessModule: moduleId } : {};
  const projects = await Project.find(filter)
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();
  const normalized = team ? String(team).toLowerCase() : "mcs";
  const rows = await Promise.all(
    projects.map(async (p) => {
      const report = await getProjectReport(p._id.toString(), normalized);
      return {
        projectId: p._id.toString(),
        projectCode: p.code,
        projectName: p.name,
        client: p.client,
        manager: p.manager,
        status: p.status,
        fields: report.fields,
      };
    }),
  );
  return { team: normalized, items: rows };
}
