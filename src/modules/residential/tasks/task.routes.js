import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import { requirePermission } from "../../../core/middleware/authorize.js";
import * as taskController from "./task.controller.js";

const router = Router();
router.use(authenticate);

router.get(
  "/assignees",
  requirePermission("residential.tasks.view"),
  taskController.assignees,
);
router.get(
  "/",
  requirePermission("residential.tasks.view"),
  taskController.list,
);
router.get(
  "/:id",
  requirePermission("residential.tasks.view"),
  taskController.getOne,
);
router.post(
  "/",
  requirePermission("residential.tasks.create"),
  taskController.create,
);
router.patch(
  "/:id",
  requirePermission("residential.tasks.update"),
  taskController.update,
);
router.delete(
  "/:id",
  requirePermission("residential.tasks.delete"),
  taskController.remove,
);

export default router;
