import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate } from "../../../core/middleware/auth.js";
import { validate } from "../../../core/middleware/validate.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import AppError from "../../../core/errors/AppError.js";
import Lookup from "./lookup.model.js";

const router = Router();

/** Bootstrap all lookup keys for frontend hydrate */
router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
    const docs = await Lookup.find().lean();
    const data = {};
    for (const d of docs) data[d.key] = d.values;
    sendSuccess(res, data);
  }),
);

router.get(
  "/:key",
  authenticate,
  asyncHandler(async (req, res) => {
    let doc = await Lookup.findOne({ key: req.params.key });
    if (!doc) {
      doc = await Lookup.create({ key: req.params.key, values: [] });
    }
    sendSuccess(res, { key: doc.key, values: doc.values });
  }),
);

router.post(
  "/:key/values",
  authenticate,
  param("key").notEmpty(),
  body("value").trim().notEmpty().withMessage("Value is required"),
  validate,
  asyncHandler(async (req, res) => {
    const doc = await Lookup.findOneAndUpdate(
      { key: req.params.key },
      { $addToSet: { values: req.body.value.trim() } },
      { upsert: true, new: true },
    );
    sendSuccess(res, { key: doc.key, values: doc.values });
  }),
);

router.delete(
  "/:key/values/:value",
  authenticate,
  asyncHandler(async (req, res) => {
    const value = decodeURIComponent(req.params.value || "").trim();
    if (!value) throw AppError.badRequest("Value is required");
    const doc = await Lookup.findOneAndUpdate(
      { key: req.params.key },
      { $pull: { values: value } },
      { new: true },
    );
    if (!doc) throw AppError.notFound("Lookup not found");
    sendSuccess(res, { key: doc.key, values: doc.values });
  }),
);

export default router;
