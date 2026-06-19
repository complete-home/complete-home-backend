import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import { requirePermission } from "../../../core/middleware/authorize.js";
import * as vendorQuotationController from "./vendorQuotation.controller.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission("common.payables.view"),
  vendorQuotationController.list,
);

router.post(
  "/upload-attachment",
  requirePermission("common.payables.create"),
  vendorQuotationController.uploadAttachment,
);

router.post(
  "/capture",
  requirePermission("common.payables.create"),
  vendorQuotationController.capture,
);

router.post(
  "/",
  requirePermission("common.payables.create"),
  vendorQuotationController.createRequest,
);

router.get(
  "/:id",
  requirePermission("common.payables.view"),
  vendorQuotationController.getOne,
);

router.patch(
  "/:id",
  requirePermission("common.payables.update"),
  vendorQuotationController.update,
);

export default router;
