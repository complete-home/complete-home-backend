import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import { requirePermission } from "../../../core/middleware/authorize.js";
import * as organizationController from "./organization.controller.js";

const router = Router();
router.use(authenticate);

router.get(
  "/branches",
  requirePermission("common.masters.branches.view"),
  organizationController.listBranches,
);
router.post(
  "/branches",
  requirePermission("common.masters.branches.create"),
  organizationController.createBranch,
);
router.patch(
  "/branches/:id",
  requirePermission("common.masters.branches.update"),
  organizationController.updateBranch,
);
router.delete(
  "/branches/:id",
  requirePermission("common.masters.branches.delete"),
  organizationController.deleteBranch,
);

router.get(
  "/departments",
  requirePermission("common.masters.departments.view"),
  organizationController.listDepartments,
);
router.post(
  "/departments",
  requirePermission("common.masters.departments.create"),
  organizationController.createDepartment,
);
router.patch(
  "/departments/:id",
  requirePermission("common.masters.departments.update"),
  organizationController.updateDepartment,
);
router.delete(
  "/departments/:id",
  requirePermission("common.masters.departments.delete"),
  organizationController.deleteDepartment,
);

router.get(
  "/company",
  requirePermission("common.company.view"),
  organizationController.getCompany,
);
router.put(
  "/company",
  requirePermission("common.company.update"),
  organizationController.updateCompany,
);

export default router;
