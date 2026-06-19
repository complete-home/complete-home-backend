import { asyncHandler } from "../../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../../core/http/apiResponse.js";
import NotificationLog from "./notificationLog.model.js";

export const listLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 300);
  const filter = {};
  if (req.query.template) filter.template = req.query.template;
  const rows = await NotificationLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  sendSuccess(
    res,
    rows.map((r) => ({
      id: r._id.toString(),
      channel: r.channel,
      template: r.template,
      recipient: r.recipient,
      status: r.status,
      subject: r.subject,
      createdAt: r.createdAt,
      meta: r.meta,
    })),
  );
});
