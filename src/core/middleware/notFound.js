import AppError from "../errors/AppError.js";

export function notFoundHandler(req, _res, next) {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl}`));
}
