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
  // ⚡ Get user with minimal data
  const user = await User.findById(userId)
    .select("userId designationId userType")
    .populate("designationId", "name dashboardProfile")
    .lean();
  if (!user) return null;

  const permissions = await resolveUserPermissions(user);
  const profile =
    user.designationId?.dashboardProfile ||
    (await resolveDashboardProfile(user));

  // ⚡ Mark overdue async - don't block response
  markOverdueFollowUps().catch(() => {});

  const widgets = {};
  
  // ⚡ PERFORMANCE: Parallelize all dashboard queries instead of sequential
  const queries = [];
  
  // Enquiries widget
  if (hasPerm(permissions, "residential.enquiries.view")) {
    const filter = { businessModule: module };
    if (profile === "sales") {
      filter.salesHeadId = user._id;
    } else if (profile === "project_manager" || profile === "pm") {
      filter.projectHeadId = user._id;
    }
    queries.push(
      Enquiry.find(filter)
        .select("code name status budget updatedAt")
        .sort({ updatedAt: -1 })
        .limit(50) // Limit to 50 instead of fetching all
        .lean()
        .then((enquiries) => {
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
        })
    );
  }

  // Follow-ups widget
  if (hasPerm(permissions, "residential.enquiries.followup.view")) {
    const followUpFilter = {};
    if (profile === "sales") {
      queries.push(
        Enquiry.find({
          businessModule: module,
          salesHeadId: user._id,
        })
          .select("_id")
          .lean()
          .then((scopedEnquiries) => {
            followUpFilter.enquiryId = {
              $in: scopedEnquiries.map((e) => e._id),
            };
            return EnquiryFollowUp.find(followUpFilter)
              .sort({ updatedAt: -1 })
              .limit(20)
              .lean();
          })
          .then((followUps) => {
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
          })
      );
    } else {
      queries.push(
        EnquiryFollowUp.find(followUpFilter)
          .sort({ updatedAt: -1 })
          .limit(20)
          .lean()
          .then((followUps) => {
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
          })
      );
    }
  }

  // Projects widget
  if (hasPerm(permissions, "residential.projects.view")) {
    const projectFilter = { businessModule: module };
    if (profile === "project_manager" || profile === "pm") {
      projectFilter.projectHeadId = user._id;
    } else if (profile === "sales") {
      projectFilter.salesHeadId = user._id;
    }
    queries.push(
      Project.find(projectFilter)
        .select("code name status progress updatedAt")
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean()
        .then((projects) => {
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
        })
    );
  }

  // Tasks widget
  if (hasPerm(permissions, "residential.tasks.view")) {
    queries.push(
      Task.find({ businessModule: module })
        .select("title status priority dueDate assigneeInitials assignedIds")
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean()
        .then((tasks) => {
          const myTasks = tasks.filter(
            (t) =>
              (t.assignedIds || []).includes(userId) ||
              (t.assignedIds || []).includes(user.userId),
          );
          widgets.tasks = {
            total: tasks.length,
            myOpen: myTasks.filter((t) => t.status !== "done").length,
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
        })
    );
  }

  // Quotations widget
  if (hasPerm(permissions, "residential.quotations.view")) {
    queries.push(
      Quotation.find({ businessModule: module })
        .select("code name status variantLabel amount")
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean()
        .then((quotes) => {
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
        })
    );
  }

  // ⚡ Execute all queries in parallel
  await Promise.all(queries);

  return {
    profile,
    profileLabel: DASHBOARD_PROFILE_LABELS[profile] || profile,
    designationName: user.designationId?.name || null,
    permissions,
    widgets,
  };
}
