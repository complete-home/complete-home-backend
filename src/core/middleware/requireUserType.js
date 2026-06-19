import AppError from "../errors/AppError.js";

export function requireUserType(...allowedTypes) {
  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!allowedTypes.includes(req.user.userType)) {
      return next(
        AppError.forbidden(
          `This area is restricted to: ${allowedTypes.join(", ")}`,
        ),
      );
    }
    next();
  };
}
