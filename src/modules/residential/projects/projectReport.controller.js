import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as projectReportService from "./projectReport.service.js";

export const getReport = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectReportService.getProjectReport(
      req.params.id,
      req.query.team || "mcs",
    ),
  );
});

export const getAllReports = asyncHandler(async (req, res) => {
  sendSuccess(res, await projectReportService.getAllProjectReports(req.params.id));
});

export const patchReportValues = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectReportService.updateProjectReportValues(
      req.params.id,
      req.body.team,
      req.body.values || {},
    ),
  );
});

export const listFieldDefinitions = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectReportService.listReportFieldDefinitions(req.query.team),
  );
});

export const createFieldDefinition = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectReportService.createReportFieldDefinition(req.body),
    201,
  );
});

export const listPortfolio = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await projectReportService.listPortfolioReports({
      team: req.query.team,
      moduleId: req.query.module,
    }),
  );
});
