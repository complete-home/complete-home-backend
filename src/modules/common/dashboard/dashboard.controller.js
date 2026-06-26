import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import { getStaffDashboardStats } from "./dashboard.service.js";
import { getHrDashboardStats } from "./hrDashboard.service.js";

export const stats = asyncHandler(async (req, res) => {
  const module = req.query.module || req.user?.businessModule || "residential";
  const data =
    module === "hr"
      ? await getHrDashboardStats(req.user._id)
      : await getStaffDashboardStats(req.user._id, { module });
  sendSuccess(res, data);
});
