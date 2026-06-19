import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../../../core/middleware/validate.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import AppError from "../../../core/errors/AppError.js";
import * as enquiryService from "./enquiry.service.js";

const router = Router();

function checkApiKey(req) {
  const key =
    req.headers["x-api-key"] ||
    req.headers["x-webhook-key"] ||
    req.query.apiKey;
  const expected = process.env.PUBLIC_ENQUIRY_API_KEY;
  if (!expected || key !== expected) {
    throw AppError.unauthorized("Invalid API key");
  }
}

function normalizePublicEnquiryBody(body) {
  const mobile = (body.mobile || body.phone || "").trim();
  const service = (body.service || body.workType || "").trim();
  const address = (body.address || body.fullAddress || "").trim();
  const requirements =
    (body.requirements || body.message || body.notes || "").trim();

  return {
    name: body.name?.trim(),
    mobile,
    email: body.email?.trim(),
    service: service || undefined,
    workType: service || undefined,
    address: address || undefined,
    fullAddress: address || undefined,
    requirements,
    source: body.source || "Website",
    status: "New Enquiry",
    businessModule: body.businessModule || "residential",
  };
}

router.post(
  "/enquiries",
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("mobile").optional().trim(),
  body("phone").optional().trim(),
  body()
    .custom((_, { req }) => {
      const mobile = (req.body.mobile || req.body.phone || "").trim();
      if (!mobile) throw new Error("Mobile number is required");
      return true;
    }),
  validate,
  asyncHandler(async (req, res) => {
    checkApiKey(req);
    const payload = normalizePublicEnquiryBody(req.body);
    const data = await enquiryService.createEnquiry(payload, null);
    if (data?.id) {
      await enquiryService.logEnquiryActivity(
        data.id,
        "Website lead received",
        req.body.email || req.body.mobile || "Public form",
        "WEBSITE",
      );
    }
    sendSuccess(res, data, 201);
  }),
);

export default router;
