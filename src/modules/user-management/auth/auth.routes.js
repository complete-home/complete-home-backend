import { Router } from "express";
import { validate } from "../../../core/middleware/validate.js";
import { authenticate } from "../../../core/middleware/auth.js";
import { loginValidation } from "./auth.validation.js";
import * as authController from "./auth.controller.js";

const router = Router();

router.post("/login", loginValidation, validate, authController.login);
router.get("/me", authenticate, authController.me);
router.get("/invite-preview", authController.invitePreview);
router.post("/accept-invite", authController.acceptInvite);

export default router;
