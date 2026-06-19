import { Router } from "express";
import { authenticate } from "../../core/middleware/auth.js";
import { requirePermission } from "../../core/middleware/authorize.js";
import * as workforceController from "./workforce.controller.js";

const router = Router();

router.use(authenticate);

router.get(
  "/employee-payments",
  requirePermission("workforce.employee_payments.view"),
  workforceController.listEmployeePayments,
);

router.post(
  "/employee-payments",
  requirePermission("workforce.employee_payments.create"),
  workforceController.createEmployeePayment,
);

router.get(
  "/rewards",
  requirePermission("workforce.rewards.view"),
  workforceController.listRewards,
);

router.post(
  "/rewards",
  requirePermission("workforce.rewards.create"),
  workforceController.createReward,
);

router.get(
  "/rewards/me",
  requirePermission("workforce.rewards.view"),
  workforceController.myRewards,
);

router.post(
  "/rewards/redeem",
  requirePermission("workforce.rewards.update"),
  workforceController.redeemRewards,
);

router.get(
  "/reward-rules",
  requirePermission("workforce.rewards.view"),
  workforceController.listRewardRules,
);

router.post(
  "/reward-rules",
  requirePermission("workforce.rewards.update"),
  workforceController.saveRewardRule,
);

router.post(
  "/attendance/check-in",
  requirePermission("workforce.attendance.create"),
  workforceController.checkIn,
);

router.post(
  "/attendance/check-out",
  requirePermission("workforce.attendance.create"),
  workforceController.checkOut,
);

router.get(
  "/attendance",
  requirePermission("workforce.attendance.view"),
  workforceController.listAttendance,
);

router.patch(
  "/attendance/:id/approve",
  requirePermission("workforce.attendance.update"),
  workforceController.approveAttendance,
);

router.get(
  "/timeliness/logs",
  requirePermission("workforce.timeliness.view"),
  workforceController.timelinessLogs,
);

router.get(
  "/timeliness/monthly-report",
  requirePermission("workforce.timeliness.view"),
  workforceController.timelinessMonthlyReport,
);

router.get(
  "/timeliness/employee-summary",
  requirePermission("workforce.timeliness.view"),
  workforceController.timelinessEmployeeSummary,
);

router.post(
  "/timeliness/refresh",
  requirePermission("workforce.timeliness.update"),
  workforceController.timelinessRefresh,
);

export default router;
