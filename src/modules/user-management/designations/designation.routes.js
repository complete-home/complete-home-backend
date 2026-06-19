import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import { requirePermission } from "../../../core/middleware/authorize.js";
import { validate } from "../../../core/middleware/validate.js";
import {
  createDesignationValidation,
  idParam,
  updateDesignationValidation,
  updatePermissionsValidation,
} from "./designation.validation.js";
import * as designationController from "./designation.controller.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("common.masters.designations.view"),
  designationController.list,
);

router.get(
  "/:id",
  idParam,
  validate,
  requirePermission("common.masters.designations.view"),
  designationController.getOne,
);

router.post(
  "/",
  createDesignationValidation,
  validate,
  requirePermission("common.masters.designations.create"),
  designationController.create,
);

router.patch(
  "/:id",
  updateDesignationValidation,
  validate,
  requirePermission("common.masters.designations.update"),
  designationController.update,
);

/** Hierarchical checkbox save — primary RBAC for employees */
router.put(
  "/:id/permissions",
  updatePermissionsValidation,
  validate,
  requirePermission("common.masters.designations.update"),
  designationController.updatePermissions,
);

router.delete(
  "/:id",
  idParam,
  validate,
  requirePermission("common.masters.designations.delete"),
  designationController.remove,
);

export default router;
