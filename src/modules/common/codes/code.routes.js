import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import AppError from "../../../core/errors/AppError.js";
import { peekCode } from "../../../core/counters/counter.service.js";
import { CODE_REGISTRY } from "./code.registry.js";

const router = Router();
router.use(authenticate);

router.get("/preview/:counterId", async (req, res, next) => {
  try {
    const cfg = CODE_REGISTRY[req.params.counterId];
    if (!cfg) {
      throw AppError.badRequest(
        `Unknown code counter: ${req.params.counterId}`,
      );
    }
    const code = await peekCode(
      req.params.counterId,
      cfg.prefix,
      cfg.pad,
      cfg.startAt,
    );
    sendSuccess(res, { code, counterId: req.params.counterId });
  } catch (err) {
    next(err);
  }
});

export default router;
