import { asyncHandler } from "../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../core/http/apiResponse.js";
import * as clientPortalService from "./clientPortal.service.js";
import { clientQuotationAction } from "../residential/quotations/quotation.service.js";
import { paymentClientAction as applyPaymentClientAction } from "../residential/enquiries/enquiry.service.js";

export const dashboard = asyncHandler(async (req, res) => {
  sendSuccess(res, await clientPortalService.getClientDashboard(req.user));
});

export const enquiryDetail = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await clientPortalService.getClientEnquiryDetail(
      req.user,
      req.params.id,
      req.query.quotationId,
    ),
  );
});

export const quotationPdf = asyncHandler(async (req, res) => {
  await clientPortalService.assertClientEnquiryAccess(req.user, req.params.id);
  const { buildQuotationPdfHtml } =
    await import("../residential/quotations/quotationPdf.service.js");
  const html = await buildQuotationPdfHtml(
    req.params.id,
    req.params.quotationId,
  );
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export const quotationClientAction = asyncHandler(async (req, res) => {
  await clientPortalService.assertClientEnquiryAccess(req.user, req.params.id);
  sendSuccess(
    res,
    await clientQuotationAction(req.params.id, req.body, req.user),
  );
});

export const paymentClientAction = asyncHandler(async (req, res) => {
  await clientPortalService.assertClientEnquiryAccess(req.user, req.params.id);
  sendSuccess(
    res,
    await applyPaymentClientAction(
      req.params.id,
      req.params.paymentId,
      req.body,
      req.user,
    ),
  );
});

export const enquiryApprovals = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await clientPortalService.getClientEnquiryApprovals(
      req.user,
      req.params.id,
    ),
  );
});

export const enquiryAgreement = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await clientPortalService.getClientEnquiryAgreement(
      req.user,
      req.params.id,
    ),
  );
});

export const enquiryAgreementPdf = asyncHandler(async (req, res) => {
  const data = await clientPortalService.getClientEnquiryAgreement(
    req.user,
    req.params.id,
  );
  if (!data.projectId) {
    res.status(404).send("No project agreement found");
    return;
  }
  const { buildAgreementPdfHtml } =
    await import("../residential/projects/projectAgreementPdf.service.js");
  const html = await buildAgreementPdfHtml(data.projectId);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export const projectApprovalClientAction = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await clientPortalService.clientProjectApprovalAction(
      req.user,
      req.params.id,
      req.params.approvalId,
      req.body,
    ),
  );
});
