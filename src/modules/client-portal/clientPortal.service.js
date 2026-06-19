import AppError from "../../core/errors/AppError.js";
import { Messages } from "../../core/http/messages.js";
import { Client } from "../common/masters/master.model.js";
import Enquiry from "../residential/enquiries/enquiry.model.js";
import {
  formatEnquiry,
  formatEnquiryDetailAggregate,
} from "../residential/enquiries/enquiry.formatter.js";
import EnquiryActivity from "../residential/enquiries/enquiryActivity.model.js";
import EnquiryFollowUp from "../residential/enquiries/enquiryFollowUp.model.js";
import EnquiryAppointment from "../residential/enquiries/enquiryAppointment.model.js";
import EnquiryPayment from "../residential/enquiries/enquiryPayment.model.js";
import Quotation from "../residential/quotations/quotation.model.js";
import Project from "../residential/projects/project.model.js";
import { formatQuotationDetail } from "../residential/quotations/quotation.service.js";
import * as projectApprovalService from "../residential/projects/projectApproval.service.js";
import * as projectAgreementService from "../residential/projects/projectAgreement.service.js";

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

async function resolveClientProfile(user) {
  if (user.clientId) {
    const client = await Client.findById(user.clientId).lean();
    if (client) return client;
  }
  if (user.email) {
    const client = await Client.findOne({
      email: user.email.toLowerCase(),
    }).lean();
    if (client) return client;
  }
  if (user.mobile) {
    const d = digitsOnly(user.mobile);
    const client = await Client.findOne({
      mobile: { $regex: d.slice(-10) },
    }).lean();
    if (client) return client;
  }
  return null;
}

function buildEnquiryAccessFilter(client, user) {
  const or = [];
  if (client?._id) {
    or.push({ clientId: client._id });
  }
  if (client?.email) {
    or.push({ email: client.email.toLowerCase() });
  }
  if (client?.mobile) {
    const d = digitsOnly(client.mobile);
    if (d.length >= 10) {
      or.push({ mobile: { $regex: d.slice(-10) } });
    }
  }
  if (user.email) {
    or.push({ email: user.email.toLowerCase() });
  }
  if (user.mobile) {
    const d = digitsOnly(user.mobile);
    if (d.length >= 10) {
      or.push({ mobile: { $regex: d.slice(-10) } });
    }
  }
  return or.length ? { $or: or } : { _id: null };
}

export async function getClientDashboard(user) {
  const client = await resolveClientProfile(user);
  const filter = buildEnquiryAccessFilter(client, user);
  const enquiries = await Enquiry.find(filter).sort({ updatedAt: -1 }).lean();

  const enquiryIds = enquiries.map((e) => e._id);
  const quotations = await Quotation.find({
    enquiryId: { $in: enquiryIds },
  }).lean();
  const quoByEnquiry = new Map(
    quotations.map((q) => [q.enquiryId.toString(), q]),
  );

  return {
    client: client
      ? {
          id: client._id.toString(),
          code: client.code,
          name: client.name,
          email: client.email,
          mobile: client.mobile,
        }
      : null,
    enquiries: enquiries.map((e) => {
      const q = quoByEnquiry.get(e._id.toString());
      return {
        ...formatEnquiry(e),
        quotationStatus: q?.status || null,
        quotationCode: q?.code || null,
      };
    }),
  };
}

export async function assertClientEnquiryAccess(user, enquiryId) {
  const client = await resolveClientProfile(user);
  const filter = { _id: enquiryId, ...buildEnquiryAccessFilter(client, user) };
  const enquiry = await Enquiry.findOne(filter);
  if (!enquiry) {
    throw AppError.forbidden(Messages.enquiry.notFound || "Access denied");
  }
  return enquiry;
}

export async function getClientEnquiryDetail(user, enquiryId, quotationId) {
  const enquiry = await assertClientEnquiryAccess(user, enquiryId);
  const { listEnquiryQuotations, getEnquiryQuotation } =
    await import("../residential/quotations/quotation.service.js");

  const [
    activityLogs,
    followUps,
    appointment,
    payments,
    quotations,
    quotation,
  ] = await Promise.all([
    EnquiryActivity.find({ enquiryId }).sort({ createdAt: -1 }),
    EnquiryFollowUp.find({ enquiryId }).sort({ createdAt: -1 }),
    EnquiryAppointment.findOne({ enquiryId }),
    EnquiryPayment.find({ enquiryId }).sort({ createdAt: -1 }),
    listEnquiryQuotations(enquiryId),
    getEnquiryQuotation(enquiryId, quotationId),
  ]);

  return formatEnquiryDetailAggregate(enquiry, {
    activityLogs,
    followUps,
    appointment,
    payments,
    quotations,
    quotation,
  });
}

export async function getClientEnquiryApprovals(user, enquiryId) {
  await assertClientEnquiryAccess(user, enquiryId);
  const project = await Project.findOne({ enquiryId }).lean();
  if (!project) {
    return { projectId: null, approvals: [] };
  }
  const approvals = await projectApprovalService.listProjectApprovals(
    project._id,
  );
  return {
    projectId: project._id.toString(),
    projectCode: project.code,
    approvals,
  };
}

export async function getClientEnquiryAgreement(user, enquiryId) {
  await assertClientEnquiryAccess(user, enquiryId);
  const project = await Project.findOne({ enquiryId }).lean();
  if (!project) {
    return { projectId: null, agreement: null };
  }
  const agreement = await projectAgreementService.getProjectAgreement(
    project._id,
  );
  return {
    projectId: project._id.toString(),
    projectCode: project.code,
    agreement,
  };
}

export async function clientProjectApprovalAction(
  user,
  enquiryId,
  approvalId,
  body,
) {
  await assertClientEnquiryAccess(user, enquiryId);
  const project = await Project.findOne({ enquiryId });
  if (!project) throw AppError.notFound("No project linked to this enquiry");
  return projectApprovalService.clientActionOnApproval(
    project._id,
    approvalId,
    body,
    user,
  );
}
