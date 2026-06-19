import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import { requirePermission } from "../../../core/middleware/authorize.js";
import * as userController from "./user.controller.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission("common.masters.employees.view"),
  userController.listEmployees,
);
router.post(
  "/",
  requirePermission("common.masters.employees.create"),
  userController.createEmployee,
);
router.patch(
  "/:id",
  requirePermission("common.masters.employees.update"),
  userController.updateEmployee,
);
router.delete(
  "/:id",
  requirePermission("common.masters.employees.delete"),
  userController.deleteEmployee,
);

export default router;
