import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as agreementService from "./projectAgreement.service.js";

export const getAgreement = asyncHandler(async (req, res) => {
  sendSuccess(res, await agreementService.getProjectAgreement(req.params.id));
});

export const updateAgreement = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await agreementService.updateProjectAgreement(req.params.id, req.body),
  );
});

export const getAgreementPdf = asyncHandler(async (req, res) => {
  const { buildAgreementPdfHtml } =
    await import("./projectAgreementPdf.service.js");
  const html = await buildAgreementPdfHtml(req.params.id);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});
