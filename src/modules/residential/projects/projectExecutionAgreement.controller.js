import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as executionAgreementService from "./projectExecutionAgreement.service.js";

export const getExecutionAgreement = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await executionAgreementService.getProjectExecutionAgreement(req.params.id),
  );
});

export const updateExecutionAgreement = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await executionAgreementService.updateProjectExecutionAgreement(
      req.params.id,
      req.body,
    ),
  );
});
