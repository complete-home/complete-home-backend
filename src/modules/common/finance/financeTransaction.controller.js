import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as svc from "./financeTransaction.service.js";

export const list = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.listFinanceTransactions(req.query));
});

export const create = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.createFinanceTransaction(req.body, req.user), 201);
});

export const overview = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.getFinanceOverview(req.query));
});

export const personLedger = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await svc.getPersonLedger(req.params.personType, req.query),
  );
});

export const projectPayees = asyncHandler(async (req, res) => {
  sendSuccess(res, await svc.listProjectPayees(req.params.projectId));
});
