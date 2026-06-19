import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as workflowService from "./workflow.service.js";

export const list = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await workflowService.listWorkflows({ moduleId: req.query.module }),
  );
});

export const getOne = asyncHandler(async (req, res) => {
  sendSuccess(res, await workflowService.getWorkflowById(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  sendSuccess(res, await workflowService.createWorkflow(req.body), 201);
});

export const update = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await workflowService.updateWorkflow(req.params.id, req.body),
  );
});

export const publish = asyncHandler(async (req, res) => {
  sendSuccess(res, await workflowService.publishWorkflow(req.params.id));
});
