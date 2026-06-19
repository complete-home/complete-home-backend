/** Wrap async route handlers — forwards errors to error middleware */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
