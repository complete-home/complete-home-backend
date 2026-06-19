import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import { requirePermission } from "../../../core/middleware/authorize.js";
import * as payableController from "./payable.controller.js";

const router = Router();
router.use(authenticate);

router.get(
  "/summary",
  requirePermission("common.payables.view"),
  payableController.summary,
);

router.get(
  "/obligations",
  requirePermission("common.payables.view"),
  payableController.listObligations,
);
router.get(
  "/obligations/:id",
  requirePermission("common.payables.view"),
  payableController.getObligation,
);
router.post(
  "/obligations",
  requirePermission("common.payables.create"),
  payableController.createObligation,
);
router.patch(
  "/obligations/:id",
  requirePermission("common.payables.update"),
  payableController.updateObligation,
);
router.post(
  "/obligations/:id/payments",
  requirePermission("common.payables.create"),
  payableController.recordPayment,
);

router.get(
  "/cashflow",
  requirePermission("common.payables.view"),
  payableController.cashflow,
);

router.get(
  "/export.csv",
  requirePermission("common.payables.view"),
  payableController.exportCsv,
);

export default router;
