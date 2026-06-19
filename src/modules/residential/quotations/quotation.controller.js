import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as quotationService from "./quotation.service.js";

export const list = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await quotationService.listQuotations({ moduleId: req.query.module }),
  );
});

export const getOne = asyncHandler(async (req, res) => {
  sendSuccess(res, await quotationService.getQuotationById(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  sendSuccess(res, await quotationService.createQuotation(req.body), 201);
});
