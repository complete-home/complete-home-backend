import Enquiry from "../../residential/enquiries/enquiry.model.js";
import EnquiryFollowUp from "../../residential/enquiries/enquiryFollowUp.model.js";
import Project from "../../residential/projects/project.model.js";
import Task from "../../residential/tasks/task.model.js";
import Quotation from "../../residential/quotations/quotation.model.js";
import { resolveUserPermissions } from "../../../core/permissions/resolvePermissions.js";
import { DASHBOARD_PROFILE_LABELS } from "../../../core/permissions/dashboardProfiles.js";
import User from "../../user-management/users/user.model.js";
import Designation from "../../user-management/designations/designation.model.js";
import { markOverdueFollowUps } from "../../residential/enquiries/followUpOverdue.service.js";

function hasPerm(perms, id) {
  return perms.includes("*") || perms.includes(id);
}

function countByStatus(rows, statusKey = "status") {
  const out = {};
  for (const r of rows) {
    const s = r[statusKey] || "Unknown";
    out[s] = (out[s] || 0) + 1;
  }
  return out;
}

async function resolveDashboardProfile(user) {
  if (user.userType === "admin") return "executive";
  if (user.designationId?.dashboardProfile) {
    return user.designationId.dashboardProfile;
  }
  if (user.designationId) {
    const d = await Designation.findById(user.designationId).lean();
    if (d?.dashboardProfile) return d.dashboardProfile;
  }
  return "general";
}

export async function getStaffDashboardStats(
  userId,
  { module = "residential" } = {},
) {
  const user = await User.findById(userId).populate("designationId");
  if (!user) return null;

  const permissions = await resolveUserPermissions(user);
  const profile =
    user.designationId?.dashboardProfile ||
    (await resolveDashboardProfile(user));

  const widgets = {};

  if (hasPerm(permissions, "residential.enquiries.view")) {
    const filter = { businessModule: module };
    if (profile === "sales") {
      filter.salesHeadId = user._id;
    } else if (profile === "project_manager" || profile === "pm") {
      filter.projectHeadId = user._id;
    }
    const enquiries = await Enquiry.find(filter)
      .select("code name status budget updatedAt")
      .sort({ updatedAt: -1 })
      .lean();
    widgets.enquiries = {
      total: enquiries.length,
      byStatus: countByStatus(enquiries),
      recent: enquiries.slice(0, 5).map((e) => ({
        id: e._id.toString(),
        code: e.code,
        name: e.name,
        status: e.status,
        budget: e.budget,
      })),
    };
  }

  if (hasPerm(permissions, "residential.enquiries.followup.view")) {
    await markOverdueFollowUps();
    const followUpFilter = {};
    if (profile === "sales") {
      const scopedEnquiries = await Enquiry.find({
        businessModule: module,
        salesHeadId: user._id,
      })
        .select("_id")
        .lean();
      followUpFilter.enquiryId = {
        $in: scopedEnquiries.map((e) => e._id),
      };
    }
    const followUps = await EnquiryFollowUp.find(followUpFilter)
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();
    const open = followUps.filter((f) =>
      ["Scheduled", "Overdue"].includes(f.status),
    );
    widgets.followUps = {
      openCount: open.length,
      overdueCount: followUps.filter((f) => f.status === "Overdue").length,
      upcoming: open.slice(0, 5).map((f) => ({
        id: f._id.toString(),
        enquiryId: f.enquiryId?.toString(),
        type: f.type,
        status: f.status,
        scheduledAt: f.scheduledAt || f.date,
        note: f.note,
      })),
    };
  }

  if (hasPerm(permissions, "residential.projects.view")) {
    const projectFilter = { businessModule: module };
    if (profile === "project_manager" || profile === "pm") {
      projectFilter.projectHeadId = user._id;
    } else if (profile === "sales") {
      projectFilter.salesHeadId = user._id;
    }
    const projects = await Project.find(projectFilter)
      .select("code name status progress updatedAt")
      .sort({ updatedAt: -1 })
      .lean();
    widgets.projects = {
      total: projects.length,
      byStatus: countByStatus(projects),
      recent: projects.slice(0, 5).map((p) => ({
        id: p._id.toString(),
        code: p.code,
        name: p.name,
        status: p.status,
        progress: p.progress,
      })),
    };
  }

  if (hasPerm(permissions, "residential.tasks.view")) {
    const tasks = await Task.find({ businessModule: module })
      .select("title status priority dueDate assigneeInitials")
      .sort({ updatedAt: -1 })
      .lean();
    const myTasks = tasks.filter(
      (t) =>
        (t.assignedIds || []).includes(userId) ||
        (t.assignedIds || []).includes(user.userId),
    );
    widgets.tasks = {
      total: tasks.length,
      myOpen: myTasks.filter((t) => t.status !== "Done").length,
      byStatus: countByStatus(tasks),
      recent: (myTasks.length ? myTasks : tasks).slice(0, 6).map((t) => ({
        id: t._id.toString(),
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        assigneeInitials: t.assigneeInitials,
      })),
    };
  }

  if (hasPerm(permissions, "residential.quotations.view")) {
    const quotes = await Quotation.find({ businessModule: module })
      .select("code name status variantLabel amount")
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean();
    widgets.quotations = {
      total: quotes.length,
      byStatus: countByStatus(quotes),
      recent: quotes.slice(0, 5).map((q) => ({
        id: q._id.toString(),
        code: q.code,
        name: q.name,
        status: q.status,
        variantLabel: q.variantLabel,
        amount: q.amount,
      })),
    };
  }

  return {
    profile,
    profileLabel: DASHBOARD_PROFILE_LABELS[profile] || profile,
    designationName: user.designationId?.name || null,
    permissions,
    widgets,
  };
}
