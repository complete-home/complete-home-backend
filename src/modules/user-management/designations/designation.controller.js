import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import { Messages } from "../../../core/http/messages.js";
import * as designationService from "./designation.service.js";

export const list = asyncHandler(async (_req, res) => {
  const data = await designationService.listDesignations();
  sendSuccess(res, data);
});

export const getOne = asyncHandler(async (req, res) => {
  const data = await designationService.getDesignation(req.params.id);
  sendSuccess(res, data);
});

export const create = asyncHandler(async (req, res) => {
  const data = await designationService.createDesignation(req.body);
  sendSuccess(res, data, 201);
});

export const update = asyncHandler(async (req, res) => {
  const data = await designationService.updateDesignation(
    req.params.id,
    req.body,
  );
  sendSuccess(res, data);
});

export const updatePermissions = asyncHandler(async (req, res) => {
  const data = await designationService.updateDesignationPermissions(
    req.params.id,
    req.body.permissionIds,
  );
  sendSuccess(res, data);
});

export const remove = asyncHandler(async (req, res) => {
  await designationService.deleteDesignation(req.params.id);
  sendSuccess(res, { message: Messages.designation.deleted });
});
