import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import { requirePermission } from "../../../core/middleware/authorize.js";
import * as financeController from "./finance.controller.js";

const router = Router();
router.use(authenticate);

router.get(
  "/gst-report",
  requirePermission("common.payables.view"),
  financeController.getGstReport,
);

router.get(
  "/overview",
  requirePermission("common.payables.view"),
  financeController.getFinanceOverview,
);

export default router;
