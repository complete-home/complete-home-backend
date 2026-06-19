import { body, param, query } from "express-validator";
import { ENQUIRY_STATUSES } from "./enquiry.model.js";

export const enquiryIdParam = [
  param("id").isMongoId().withMessage("Invalid enquiry id"),
];

export const talkingPointLogParam = [
  ...enquiryIdParam,
  param("logId").isMongoId().withMessage("Invalid talking point id"),
];

export const listEnquiriesValidation = [
  query("module").optional().isIn(["residential", "services"]),
  query("source").optional().trim(),
  query("talkingPoint").optional().trim(),
  query("salesHeadId").optional().isMongoId(),
  query("projectHeadId").optional().isMongoId(),
  query("month").optional().matches(/^\d{4}-\d{2}$/),
];

export const createEnquiryValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("mobile").trim().notEmpty().withMessage("Mobile Number is required"),
  body("email").optional({ values: "falsy" }).isEmail().withMessage("Invalid email"),
  body("pincode").optional().trim(),
  body("building").optional().trim(),
  body("area").optional().trim(),
  body("state").optional().trim(),
  body("city").optional().trim(),
  body("fullAddress").optional().trim(),
  body("source").trim().notEmpty().withMessage("Enquiry Source is required"),
  body("service").optional().trim(),
  body("workType").optional().trim(),
  body()
    .custom((_, { req }) => {
      if (req.body.workType?.trim() || req.body.service?.trim()) return true;
      throw new Error("Work type or service is required");
    }),
  body("requirements").optional().trim(),
  body("talkingPoint").optional().trim(),
  body("salesHeadId").optional().isMongoId(),
  body("projectHeadId").optional().isMongoId(),
  body("toolkitDone").optional().isBoolean(),
  body("clientId").optional().isMongoId(),
  body("assigneeIds").optional().isArray(),
  body("businessModule").optional().isIn(["residential", "services"]),
];

export const updateStatusValidation = [
  ...enquiryIdParam,
  body("status")
    .isIn(ENQUIRY_STATUSES)
    .withMessage(`Status must be one of: ${ENQUIRY_STATUSES.join(", ")}`),
];

export const addFollowUpValidation = [
  ...enquiryIdParam,
  body("type").optional().isIn(["call", "whatsapp", "email"]),
  body("notes").optional().trim(),
  body("note").optional().trim(),
  body("date").optional().trim(),
  body("time").optional().trim(),
];

export const addPaymentValidation = [
  ...enquiryIdParam,
  body("amount").optional().trim(),
  body("paymentType").optional().trim(),
  body("paymentMode").optional().trim(),
  body("paymentDate").optional().trim(),
];

export const quotationClientActionValidation = [
  ...enquiryIdParam,
  body("action")
    .isIn(["approve", "reject", "request_changes", "request_revision"])
    .withMessage("Invalid quotation action"),
  body("comment").optional().trim(),
];

export const clientQuotationActionValidation = quotationClientActionValidation;

export const paymentIdParam = [
  param("paymentId").isMongoId().withMessage("Invalid payment id"),
];

export const paymentClientActionValidation = [
  ...enquiryIdParam,
  ...paymentIdParam,
  body("action")
    .isIn(["confirm", "dispute"])
    .withMessage("Invalid payment action"),
  body("comment").optional().trim(),
];

export const clientPaymentActionValidation = paymentClientActionValidation;
