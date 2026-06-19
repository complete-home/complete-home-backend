import AppError from "../../../core/errors/AppError.js";
import { docId } from "../../../core/http/formatHelpers.js";
import Project from "./project.model.js";
import ProjectApproval from "./projectApproval.model.js";
import EnquiryActivity from "../enquiries/enquiryActivity.model.js";

function formatApproval(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: docId(o),
    projectId: o.projectId?.toString(),
    type: o.type,
    title: o.title,
    description: o.description || "",
    status: o.status,
    clientComment: o.clientComment || "",
    sentAt: o.sentAt,
    clientActionAt: o.clientActionAt,
    history: o.history || [],
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

async function logProjectActivity(project, title, detail) {
  if (!project.enquiryId) return;
  await EnquiryActivity.create({
    enquiryId: project.enquiryId,
    type: "approval",
    title,
    detail,
    at: new Date().toISOString(),
  });
}

export async function listProjectApprovals(projectId) {
  const rows = await ProjectApproval.find({ projectId }).sort({
    createdAt: -1,
  });
  return rows.map(formatApproval);
}

export async function createProjectApproval(projectId, body) {
  const project = await Project.findById(projectId);
  if (!project) throw AppError.notFound("Project not found");
  const row = await ProjectApproval.create({
    projectId,
    type: body.type || "design",
    title: body.title,
    description: body.description || "",
    status: body.status || "draft",
    history: [
      {
        action: "created",
        comment: "",
        actorName: body.actorName || "Staff",
      },
    ],
  });
  return formatApproval(row);
}

export async function sendProjectApproval(projectId, approvalId, actor) {
  const row = await ProjectApproval.findOne({ _id: approvalId, projectId });
  if (!row) throw AppError.notFound("Approval not found");
  row.status = "sent";
  row.sentAt = new Date();
  row.history.push({
    action: "sent",
    comment: "",
    actorName: actor?.name || "Staff",
  });
  await row.save();
  const project = await Project.findById(projectId);
  await logProjectActivity(
    project,
    `Design/BOQ sent: ${row.title}`,
    "Awaiting client approval",
  );
  return formatApproval(row);
}

const CLIENT_ACTIONS = {
  approve: "approved",
  reject: "rejected",
  request_changes: "changes_requested",
};

export async function clientActionOnApproval(
  projectId,
  approvalId,
  { action, comment },
  actor,
) {
  const row = await ProjectApproval.findOne({ _id: approvalId, projectId });
  if (!row) throw AppError.notFound("Approval not found");
  if (row.status !== "sent") {
    throw AppError.badRequest("This approval is not awaiting client action");
  }
  const next = CLIENT_ACTIONS[action];
  if (!next) throw AppError.badRequest("Invalid action");
  row.status = next;
  row.clientComment = comment || "";
  row.clientActionAt = new Date();
  row.history.push({
    action,
    comment: comment || "",
    actorName: actor?.name || "Client",
  });
  await row.save();
  const project = await Project.findById(projectId);
  await logProjectActivity(
    project,
    `Client ${action}: ${row.title}`,
    comment || row.title,
  );
  return formatApproval(row);
}
