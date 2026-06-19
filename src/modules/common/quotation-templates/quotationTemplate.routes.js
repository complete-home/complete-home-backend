import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import { requirePermission } from "../../../core/middleware/authorize.js";
import * as quotationTemplateController from "./quotationTemplate.controller.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission("common.masters.quotation_templates.view"),
  quotationTemplateController.list,
);
router.post(
  "/",
  requirePermission("common.masters.quotation_templates.create"),
  quotationTemplateController.create,
);
router.get(
  "/:id",
  requirePermission("common.masters.quotation_templates.view"),
  quotationTemplateController.getOne,
);
router.patch(
  "/:id",
  requirePermission("common.masters.quotation_templates.update"),
  quotationTemplateController.update,
);
router.delete(
  "/:id",
  requirePermission("common.masters.quotation_templates.delete"),
  quotationTemplateController.remove,
);
router.post(
  "/:id/duplicate",
  requirePermission("common.masters.quotation_templates.create"),
  quotationTemplateController.duplicate,
);
router.get(
  "/:id/versions",
  requirePermission("common.masters.quotation_templates.view"),
  quotationTemplateController.listVersions,
);
router.get(
  "/:id/versions/:version",
  requirePermission("common.masters.quotation_templates.view"),
  quotationTemplateController.getVersion,
);

export default router;
