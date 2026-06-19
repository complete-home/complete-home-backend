import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import { requirePermission } from "../../../core/middleware/authorize.js";
import * as notificationController from "./notification.controller.js";

const router = Router();
router.use(authenticate);

router.get(
  "/logs",
  requirePermission("common.notifications.view"),
  notificationController.listLogs,
);

export default router;
