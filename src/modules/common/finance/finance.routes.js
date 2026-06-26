import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import { requirePermission } from "../../../core/middleware/authorize.js";
import * as financeController from "./finance.controller.js";
import * as txnController from "./financeTransaction.controller.js";

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

router.get(
  "/transactions",
  requirePermission("common.payables.view"),
  txnController.list,
);
router.post(
  "/transactions",
  requirePermission("common.payables.create"),
  txnController.create,
);
router.get(
  "/transactions/overview",
  requirePermission("common.payables.view"),
  txnController.overview,
);
router.get(
  "/transactions/ledger/:personType",
  requirePermission("common.payables.view"),
  txnController.personLedger,
);
router.get(
  "/transactions/project-payees/:projectId",
  requirePermission("common.payables.view"),
  txnController.projectPayees,
);

export default router;
