import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import {
  requireAnyPermission,
  requirePermission,
} from "../../../core/middleware/authorize.js";
import { validate } from "../../../core/middleware/validate.js";
import {
  addFollowUpValidation,
  addPaymentValidation,
  createEnquiryValidation,
  enquiryIdParam,
  talkingPointLogParam,
  listEnquiriesValidation,
  paymentClientActionValidation,
  quotationClientActionValidation,
  updateStatusValidation,
} from "./enquiry.validation.js";
import * as enquiryController from "./enquiry.controller.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  listEnquiriesValidation,
  validate,
  requirePermission("residential.enquiries.view"),
  enquiryController.list,
);

router.get(
  "/:id",
  enquiryIdParam,
  validate,
  requirePermission("residential.enquiries.view"),
  enquiryController.getOne,
);

router.get(
  "/:id/detail",
  enquiryIdParam,
  validate,
  requirePermission("residential.enquiries.view"),
  enquiryController.getDetail,
);

router.post(
  "/",
  createEnquiryValidation,
  validate,
  requirePermission("residential.enquiries.create"),
  enquiryController.create,
);

router.patch(
  "/:id",
  enquiryIdParam,
  validate,
  requirePermission("residential.enquiries.update"),
  enquiryController.update,
);

router.patch(
  "/:id/status",
  updateStatusValidation,
  validate,
  requirePermission("residential.enquiries.update"),
  enquiryController.updateStatus,
);

router.post(
  "/:id/follow-ups",
  addFollowUpValidation,
  validate,
  requirePermission("residential.enquiries.followup.create"),
  enquiryController.addFollowUp,
);

router.get(
  "/:id/talking-points",
  enquiryIdParam,
  validate,
  requirePermission("residential.enquiries.view"),
  enquiryController.listTalkingPoints,
);

router.post(
  "/:id/talking-points",
  enquiryIdParam,
  validate,
  requirePermission("residential.enquiries.update"),
  enquiryController.addTalkingPoint,
);

router.delete(
  "/:id/talking-points/:logId",
  talkingPointLogParam,
  validate,
  requirePermission("residential.enquiries.update"),
  enquiryController.deleteTalkingPoint,
);

router.patch(
  "/:id/follow-ups/:followUpId",
  enquiryIdParam,
  validate,
  requirePermission("residential.enquiries.followup.update"),
  enquiryController.updateFollowUp,
);

router.delete(
  "/:id/follow-ups/:followUpId",
  enquiryIdParam,
  validate,
  requirePermission("residential.enquiries.followup.delete"),
  enquiryController.deleteFollowUp,
);

router.put(
  "/:id/appointment",
  enquiryIdParam,
  validate,
  requirePermission("residential.enquiries.appointment.update"),
  enquiryController.upsertAppointment,
);

router.post(
  "/:id/payments",
  addPaymentValidation,
  validate,
  requirePermission("residential.enquiries.payment.create"),
  enquiryController.addPayment,
);

router.post(
  "/:id/convert-to-project",
  enquiryIdParam,
  validate,
  requirePermission("residential.projects.create"),
  enquiryController.convertToProject,
);

router.get(
  "/:id/quotations",
  enquiryIdParam,
  validate,
  requirePermission("residential.enquiries.view"),
  enquiryController.listQuotations,
);

router.post(
  "/:id/quotation/apply-template",
  enquiryIdParam,
  validate,
  requirePermission("residential.quotations.update"),
  enquiryController.applyQuotationTemplate,
);

router.patch(
  "/:id/quotations/:quotationId/primary",
  enquiryIdParam,
  validate,
  requirePermission("residential.quotations.update"),
  enquiryController.setPrimaryQuotation,
);

router.post(
  "/:id/quotations/duplicate",
  enquiryIdParam,
  validate,
  requirePermission("residential.quotations.update"),
  enquiryController.duplicateQuotation,
);

router.get(
  "/:id/quotations/:quotationId/pdf",
  enquiryIdParam,
  validate,
  requirePermission("residential.quotations.view"),
  enquiryController.getQuotationPdf,
);

router.post(
  "/:id/quotations/:quotationId/refresh-catalog",
  enquiryIdParam,
  validate,
  requirePermission("residential.quotations.update"),
  enquiryController.refreshQuotationCatalog,
);

router.post(
  "/:id/quotations/:quotationId/reset-template",
  enquiryIdParam,
  validate,
  requirePermission("residential.quotations.update"),
  enquiryController.resetQuotationTemplate,
);

router.patch(
  "/:id/quotations/:quotationId/items/:itemId",
  enquiryIdParam,
  validate,
  requirePermission("residential.quotations.update"),
  enquiryController.updateQuotationItem,
);

router.delete(
  "/:id/quotations/:quotationId/items/:itemId",
  enquiryIdParam,
  validate,
  requirePermission("residential.quotations.update"),
  enquiryController.deleteQuotationItem,
);

router.put(
  "/:id/quotation",
  enquiryIdParam,
  validate,
  requirePermission("residential.quotations.update"),
  enquiryController.upsertQuotation,
);

router.post(
  "/:id/quotation/items",
  enquiryIdParam,
  validate,
  requirePermission("residential.quotations.update"),
  enquiryController.addQuotationItem,
);

router.post(
  "/:id/quotation/send",
  enquiryIdParam,
  validate,
  requirePermission("residential.enquiries.quotation.send"),
  enquiryController.sendQuotation,
);

router.post(
  "/:id/quotation/approve",
  enquiryIdParam,
  validate,
  requirePermission("residential.enquiries.quotation.approve"),
  enquiryController.approveQuotation,
);

router.post(
  "/:id/quotation/client-action",
  quotationClientActionValidation,
  validate,
  requirePermission("residential.enquiries.quotation.approve"),
  enquiryController.clientQuotationAction,
);

router.post(
  "/:id/quotation/reopen",
  enquiryIdParam,
  validate,
  requirePermission("residential.quotations.update"),
  enquiryController.reopenQuotation,
);

router.post(
  "/:id/payments/:paymentId/client-action",
  paymentClientActionValidation,
  validate,
  requireAnyPermission(
    "residential.enquiries.payment.create",
    "client.payments.create",
  ),
  enquiryController.paymentClientAction,
);

router.post(
  "/:id/payment-link",
  enquiryIdParam,
  validate,
  requirePermission("residential.enquiries.payment.create"),
  enquiryController.createPaymentLink,
);

router.post(
  "/:id/client-invite",
  enquiryIdParam,
  validate,
  requirePermission("residential.enquiries.update"),
  enquiryController.sendClientInvite,
);

export default router;
