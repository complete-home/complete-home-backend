import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as vendorQuotationService from "./vendorQuotation.service.js";

export const list = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await vendorQuotationService.listVendorQuotationsForStaff(req.query),
  );
});

export const getOne = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await vendorQuotationService.getVendorQuotationById(req.params.id, req.user),
  );
});

export const createRequest = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await vendorQuotationService.createVendorQuotationRequest(req.body, req.user),
    201,
  );
});

export const capture = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await vendorQuotationService.captureVendorQuotation(req.body, req.user),
    201,
  );
});

export const update = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await vendorQuotationService.updateVendorQuotation(
      req.params.id,
      req.body,
      req.user,
    ),
  );
});

export const uploadAttachment = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    {
      url: await vendorQuotationService.saveVendorQuoteAttachment(
        req.body.dataUrl,
        req.body.filename,
      ),
    },
    201,
  );
});
