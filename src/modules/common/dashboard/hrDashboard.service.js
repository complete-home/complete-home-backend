import User from "../../user-management/users/user.model.js";
import Attendance from "../../workforce/attendance.model.js";
import { resolveUserPermissions } from "../../../core/permissions/resolvePermissions.js";
import { DASHBOARD_PROFILE_LABELS } from "../../../core/permissions/dashboardProfiles.js";
import Designation from "../../user-management/designations/designation.model.js";

function countMap(values) {
  const out = {};
  for (const v of values) {
    if (!v) continue;
    out[v] = (out[v] || 0) + 1;
  }
  return out;
}

function upcomingDates(employees, field, daysAhead = 30) {
  const now = new Date();
  const results = [];
  for (const e of employees) {
    const raw = e.profile?.[field];
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const thisYear = new Date(now.getFullYear(), d.getMonth(), d.getDate());
    if (thisYear < now) thisYear.setFullYear(now.getFullYear() + 1);
    const diff = Math.ceil((thisYear - now) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff <= daysAhead) {
      results.push({
        id: e._id.toString(),
        name: e.name,
        date: thisYear.toISOString().slice(0, 10),
        daysUntil: diff,
      });
    }
  }
  return results.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 8);
}

export async function getHrDashboardStats(userId) {
  const user = await User.findById(userId).populate("designationId");
  if (!user) return null;

  const permissions = await resolveUserPermissions(user);
  const profile =
    user.designationId?.dashboardProfile ||
    (user.userType === "admin" ? "executive" : "general");

  const employees = await User.find({
    userType: "employee",
    status: "Active",
  })
    .select("name userId profile createdAt updatedAt")
    .sort({ name: 1 })
    .lean();

  const today = new Date().toISOString().slice(0, 10);
  const attendanceToday = await Attendance.find({ date: today })
    .select("userId status")
    .lean();

  const presentIds = new Set(
    attendanceToday
      .filter((a) => ["open", "pending_approval", "approved"].includes(a.status))
      .map((a) => a.userId.toString()),
  );
  const onLeaveIds = new Set(
    attendanceToday
      .filter((a) => a.status === "rejected")
      .map((a) => a.userId.toString()),
  );

  const totalEmployees = employees.length;
  const presentEmployees = presentIds.size;
  const onLeaveEmployees = onLeaveIds.size;
  const absentEmployees = Math.max(
    0,
    totalEmployees - presentEmployees - onLeaveEmployees,
  );

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newJoiners = employees
    .filter((e) => new Date(e.createdAt) >= thirtyDaysAgo)
    .slice(0, 6)
    .map((e) => ({
      id: e._id.toString(),
      name: e.name,
      joinedAt: e.createdAt,
      teams: e.profile?.teams || [],
    }));

  const deptValues = [];
  const teamValues = [];
  for (const e of employees) {
    for (const d of e.profile?.departments || []) deptValues.push(d);
    for (const t of e.profile?.teams || []) teamValues.push(t);
  }

  const recentActivities = employees
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 6)
    .map((e) => ({
      id: e._id.toString(),
      name: e.name,
      action: "Profile updated",
      at: e.updatedAt,
    }));

  return {
    profile,
    profileLabel: DASHBOARD_PROFILE_LABELS[profile] || profile,
    designationName: user.designationId?.name || null,
    permissions,
    widgets: {
      hr: {
        totalEmployees,
        presentEmployees,
        absentEmployees,
        onLeaveEmployees,
        newJoinersCount: newJoiners.length,
        newJoiners,
        attendanceSummary: {
          present: presentEmployees,
          absent: absentEmployees,
          onLeave: onLeaveEmployees,
        },
        byDepartment: countMap(deptValues),
        byTeam: countMap(teamValues),
        upcomingBirthdays: upcomingDates(employees, "dateOfBirth"),
        upcomingAnniversaries: upcomingDates(employees, "joiningDate"),
        recentActivities,
      },
    },
  };
}
