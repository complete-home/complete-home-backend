/**
 * Residential sidebar menus ↔ minimum view permissions.
 * Services catalog menu is only in the Services business module.
 */

export const RESIDENTIAL_MENU_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard",
    section: "main",
    permission: "common.dashboard.view",
  },
  {
    key: "payables",
    label: "Vendor Payables",
    section: "main",
    permission: "common.payables.view",
  },
  {
    key: "companyProfile",
    label: "Company Profile",
    section: "main",
    permission: "common.company.view",
  },
  {
    key: "branches",
    label: "Branches",
    section: "masters",
    permission: "common.masters.branches.view",
  },
  {
    key: "departments",
    label: "Departments",
    section: "masters",
    permission: "common.masters.departments.view",
  },
  {
    key: "designations",
    label: "Designations",
    section: "masters",
    permission: "common.masters.designations.view",
  },
  {
    key: "gallery",
    label: "Gallery",
    section: "masters",
    permission: "common.masters.gallery.view",
  },
  {
    key: "employees",
    label: "Employees",
    section: "masters",
    permission: "common.masters.employees.view",
  },
  {
    key: "vendors",
    label: "Vendors",
    section: "masters",
    permission: "common.masters.vendors.view",
  },
  {
    key: "clients",
    label: "Clients",
    section: "masters",
    permission: "common.masters.clients.view",
  },
  {
    key: "products",
    label: "Products",
    section: "masters",
    permission: "common.masters.products.view",
  },
  {
    key: "quotationTemplates",
    label: "Quotation Templates",
    section: "masters",
    permission: "common.masters.quotation_templates.view",
  },
  {
    key: "employeePayments",
    label: "Employee Payments",
    section: "masters",
    permission: "workforce.employee_payments.view",
  },
  {
    key: "rewards",
    label: "Rewards",
    section: "masters",
    permission: "workforce.rewards.view",
  },
  {
    key: "attendance",
    label: "Attendance",
    section: "masters",
    permission: "workforce.attendance.view",
  },
  {
    key: "timeliness",
    label: "On-time report",
    section: "masters",
    permission: "workforce.timeliness.view",
  },
  {
    key: "tasks",
    label: "Tasks",
    section: "masters",
    permission: "residential.tasks.view",
  },
  {
    key: "workflows",
    label: "Workflows",
    section: "masters",
    permission: "residential.workflows.view",
  },
  {
    key: "enquiries",
    label: "Enquiries",
    section: "masters",
    permission: "residential.enquiries.view",
  },
  {
    key: "projects",
    label: "Projects",
    section: "masters",
    permission: "residential.projects.view",
  },
  {
    key: "quotations",
    label: "Quotations",
    section: "masters",
    permission: "residential.quotations.view",
  },
];

const MENU_KEY_SET = new Set(RESIDENTIAL_MENU_ITEMS.map((m) => m.key));

export function validateMenuAccess(keys) {
  if (!Array.isArray(keys)) return [];
  return [...new Set(keys.filter((k) => MENU_KEY_SET.has(k)))];
}

/** Map selected menu keys to minimum view permission IDs. */
export function menuKeysToPermissionIds(menuKeys) {
  const ids = new Set();
  for (const key of validateMenuAccess(menuKeys)) {
    const item = RESIDENTIAL_MENU_ITEMS.find((m) => m.key === key);
    if (item?.permission) ids.add(item.permission);
  }
  return [...ids];
}

export function getMenuSections() {
  const main = RESIDENTIAL_MENU_ITEMS.filter((m) => m.section === "main");
  const masters = RESIDENTIAL_MENU_ITEMS.filter((m) => m.section === "masters");
  return [
    { id: "main", title: "Main menu", items: main },
    { id: "masters", title: "Masters & CRM", items: masters },
  ];
}
