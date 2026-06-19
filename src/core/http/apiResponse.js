/** Standard API envelope — matches plan/09-api-architecture.md */
export function sendSuccess(res, data = null, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
  });
}

export function sendError(
  res,
  { code, message, fields = null },
  statusCode = 500,
) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: { code, message, fields },
  });
}
