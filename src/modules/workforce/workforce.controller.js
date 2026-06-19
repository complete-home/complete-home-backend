import { asyncHandler } from "../../core/errors/asyncHandler.js";
import { sendSuccess } from "../../core/http/apiResponse.js";
import * as workforceService from "./workforce.service.js";
import * as timelinessService from "./timeliness.service.js";
import * as attendanceService from "./attendance.service.js";
import * as rewardRulesService from "./rewardRules.service.js";

export const listEmployeePayments = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await workforceService.listEmployeePayments({
      employeeId: req.query.employeeId,
    }),
  );
});

export const createEmployeePayment = asyncHandler(async (req, res) => {
  sendSuccess(res, await workforceService.createEmployeePayment(req.body), 201);
});

export const listRewards = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await workforceService.listRewards({ userId: req.query.userId }),
  );
});

export const createReward = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await workforceService.createRewardEntry(req.body, req.user),
    201,
  );
});

export const checkIn = asyncHandler(async (req, res) => {
  sendSuccess(res, await attendanceService.checkIn(req.user, req.body), 201);
});

export const checkOut = asyncHandler(async (req, res) => {
  sendSuccess(res, await attendanceService.checkOut(req.user, req.body));
});

export const listAttendance = asyncHandler(async (req, res) => {
  const scopedUserId =
    req.query.userId ||
    (req.user.userType === "employee" ? req.user._id.toString() : undefined);
  sendSuccess(
    res,
    await attendanceService.listAttendance({
      userId: scopedUserId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      status: req.query.status,
      businessModule: req.query.module || req.businessModule,
    }),
  );
});

export const approveAttendance = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await attendanceService.approveAttendance(
      req.params.id,
      req.body,
      req.user,
    ),
  );
});

export const listRewardRules = asyncHandler(async (req, res) => {
  sendSuccess(res, await rewardRulesService.listRewardRules());
});

export const saveRewardRule = asyncHandler(async (req, res) => {
  sendSuccess(res, await rewardRulesService.upsertRewardRule(req.body), 201);
});

export const redeemRewards = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await rewardRulesService.redeemRewards(req.body, req.user),
    201,
  );
});

export const myRewards = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await workforceService.listRewards({ userId: req.user._id.toString() }),
  );
});

export const timelinessLogs = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await timelinessService.listTimelinessLogs({
      month: req.query.month,
      entityType: req.query.entityType,
      userId: req.query.userId,
      limit: req.query.limit,
    }),
  );
});

export const timelinessMonthlyReport = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await timelinessService.getMonthlyTimelinessReport({
      year: parseInt(req.query.year, 10) || undefined,
      month: parseInt(req.query.month, 10) || undefined,
      businessModule: req.query.module || req.businessModule,
    }),
  );
});

export const timelinessEmployeeSummary = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await timelinessService.getEmployeeTimelinessSummary({
      businessModule: req.query.module || req.businessModule,
    }),
  );
});

export const timelinessRefresh = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await timelinessService.refreshOpenTimeliness({
      businessModule: req.query.module || req.businessModule,
    }),
  );
});
