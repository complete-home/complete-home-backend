/**
 * Hierarchical permission tree for admin role editor.
 * Each node: { id, label, children? }
 * Leaf nodes use action suffixes: .view .create .update .delete .approve .send .export .publish
 *
 * Do not rename IDs once in production — they are stored in DB and JWT.
 */

const actions = (base, labels) =>
  labels.map((action) => ({
    id: `${base}.${action}`,
    label: action.charAt(0).toUpperCase() + action.slice(1),
  }));

const enquiryChildren = [
  {
    id: "residential.enquiries",
    label: "Enquiries",
    children: [
      ...actions("residential.enquiries", [
        "view",
        "create",
        "update",
        "delete",
        "export",
      ]),
      {
        id: "residential.enquiries.followup",
        label: "Follow-ups",
        children: actions("residential.enquiries.followup", [
          "view",
          "create",
          "update",
          "delete",
        ]),
      },
      {
        id: "residential.enquiries.appointment",
        label: "Appointments",
        children: actions("residential.enquiries.appointment", [
          "view",
          "create",
          "update",
          "delete",
        ]),
      },
      {
        id: "residential.enquiries.media",
        label: "Media",
        children: actions("residential.enquiries.media", [
          "view",
          "create",
          "delete",
        ]),
      },
      {
        id: "residential.enquiries.quotation",
        label: "Quotation",
        children: [
          ...actions("residential.enquiries.quotation", [
            "view",
            "create",
            "update",
            "delete",
          ]),
          { id: "residential.enquiries.quotation.send", label: "Send" },
          { id: "residential.enquiries.quotation.approve", label: "Approve" },
        ],
      },
      {
        id: "residential.enquiries.payment",
        label: "Payments",
        children: [
          ...actions("residential.enquiries.payment", [
            "view",
            "create",
            "update",
          ]),
          {
            id: "residential.enquiries.payment.link",
            label: "Send payment link",
          },
        ],
      },
    ],
  },
];

/** Full permission tree — modules → areas → actions */
export const PERMISSION_TREE = [
  {
    id: "common",
    label: "Common (shared)",
    children: [
      {
        id: "common.dashboard",
        label: "Dashboard",
        children: actions("common.dashboard", ["view"]),
      },
      {
        id: "common.payables",
        label: "Vendor payables",
        children: actions("common.payables", [
          "view",
          "create",
          "update",
          "delete",
          "export",
        ]),
      },
      {
        id: "common.company",
        label: "Company profile",
        children: actions("common.company", ["view", "update"]),
      },
      {
        id: "common.masters",
        label: "Masters",
        children: [
          ...[
            "branches",
            "departments",
            "designations",
            "employees",
            "vendors",
            "clients",
            "services",
            "products",
            "gallery",
            "quotation_templates",
          ].map((master) => ({
            id: `common.masters.${master}`,
            label: master.charAt(0).toUpperCase() + master.slice(1),
            children: actions(`common.masters.${master}`, [
              "view",
              "create",
              "update",
              "delete",
              "export",
            ]),
          })),
        ],
      },
    ],
  },
  {
    id: "residential",
    label: "Residential module",
    children: [
      ...enquiryChildren,
      {
        id: "residential.projects",
        label: "Projects",
        children: [
          ...actions("residential.projects", [
            "view",
            "create",
            "update",
            "delete",
          ]),
          {
            id: "residential.projects.hub",
            label: "Project hub (tabs)",
            children: [
              {
                id: "residential.projects.hub.report",
                label: "Report",
                children: [
                  ...actions("residential.projects.hub.report", ["view"]),
                  {
                    id: "residential.projects.hub.report.mcs",
                    label: "MCS board",
                    children: actions("residential.projects.hub.report.mcs", [
                      "view",
                      "update",
                    ]),
                  },
                  {
                    id: "residential.projects.hub.report.bpd",
                    label: "BPD board",
                    children: actions("residential.projects.hub.report.bpd", [
                      "view",
                      "update",
                    ]),
                  },
                  {
                    id: "residential.projects.hub.report.psq",
                    label: "PSQ board",
                    children: actions("residential.projects.hub.report.psq", [
                      "view",
                      "update",
                    ]),
                  },
                  {
                    id: "residential.projects.hub.report.ala",
                    label: "ALA board",
                    children: actions("residential.projects.hub.report.ala", [
                      "view",
                      "update",
                    ]),
                  },
                ],
              },
              {
                id: "residential.projects.hub.operation",
                label: "Operation",
                children: actions("residential.projects.hub.operation", [
                  "view",
                  "update",
                ]),
              },
              {
                id: "residential.projects.hub.execution",
                label: "Execution",
                children: actions("residential.projects.hub.execution", [
                  "view",
                  "update",
                ]),
              },
              {
                id: "residential.projects.hub.finance",
                label: "Finance",
                children: actions("residential.projects.hub.finance", [
                  "view",
                  "update",
                ]),
              },
            ],
          },
          {
            id: "residential.projects.tasks",
            label: "Project tasks",
            children: actions("residential.projects.tasks", [
              "view",
              "create",
              "update",
              "delete",
            ]),
          },
        ],
      },
      {
        id: "residential.quotations",
        label: "Quotations list",
        children: actions("residential.quotations", [
          "view",
          "create",
          "update",
          "delete",
          "export",
        ]),
      },
      {
        id: "residential.workflows",
        label: "Workflows",
        children: [
          ...actions("residential.workflows", [
            "view",
            "create",
            "update",
            "delete",
          ]),
          { id: "residential.workflows.publish", label: "Publish" },
        ],
      },
      {
        id: "residential.tasks",
        label: "Tasks (global)",
        children: actions("residential.tasks", [
          "view",
          "create",
          "update",
          "delete",
        ]),
      },
    ],
  },
  {
    id: "services",
    label: "Services module",
    children: [
      {
        id: "services.requests",
        label: "Service requests",
        children: actions("services.requests", [
          "view",
          "create",
          "update",
          "delete",
          "export",
        ]),
      },
      {
        id: "services.tasks",
        label: "Service tasks",
        children: actions("services.tasks", [
          "view",
          "create",
          "update",
          "delete",
        ]),
      },
      {
        id: "services.workflows",
        label: "Workflows",
        children: actions("services.workflows", [
          "view",
          "create",
          "update",
          "publish",
        ]),
      },
    ],
  },
  {
    id: "vendor_portal",
    label: "Vendor portal",
    children: [
      {
        id: "vendor.orders",
        label: "Purchase orders",
        children: actions("vendor.orders", ["view", "update"]),
      },
      {
        id: "vendor.quotations",
        label: "RFQ / Quotations",
        children: actions("vendor.quotations", ["view", "create"]),
      },
    ],
  },
  {
    id: "workforce",
    label: "Workforce (HR)",
    children: [
      {
        id: "workforce.employee_payments",
        label: "Employee payments",
        children: actions("workforce.employee_payments", [
          "view",
          "create",
          "update",
        ]),
      },
      {
        id: "workforce.rewards",
        label: "Rewards & points",
        children: actions("workforce.rewards", ["view", "create", "update"]),
      },
      {
        id: "workforce.attendance",
        label: "Attendance",
        children: actions("workforce.attendance", ["view", "create", "update"]),
      },
      {
        id: "workforce.timeliness",
        label: "On-time performance",
        children: actions("workforce.timeliness", ["view", "update"]),
      },
    ],
  },
  {
    id: "common_notifications",
    label: "Notifications",
    children: [
      {
        id: "common.notifications",
        label: "Notification logs",
        children: actions("common.notifications", ["view"]),
      },
    ],
  },
  {
    id: "client_portal",
    label: "Client portal",
    children: [
      {
        id: "client.projects",
        label: "My projects",
        children: actions("client.projects", ["view"]),
      },
      {
        id: "client.approvals",
        label: "Design / quotation approval",
        children: actions("client.approvals", ["view", "approve"]),
      },
      {
        id: "client.payments",
        label: "Payments",
        children: actions("client.payments", ["view", "create"]),
      },
    ],
  },
];

/** Default templates by user type — admin can clone and edit */
export const ROLE_TEMPLATES = {
  administrator: { label: "Administrator", permissionIds: ["*"] },
  employee: {
    label: "Employee",
    permissionIds: [
      "common.dashboard.view",
      "common.payables.view",
      "common.masters.clients.view",
      "common.masters.vendors.view",
      "common.masters.products.view",
      "common.masters.services.view",
      "common.masters.quotation_templates.view",
      "residential.enquiries.view",
      "residential.enquiries.create",
      "residential.enquiries.update",
      "residential.enquiries.followup.view",
      "residential.enquiries.followup.create",
      "residential.enquiries.appointment.view",
      "residential.enquiries.appointment.create",
      "residential.enquiries.quotation.send",
      "residential.enquiries.payment.create",
      "residential.quotations.view",
      "residential.quotations.update",
      "residential.projects.view",
      "residential.projects.tasks.view",
      "residential.projects.tasks.update",
      "residential.tasks.view",
      "residential.tasks.update",
      "workforce.attendance.view",
      "workforce.attendance.create",
      "workforce.rewards.view",
    ],
  },
  vendor: {
    label: "Vendor",
    permissionIds: [
      "common.dashboard.view",
      "vendor.orders.view",
      "vendor.orders.update",
      "vendor.quotations.view",
      "vendor.quotations.create",
    ],
  },
  client: {
    label: "Client",
    permissionIds: [
      "client.projects.view",
      "client.approvals.view",
      "client.approvals.approve",
      "client.payments.view",
      "client.payments.create",
    ],
  },
  contractor: {
    label: "Contractor",
    permissionIds: [
      "common.dashboard.view",
      "residential.projects.view",
      "residential.projects.tasks.view",
      "residential.projects.tasks.update",
    ],
  },
};
