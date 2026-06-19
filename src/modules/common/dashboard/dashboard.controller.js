import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import { getStaffDashboardStats } from "./dashboard.service.js";

export const stats = asyncHandler(async (req, res) => {
  const module = req.query.module || req.user?.businessModule || "residential";
  const data = await getStaffDashboardStats(req.user._id, { module });
  sendSuccess(res, data);
});
