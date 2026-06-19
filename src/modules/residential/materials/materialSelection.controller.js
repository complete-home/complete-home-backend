import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as materialService from "./materialSelection.service.js";

export const list = asyncHandler(async (req, res) => {
  sendSuccess(res, await materialService.listMaterialSelections(req.params.id));
});

export const initialize = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await materialService.initializeMaterialSelections(req.params.id),
    201,
  );
});

export const bulkUpdate = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await materialService.bulkUpdateMaterialSelections(req.params.id, req.body),
  );
});

export const addRow = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await materialService.addMaterialSelectionRow(req.params.id, req.body),
    201,
  );
});

export const removeRow = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await materialService.deleteMaterialSelectionRow(
      req.params.id,
      req.params.rowId,
    ),
  );
});
