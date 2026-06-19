import AppError from "../../core/errors/AppError.js";
import RewardRule from "./rewardRule.model.js";
import RewardLedger from "./rewardLedger.model.js";
import User from "../user-management/users/user.model.js";

export async function listRewardRules() {
  const rows = await RewardRule.find().sort({ eventType: 1 });
  return rows.map((r) => {
    const o = r.toObject();
    return {
      id: o._id.toString(),
      eventType: o.eventType,
      label: o.label,
      description: o.description,
      points: o.points,
      active: o.active,
    };
  });
}

export async function upsertRewardRule(body) {
  if (body.id) {
    const row = await RewardRule.findByIdAndUpdate(
      body.id,
      {
        eventType: body.eventType,
        label: body.label,
        description: body.description,
        points: Number(body.points),
        active: body.active !== false,
      },
      { new: true },
    );
    if (!row) return null;
    const o = row.toObject();
    return {
      id: o._id.toString(),
      eventType: o.eventType,
      label: o.label,
      points: o.points,
      active: o.active,
    };
  }
  const row = await RewardRule.create({
    eventType: body.eventType,
    label: body.label,
    description: body.description || "",
    points: Number(body.points),
    active: body.active !== false,
  });
  const o = row.toObject();
  return {
    id: o._id.toString(),
    eventType: o.eventType,
    label: o.label,
    points: o.points,
    active: o.active,
  };
}

/**
 * Apply active rule once per refId (idempotent).
 */
export async function applyRewardForEvent(
  eventType,
  userId,
  { refType, refId, actor } = {},
) {
  const rule = await RewardRule.findOne({ eventType, active: true });
  if (!rule || !rule.points) return null;
  if (refId) {
    const dup = await RewardLedger.findOne({
      userId,
      refType: refType || eventType,
      refId,
    });
    if (dup) return null;
  }
  const user = await User.findById(userId).select("name");
  if (!user) return null;
  const doc = await RewardLedger.create({
    userId,
    points: rule.points,
    reason: rule.label,
    refType: refType || eventType,
    refId: refId || "",
    createdBy: actor?.name || "System",
  });
  return {
    id: doc._id.toString(),
    points: doc.points,
    reason: doc.reason,
  };
}

export async function redeemRewards(body, actor) {
  const user = await User.findById(body.userId);
  if (!user) throw new Error("Employee not found");
  const pts = Number(body.points);
  if (!Number.isFinite(pts) || pts <= 0) throw new Error("Invalid points");
  const rows = await RewardLedger.aggregate([
    { $match: { userId: user._id } },
    { $group: { _id: null, total: { $sum: "$points" } } },
  ]);
  const balance = rows[0]?.total || 0;
  if (balance < pts) {
    throw AppError.badRequest(`Insufficient balance (${balance} pts)`);
  }
  const doc = await RewardLedger.create({
    userId: user._id,
    points: -pts,
    reason: body.reason || "Points redeemed",
    refType: "redemption",
    refId: body.voucherCode || body.reason || "",
    createdBy: actor?.name || "Admin",
  });
  return {
    id: doc._id.toString(),
    points: doc.points,
    balanceAfter: balance - pts,
  };
}
