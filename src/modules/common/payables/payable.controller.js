import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as payableService from "./payable.service.js";

export const summary = asyncHandler(async (req, res) => {
  const businessModule = req.query.module || req.businessModule;
  sendSuccess(res, await payableService.getPayablesSummary({ businessModule }));
});

export const listObligations = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await payableService.listObligations({
      businessModule: req.query.module || req.businessModule,
      vendorId: req.query.vendorId,
      status: req.query.status,
    }),
  );
});

export const getObligation = asyncHandler(async (req, res) => {
  sendSuccess(res, await payableService.getObligationById(req.params.id));
});

export const createObligation = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await payableService.createObligation(req.body, req.user),
    201,
  );
});

export const updateObligation = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await payableService.updateObligation(req.params.id, req.body),
  );
});

export const recordPayment = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await payableService.recordObligationPayment(
      req.params.id,
      req.body,
      req.user,
    ),
    201,
  );
});

export const cashflow = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await payableService.getCashflowLedger({
      businessModule: req.query.module || req.businessModule,
      limit: parseInt(req.query.limit, 10) || 150,
    }),
  );
});

export const exportCsv = asyncHandler(async (req, res) => {
  const csv = await payableService.exportPayablesCsv({
    businessModule: req.query.module || req.businessModule,
  });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="vendor-payables.csv"',
  );
  res.status(200).send(csv);
});
