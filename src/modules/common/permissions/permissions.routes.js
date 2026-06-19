import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import { requirePermission } from "../../../core/middleware/authorize.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { PERMISSION_TREE } from "../../../core/permissions/permissionTree.js";
import { ROLE_TEMPLATES } from "../../../core/permissions/permissionTree.js";

const router = Router();

router.get(
  "/tree",
  authenticate,
  requirePermission("common.masters.designations.view"),
  asyncHandler(async (_req, res) => {
    sendSuccess(res, { tree: PERMISSION_TREE, templates: ROLE_TEMPLATES });
  }),
);

export default router;
