import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import { requirePermission } from "../../../core/middleware/authorize.js";
import * as dashboardController from "./dashboard.controller.js";

const router = Router();

router.get(
  "/stats",
  authenticate,
  requirePermission("common.dashboard.view"),
  dashboardController.stats,
);

export default router;
