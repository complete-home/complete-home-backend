import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import { requirePermission } from "../../../core/middleware/authorize.js";
import * as workflowController from "./workflow.controller.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission("residential.workflows.view"),
  workflowController.list,
);
router.get(
  "/:id",
  requirePermission("residential.workflows.view"),
  workflowController.getOne,
);
router.post(
  "/",
  requirePermission("residential.workflows.create"),
  workflowController.create,
);
router.patch(
  "/:id",
  requirePermission("residential.workflows.update"),
  workflowController.update,
);
router.post(
  "/:id/publish",
  requirePermission("residential.workflows.publish"),
  workflowController.publish,
);

export default router;
