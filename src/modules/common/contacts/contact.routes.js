import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import { requirePermission } from "../../../core/middleware/authorize.js";
import * as contactController from "./contact.controller.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission("common.contacts.view"),
  contactController.listContacts,
);

router.post(
  "/import-crm",
  requirePermission("common.contacts.import"),
  contactController.importFromCrm,
);

router.get(
  "/:id",
  requirePermission("common.contacts.view"),
  contactController.getContact,
);

router.post(
  "/",
  requirePermission("common.contacts.create"),
  contactController.createContact,
);

router.patch(
  "/:id",
  requirePermission("common.contacts.update"),
  contactController.updateContact,
);

router.delete(
  "/:id",
  requirePermission("common.contacts.delete"),
  contactController.deleteContact,
);

router.post(
  "/:id/share",
  requirePermission("common.contacts.share"),
  contactController.shareContact,
);

router.post(
  "/:id/log-call",
  requirePermission("common.contacts.call"),
  contactController.logCall,
);

export default router;
