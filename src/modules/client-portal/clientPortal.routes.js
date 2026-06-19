import { Router } from "express";
import { authenticate } from "../../core/middleware/auth.js";
import { requirePermission } from "../../core/middleware/authorize.js";
import { requireUserType } from "../../core/middleware/requireUserType.js";
import { validate } from "../../core/middleware/validate.js";
import {
  clientPaymentActionValidation,
  clientQuotationActionValidation,
  enquiryIdParam,
} from "../residential/enquiries/enquiry.validation.js";
import * as clientPortalController from "./clientPortal.controller.js";

const router = Router();

router.use(authenticate);
router.use(requireUserType("client"));

router.get(
  "/dashboard",
  requirePermission("client.projects.view"),
  clientPortalController.dashboard,
);

router.get(
  "/enquiries/:id/detail",
  enquiryIdParam,
  validate,
  requirePermission("client.approvals.view"),
  clientPortalController.enquiryDetail,
);

router.get(
  "/enquiries/:id/quotations/:quotationId/pdf",
  enquiryIdParam,
  validate,
  requirePermission("client.approvals.view"),
  clientPortalController.quotationPdf,
);

router.post(
  "/enquiries/:id/quotation/client-action",
  clientQuotationActionValidation,
  validate,
  requirePermission("client.approvals.approve"),
  clientPortalController.quotationClientAction,
);

router.post(
  "/enquiries/:id/payments/:paymentId/client-action",
  clientPaymentActionValidation,
  validate,
  requirePermission("client.payments.create"),
  clientPortalController.paymentClientAction,
);

router.get(
  "/enquiries/:id/approvals",
  enquiryIdParam,
  validate,
  requirePermission("client.approvals.view"),
  clientPortalController.enquiryApprovals,
);

router.get(
  "/enquiries/:id/agreement",
  enquiryIdParam,
  validate,
  requirePermission("client.approvals.view"),
  clientPortalController.enquiryAgreement,
);

router.get(
  "/enquiries/:id/agreement/pdf",
  enquiryIdParam,
  validate,
  requirePermission("client.approvals.view"),
  clientPortalController.enquiryAgreementPdf,
);

router.post(
  "/enquiries/:id/approvals/:approvalId/client-action",
  enquiryIdParam,
  validate,
  requirePermission("client.approvals.approve"),
  clientPortalController.projectApprovalClientAction,
);

export default router;
