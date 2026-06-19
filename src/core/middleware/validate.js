import { validationResult } from "express-validator";
import AppError from "../errors/AppError.js";

/** Run after express-validator chains */
export function validate(req, _res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const fields = {};
    for (const err of result.array()) {
      const key = err.path || err.param;
      if (key && !fields[key]) fields[key] = err.msg;
    }
    return next(
      AppError.validation("Please check the highlighted fields", fields),
    );
  }
  next();
}
