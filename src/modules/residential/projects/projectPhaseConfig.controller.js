import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import * as phaseConfigService from "./projectPhaseConfig.service.js";

export const get = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await phaseConfigService.getOrCreatePhaseConfig(req.params.id),
  );
});

export const addSection = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await phaseConfigService.addPhaseSection(req.params.id, req.body),
    201,
  );
});

export const addMaterialCategory = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await phaseConfigService.addMaterialCategory(req.params.id, req.body),
    201,
  );
});

export const addMaterialSubTab = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await phaseConfigService.addMaterialSubTab(req.params.id, req.body),
    201,
  );
});

export const updateSection = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await phaseConfigService.updatePhaseSection(req.params.id, req.body),
  );
});

export const deleteSection = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await phaseConfigService.deletePhaseSection(req.params.id, {
      phase: req.query.phase,
      sectionId: req.params.sectionId,
    }),
  );
});
