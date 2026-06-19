/** Dashboard layout profiles — each designation picks one. */
export const DASHBOARD_PROFILES = [
  "executive",
  "sales",
  "finance",
  "operations",
  "general",
];

export const DASHBOARD_PROFILE_LABELS = {
  executive: "Executive / GM",
  sales: "Sales & CRM",
  finance: "Finance & payables",
  operations: "Site / projects & tasks",
  general: "General (minimal)",
};

/** Starter permission bundles when creating a designation (optional seed). */
export const DASHBOARD_PROFILE_DEFAULT_PERMISSIONS = {
  executive: ["*"],
  sales: [
    "common.dashboard.view",
    "residential.enquiries.view",
    "residential.enquiries.create",
    "residential.enquiries.update",
    "residential.enquiries.followup.view",
    "residential.enquiries.followup.create",
    "residential.enquiries.appointment.view",
    "residential.enquiries.appointment.create",
    "residential.enquiries.quotation.send",
    "residential.quotations.view",
    "residential.quotations.update",
    "common.masters.clients.view",
    "common.masters.services.view",
  ],
  finance: [
    "common.dashboard.view",
    "common.payables.view",
    "common.payables.create",
    "common.payables.update",
    "residential.enquiries.view",
    "residential.enquiries.payment.view",
    "residential.enquiries.payment.create",
  ],
  operations: [
    "common.dashboard.view",
    "residential.projects.view",
    "residential.projects.tasks.view",
    "residential.projects.tasks.update",
    "residential.tasks.view",
    "residential.tasks.update",
    "residential.enquiries.view",
  ],
  general: ["common.dashboard.view"],
};
