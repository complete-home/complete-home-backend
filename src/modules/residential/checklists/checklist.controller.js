import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as checklistService from "./checklist.service.js";

export const list = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await checklistService.listProjectChecklists(req.params.id, {
      phase: req.query.phase,
      sheetCode: req.query.sheetCode,
    }),
  );
});

export const initialize = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await checklistService.initializeProjectChecklists(req.params.id, req.body),
    201,
  );
});

export const bulkUpdate = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await checklistService.bulkUpdateChecklistInstances(
      req.params.id,
      req.body,
    ),
  );
});

export const attachWorkflow = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await checklistService.attachWorkflowToSection(req.params.id, req.body),
    201,
  );
});

export const addItem = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await checklistService.addCustomChecklistItem(req.params.id, req.body),
    201,
  );
});

export const removeItem = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await checklistService.deleteChecklistItem(
      req.params.id,
      req.params.itemId,
    ),
  );
});
