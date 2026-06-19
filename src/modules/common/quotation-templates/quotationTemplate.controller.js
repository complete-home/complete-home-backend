import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as quotationTemplateService from "./quotationTemplate.service.js";

export const list = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await quotationTemplateService.listQuotationTemplates(req.query),
  );
});

export const getOne = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await quotationTemplateService.getQuotationTemplateById(req.params.id),
  );
});

export const create = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await quotationTemplateService.createQuotationTemplate(req.body, req.user),
    201,
  );
});

export const update = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await quotationTemplateService.updateQuotationTemplate(
      req.params.id,
      req.body,
      req.user,
    ),
  );
});

export const remove = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await quotationTemplateService.deleteQuotationTemplate(req.params.id),
  );
});

export const duplicate = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await quotationTemplateService.duplicateQuotationTemplate(
      req.params.id,
      req.user,
    ),
    201,
  );
});

export const listVersions = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await quotationTemplateService.listQuotationTemplateVersions(req.params.id),
  );
});

export const getVersion = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await quotationTemplateService.getQuotationTemplateVersion(
      req.params.id,
      req.params.version,
    ),
  );
});
