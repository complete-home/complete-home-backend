import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as projectApprovalService from "./projectApproval.service.js";
import * as projectFinanceService from "./projectFinance.service.js";
import * as projectPersonFinanceService from "./projectPersonFinance.service.js";
import * as projectFinanceTabsService from "./projectFinanceTabs.service.js";
import * as projectService from "./project.service.js";
import * as financeGstService from "../../common/finance/financeGst.service.js";

export const list = asyncHandler(async (req, res) => {
  const moduleId = req.query.module;
  sendSuccess(res, await projectService.listProjects({ moduleId }));
});

export const getOne = asyncHandler(async (req, res) => {
  sendSuccess(res, await projectService.getProjectById(req.params.id));
});

export const getTasksKanban = asyncHandler(async (req, res) => {
  sendSuccess(res, await projectService.getProjectTasksKanban(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  sendSuccess(res, await projectService.createProject(req.body), 201);
});

export const update = asyncHandler(async (req, res) => {
  sendSuccess(res, await projectService.updateProject(req.params.id, req.body));
});

export const getPhases = asyncHandler(async (req, res) => {
  sendSuccess(res, await projectService.getProjectPhases(req.params.id));
});

export const updatePhases = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectService.updateProjectPhases(req.params.id, req.body),
  );
});

export const getFinanceSummary = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectFinanceService.getProjectFinanceSummary(req.params.id),
  );
});

export const listFinancePayees = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectPersonFinanceService.listProjectFinancePayees(req.params.id),
  );
});

export const getFinancePayee = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectPersonFinanceService.getProjectFinancePayee(
      req.params.id,
      req.params.payeeKey,
    ),
  );
});

export const listFinanceQuotations = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectFinanceTabsService.listProjectQuotations(
      req.params.id,
      req.query.partyType || "client",
    ),
  );
});

export const createFinanceQuotation = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectFinanceTabsService.createProjectPartyQuotation(
      req.params.id,
      req.body,
    ),
    201,
  );
});

export const listFinancePayments = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectFinanceTabsService.listProjectPayments(
      req.params.id,
      req.query.partyType || "client",
    ),
  );
});

export const createFinanceObligation = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectFinanceTabsService.createProjectPayableObligation(
      req.params.id,
      req.body,
      req.user,
    ),
    201,
  );
});

export const recordFinancePayment = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectFinanceTabsService.recordProjectPayablePayment(
      req.params.id,
      req.params.obligationId,
      req.body,
      req.user,
    ),
  );
});

export const getFinanceLedger = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await financeGstService.getProjectFinanceLedger(req.params.id, req.query),
  );
});

export const listApprovals = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectApprovalService.listProjectApprovals(req.params.id),
  );
});

export const createApproval = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectApprovalService.createProjectApproval(req.params.id, {
      ...req.body,
      actorName: req.user?.name,
    }),
    201,
  );
});

export const sendApproval = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectApprovalService.sendProjectApproval(
      req.params.id,
      req.params.approvalId,
      req.user,
    ),
  );
});

export const clientApprovalAction = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectApprovalService.clientActionOnApproval(
      req.params.id,
      req.params.approvalId,
      req.body,
      req.user,
    ),
  );
});
