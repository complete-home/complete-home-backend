import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as financeGstService from "./financeGst.service.js";

export const getGstReport = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await financeGstService.getGstReport({
      businessModule: req.query.module || req.businessModule,
      projectId: req.query.projectId,
      partyType: req.query.partyType,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }),
  );
});

export const getFinanceOverview = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await financeGstService.getFinanceOverview({
      businessModule: req.query.module || req.businessModule,
    }),
  );
});
