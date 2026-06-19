import { asyncHandler } from "../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../core/http/apiResponse.js";
import * as vendorPortalService from "./vendorPortal.service.js";

export const dashboard = asyncHandler(async (req, res) => {
  sendSuccess(res, await vendorPortalService.getVendorDashboard(req.user));
});

export const orders = asyncHandler(async (req, res) => {
  sendSuccess(res, await vendorPortalService.listVendorOrders(req.user));
});

export const quotations = asyncHandler(async (req, res) => {
  sendSuccess(res, await vendorPortalService.listVendorQuotations(req.user));
});

export const submitQuotation = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await vendorPortalService.submitVendorQuotation(
      req.params.id,
      req.body,
      req.user,
    ),
  );
});
