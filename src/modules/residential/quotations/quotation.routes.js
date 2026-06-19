import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import { requirePermission } from "../../../core/middleware/authorize.js";
import * as quotationController from "./quotation.controller.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission("residential.quotations.view"),
  quotationController.list,
);
router.get(
  "/:id",
  requirePermission("residential.quotations.view"),
  quotationController.getOne,
);
router.post(
  "/",
  requirePermission("residential.quotations.create"),
  quotationController.create,
);

export default router;
