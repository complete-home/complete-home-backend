import { ErrorCodes } from "./errorCodes.js";

export default class AppError extends Error {
  /**
   * @param {string} message — human-readable message
   * @param {number} statusCode — HTTP status
   * @param {string} code — ErrorCodes value
   * @param {Record<string, string>|null} fields — validation field errors
   */
  constructor(
    message,
    statusCode = 500,
    code = ErrorCodes.INTERNAL_ERROR,
    fields = null,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, fields = null) {
    return new AppError(message, 400, ErrorCodes.BAD_REQUEST, fields);
  }

  static validation(message, fields = null) {
    return new AppError(message, 422, ErrorCodes.VALIDATION_ERROR, fields);
  }

  static unauthorized(message = "Authentication required") {
    return new AppError(message, 401, ErrorCodes.UNAUTHORIZED);
  }

  static forbidden(message = "You do not have permission for this action") {
    return new AppError(message, 403, ErrorCodes.FORBIDDEN);
  }

  static notFound(resource = "Resource") {
    return new AppError(`${resource} not found`, 404, ErrorCodes.NOT_FOUND);
  }

  static conflict(message) {
    return new AppError(message, 409, ErrorCodes.CONFLICT);
  }
}
