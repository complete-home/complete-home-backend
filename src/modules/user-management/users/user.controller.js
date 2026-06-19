import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as userService from "./user.service.js";

export const listEmployees = asyncHandler(async (_req, res) => {
  sendSuccess(res, await userService.listEmployees());
});

export const createEmployee = asyncHandler(async (req, res) => {
  sendSuccess(res, await userService.createEmployee(req.body), 201);
});

export const updateEmployee = asyncHandler(async (req, res) => {
  sendSuccess(res, await userService.updateEmployee(req.params.id, req.body));
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  sendSuccess(res, await userService.deleteEmployee(req.params.id));
});
