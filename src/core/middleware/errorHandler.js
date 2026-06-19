import AppError from "../errors/AppError.js";
import { ErrorCodes } from "../errors/errorCodes.js";
import { sendError } from "../http/apiResponse.js";
import { Messages } from "../http/messages.js";
import { env } from "../../config/env.js";

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return sendError(
      res,
      {
        code: err.code,
        message: err.message,
        fields: err.fields,
      },
      err.statusCode,
    );
  }

  if (err.name === "ValidationError") {
    const fields = {};
    for (const [key, val] of Object.entries(err.errors || {})) {
      fields[key] = val.message;
    }
    return sendError(
      res,
      {
        code: ErrorCodes.VALIDATION_ERROR,
        message: "Validation failed",
        fields,
      },
      422,
    );
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return sendError(
      res,
      {
        code: ErrorCodes.CONFLICT,
        message: `Duplicate value for ${field}`,
        fields: { [field]: "Already exists" },
      },
      409,
    );
  }

  if (env.nodeEnv !== "production") {
    console.error(err);
  }

  return sendError(
    res,
    {
      code: ErrorCodes.INTERNAL_ERROR,
      message: Messages.generic.serverError,
      fields: null,
    },
    500,
  );
}
