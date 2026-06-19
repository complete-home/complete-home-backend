import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as organizationService from "./organization.service.js";

export const listBranches = asyncHandler(async (_req, res) => {
  sendSuccess(res, await organizationService.listBranches());
});

export const createBranch = asyncHandler(async (req, res) => {
  sendSuccess(res, await organizationService.createBranch(req.body), 201);
});

export const updateBranch = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await organizationService.updateBranch(req.params.id, req.body),
  );
});

export const deleteBranch = asyncHandler(async (req, res) => {
  sendSuccess(res, await organizationService.deleteBranch(req.params.id));
});

export const listDepartments = asyncHandler(async (_req, res) => {
  sendSuccess(res, await organizationService.listDepartments());
});

export const createDepartment = asyncHandler(async (req, res) => {
  sendSuccess(res, await organizationService.createDepartment(req.body), 201);
});

export const updateDepartment = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await organizationService.updateDepartment(req.params.id, req.body),
  );
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  sendSuccess(res, await organizationService.deleteDepartment(req.params.id));
});

export const getCompany = asyncHandler(async (_req, res) => {
  sendSuccess(res, await organizationService.getCompany());
});

export const updateCompany = asyncHandler(async (req, res) => {
  sendSuccess(res, await organizationService.updateCompany(req.body));
});
