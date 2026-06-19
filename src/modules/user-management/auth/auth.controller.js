import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import { Messages } from "../../../core/http/messages.js";
import * as authService from "./auth.service.js";

export const login = asyncHandler(async (req, res) => {
  const { userId, password, businessModule } = req.body;
  const data = await authService.login(userId, password, businessModule);
  sendSuccess(res, data);
});

export const me = asyncHandler(async (req, res) => {
  const data = await authService.getMe(req.user._id);
  sendSuccess(res, data);
});

export const invitePreview = asyncHandler(async (req, res) => {
  sendSuccess(res, await authService.previewInvite(req.query.token));
});

export const acceptInvite = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await authService.acceptInvite(req.body.token, req.body.password),
  );
});

export const health = asyncHandler(async (_req, res) => {
  sendSuccess(res, { status: "ok", message: Messages.auth.loginSuccess });
});
