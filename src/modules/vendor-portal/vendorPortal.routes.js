import { Router } from "express";
import { authenticate } from "../../core/middleware/auth.js";
import { requirePermission } from "../../core/middleware/authorize.js";
import { requireUserType } from "../../core/middleware/requireUserType.js";
import * as vendorPortalController from "./vendorPortal.controller.js";

const router = Router();

router.use(authenticate);
router.use(requireUserType("vendor"));

router.get(
  "/dashboard",
  requirePermission("vendor.orders.view"),
  vendorPortalController.dashboard,
);

router.get(
  "/orders",
  requirePermission("vendor.orders.view"),
  vendorPortalController.orders,
);

router.get(
  "/quotations",
  requirePermission("vendor.quotations.view"),
  vendorPortalController.quotations,
);

router.post(
  "/quotations/:id/submit",
  requirePermission("vendor.quotations.create"),
  vendorPortalController.submitQuotation,
);

export default router;
