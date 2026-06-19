import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { syncCounterFromMax } from "../core/counters/counter.service.js";
import User from "../modules/user-management/users/user.model.js";
import Designation from "../modules/user-management/designations/designation.model.js";
import Enquiry from "../modules/residential/enquiries/enquiry.model.js";
import EnquiryActivity from "../modules/residential/enquiries/enquiryActivity.model.js";
import EnquiryFollowUp from "../modules/residential/enquiries/enquiryFollowUp.model.js";
import EnquiryAppointment from "../modules/residential/enquiries/enquiryAppointment.model.js";
import EnquiryPayment from "../modules/residential/enquiries/enquiryPayment.model.js";
import Project from "../modules/residential/projects/project.model.js";
import Task from "../modules/residential/tasks/task.model.js";
import Workflow from "../modules/residential/workflows/workflow.model.js";
import Quotation from "../modules/residential/quotations/quotation.model.js";
import QuotationTemplate from "../modules/common/quotation-templates/quotationTemplate.model.js";
import Lookup from "../modules/common/lookups/lookup.model.js";
import {
  Client,
  Vendor,
  Product,
  Service,
} from "../modules/common/masters/master.model.js";
import Counter from "../core/counters/counter.model.js";
import { ROLE_TEMPLATES } from "../core/permissions/permissionTree.js";
import { DASHBOARD_PROFILE_DEFAULT_PERMISSIONS } from "../core/permissions/dashboardProfiles.js";
import {
  Branch,
  Department,
  Company,
} from "../modules/common/organization/organization.model.js";
import PayableObligation from "../modules/common/payables/payableObligation.model.js";
import PayableLedgerEntry from "../modules/common/payables/payableLedgerEntry.model.js";
import Attendance from "../modules/workforce/attendance.model.js";
import RewardRule from "../modules/workforce/rewardRule.model.js";
import RewardLedger from "../modules/workforce/rewardLedger.model.js";
import EmployeePayment from "../modules/workforce/employeePayment.model.js";
import TimelinessLog from "../modules/workforce/timelinessLog.model.js";

const LOOKUPS = {
  branchTypes: ["HEAD OFFICE", "BRANCH", "WAREHOUSE"],
  vendorTypes: ["CONTRACTOR", "SUPPLIER", "SUBCONTRACTOR"],
  vendorCategories: ["Material", "Services", "Labour"],
  tradeTypes: [
    "SOFA",
    "EPOXY FLOORING",
    "ALUMINIUM",
    "PEST CONTROL",
    "RO INSTALLER",
  ],
  clientTypes: ["Individual", "Corporate", "Government"],
  enquirySources: [
    "Manual",
    "JustDial",
    "Google",
    "References (Client/Friends)",
    "Website",
    "Referral",
    "Walk-in",
    "Social Media",
    "Campaign",
  ],
  enquiryTalkingPoints: [
    "Interested",
    "No response",
    "No requirement",
    "Invalid number",
    "Busy",
    "Call back later",
    "Work in progress",
    "Cancel project",
    "Site visit scheduled",
    "Not interested",
  ],
  workTypes: [
    "Interior",
    "HPD",
    "Planning",
    "Renovation",
    "Modular kitchen",
    "Civil work",
    "Construction",
    "BPD",
    "Permission & planning",
    "Interior + Renovation",
    "Tiles",
    "Painting",
    "False ceiling",
  ],
  areas: ["Maroda Bhilai", "Smriti Nagar Bhilai", "Junwani", "Sector 4, Durg"],
  productGroups: ["Construction", "Plumbing", "Electrical"],
  productBrands: ["ACC", "UltraTech", "Generic"],
  productColors: ["Grey", "White", "Black"],
  productUnits: ["Bag", "Piece", "Kg", "sq. ft"],
  serviceUnits: ["sq. ft", "nos", "rft", "lump sum"],
  uom: [
    "m",
    "mm",
    "cm",
    "kg",
    "sq. ft",
    "sqm",
    "nos",
    "rft",
    "lump sum",
    "Bag",
    "Piece",
    "Unit",
    "HUNDA",
    "PER SQFT",
  ],
  serviceGroups: [
    "RENOVATION & REMODELLING",
    "CEILING SYSTEMS",
    "ELECTRICAL",
    "Full home interior",
    "Villa construction",
  ],
  taskTypes: ["General", "Site", "Design"],
  paymentTypes: ["Advance", "Milestone", "Final"],
  paymentModes: ["Bank Transfer", "UPI", "Cash", "Cheque"],
  /** Custom quotation format slugs (built-ins are in app constants). */
  quotationFormatTypes: [],
};

const SAMPLE_ENQUIRIES = [
  {
    code: "ENQ-1042",
    name: "Vikram Mehta",
    mobile: "+91 98231 44780",
    email: "vikram.mehta@mailinator.com",
    address: "Sector 4, Durg, Chhattisgarh",
    source: "manual",
    service: "Full home interior",
    requirements: "3BHK renovation, modular kitchen, false ceiling",
    status: "In Progress",
    businessModule: "residential",
    initials: "VM",
    budget: "₹18,50,000",
    projectType: "Residential",
  },
  {
    code: "ENQ-1088",
    name: "Greenfield Build",
    mobile: "+91 77102 33456",
    email: "contact@greenfield-build.demo",
    address: "Junwani Road, Bhilai",
    source: "manual",
    service: "Villa construction",
    requirements: "Ground + first floor",
    status: "Deal",
    businessModule: "residential",
    initials: "GB",
    budget: "₹15,00,000",
    projectType: "Residential",
  },
];

async function seed() {
  await connectDatabase();

  console.log("Clearing collections…");
  await Promise.all([
    Counter.deleteMany({}),
    User.deleteMany({}),
    Designation.deleteMany({}),
    Enquiry.deleteMany({}),
    EnquiryActivity.deleteMany({}),
    EnquiryFollowUp.deleteMany({}),
    EnquiryAppointment.deleteMany({}),
    EnquiryPayment.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    Workflow.deleteMany({}),
    Quotation.deleteMany({}),
    QuotationTemplate.deleteMany({}),
    Lookup.deleteMany({}),
    Client.deleteMany({}),
    Vendor.deleteMany({}),
    Product.deleteMany({}),
    Service.deleteMany({}),
    Branch.deleteMany({}),
    Department.deleteMany({}),
    Company.deleteMany({}),
    PayableLedgerEntry.deleteMany({}),
    PayableObligation.deleteMany({}),
    Attendance.deleteMany({}),
    RewardRule.deleteMany({}),
    RewardLedger.deleteMany({}),
    EmployeePayment.deleteMany({}),
    TimelinessLog.deleteMany({}),
  ]);

  const adminDesignation = await Designation.create({
    name: "Administrator",
    description: "Full system access",
    permissionIds: ["*"],
    dashboardProfile: "executive",
    status: "Active",
  });

  const salesDesignation = await Designation.create({
    name: "Sales Executive",
    description: "CRM and enquiries",
    permissionIds: DASHBOARD_PROFILE_DEFAULT_PERMISSIONS.sales,
    dashboardProfile: "sales",
    status: "Active",
  });

  const passwordHash = await bcrypt.hash(env.seedAdminPassword, 12);
  await User.create({
    userId: env.seedAdminUserId.toUpperCase(),
    passwordHash,
    name: "Ravi Shankar",
    email: "admin@completehome.demo",
    userType: "admin",
    designationId: adminDesignation._id,
    initials: "RS",
    status: "Active",
    defaultModule: "residential",
  });

  const salesPasswordHash = await bcrypt.hash("sales123", 12);
  const salesUser = await User.create({
    userId: "USR5001",
    passwordHash: salesPasswordHash,
    name: "Priya Sales",
    email: "priya.sales@completehome.demo",
    userType: "employee",
    designationId: salesDesignation._id,
    initials: "PS",
    status: "Active",
    defaultModule: "residential",
  });

  await RewardRule.insertMany([
    {
      eventType: "task_complete",
      label: "Task completed",
      description: "Award when a task moves to Done",
      points: 10,
      active: true,
    },
    {
      eventType: "attendance_approved",
      label: "Approved attendance",
      description: "Award when supervisor approves check-out",
      points: 5,
      active: true,
    },
    {
      eventType: "payment_received",
      label: "Client payment logged",
      description: "Reserved for future automation",
      points: 15,
      active: true,
    },
  ]);

  const today = new Date().toISOString().slice(0, 10);
  await Attendance.create({
    userId: salesUser._id,
    date: today,
    checkInAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    checkOutAt: new Date(Date.now() - 60 * 60 * 1000),
    status: "pending_approval",
    geo: { lat: 21.21, lng: 81.43, label: "Bhilai site (demo)" },
    businessModule: "residential",
  });

  await Branch.create([
    {
      code: "BRN-0002",
      name: "COMPLETE HOME JUNWANI",
      location: "BHILAI, Chhattisgarh, 490020",
      type: "HEAD OFFICE",
      status: "Active",
    },
    {
      code: "BRN-0003",
      name: "NAVEEN SINGH COMPLEX",
      location: "Bhilai, Chhattisgarh, 490026",
      type: "REGIONAL",
      status: "Inactive",
    },
  ]);

  await Department.create([
    {
      code: "DPT-0021",
      name: "EXECUTION PIPELINE ( BPD + PSQ + ALA TEAM )",
      teamCount: 0,
      status: "Inactive",
      initials: "EP",
    },
    {
      code: "DPT-0020",
      name: "PRE SALE PIPELINE ( MCS TEAM )",
      teamCount: 0,
      status: "Inactive",
      initials: "PS",
    },
  ]);

  await Company.create({
    singletonKey: "default",
    name: "Complete Home Plan Design Build",
    website: "https://www.completehome.co.in/",
    mobile: "9876543210",
    email: "info@completehome.in",
    address: "FIOF 11 SURYA TI MALL JUNWANI , BHILAI",
    landmark: "FIFTH OF FLOOR IN SURYA TI MALL",
    pincode: "490020",
    area: "Smriti Nagar Bhilai, Durg",
    city: "Bhilai",
    state: "Chhattisgarh",
    cin: "U74999CT2024PTC012345",
    pan: "DMFPK0997A",
    gst: "22DMFPK0997A1ZC",
    banks: [],
  });

  for (const [key, values] of Object.entries(LOOKUPS)) {
    await Lookup.create({ key, values });
  }

  const clientDocs = await Client.create([
    {
      code: "CLT-2206",
      name: "Vikram Mehta",
      status: "Active",
      initials: "VM",
      email: "vikram.mehta@mailinator.com",
      mobile: "+91 98231 44780",
    },
    {
      code: "CLT-2205",
      name: "Greenfield Build",
      status: "Active",
      initials: "GB",
    },
  ]);

  const [buildMartVendor] = await Vendor.create([
    {
      code: "VND-001",
      name: "Build Mart Suppliers",
      type: "SUPPLIER",
      category: "Material",
      contact: "+91 98765 11111",
      status: "Active",
    },
  ]);

  const samplePayable = await PayableObligation.create({
    vendorId: buildMartVendor._id,
    title: "Sample purchase order (seed demo)",
    committedAmount: 500,
    currency: "INR",
    status: "active",
    businessModule: "residential",
    notes: "Demo: ₹500 agreed, ₹200 paid — ₹300 remaining in payables summary.",
  });
  const vendorPortalPasswordHash = await bcrypt.hash("vendor123", 12);
  await User.create({
    userId: "VNDUSR001",
    passwordHash: vendorPortalPasswordHash,
    name: "Build Mart Portal",
    email: "vendor@buildmart.demo",
    userType: "vendor",
    vendorId: buildMartVendor._id,
    initials: "BM",
    status: "Active",
  });

  await PayableLedgerEntry.create({
    obligationId: samplePayable._id,
    amount: 200,
    paymentMode: "UPI",
    reference: "SEED-DEMO-001",
    note: "Recorded from phone (demo)",
    source: "manual",
  });

  await Product.create([
    {
      code: "PRD-100",
      name: "CEMENT",
      group: "Construction",
      category: "Construction",
      brand: "ACC",
      status: "Active",
    },
  ]);

  const serviceDocs = await Service.create([
    {
      code: "SRV-0072",
      name: "STAGE 9: COMMISSIONING & HANDOVER",
      unit: "lump sum",
      group: "ELECTRICAL",
      displayOnEnquiry: true,
      status: "Active",
    },
    {
      code: "SRV-0073",
      name: "Modular kitchen installation (labour)",
      unit: "lump sum",
      group: "RENOVATION & REMODELLING",
      displayOnEnquiry: true,
      estimatedAmount: "45000",
      status: "Active",
    },
  ]);

  const productDocs = await Product.find();
  const kitchenProduct = productDocs.find((p) => p.code === "PRD-100");

  await QuotationTemplate.create([
    {
      code: "QTM-0001",
      name: "Full home interior — with materials",
      formatType: "full_boq",
      status: "Active",
      businessModule: "residential",
      description: "Products + services BOQ for client approval with rates.",
      defaultTaxPercent: "18",
      displayDefaults: {
        showRate: true,
        showGst: true,
        showDimension: true,
        showGroupWise: true,
      },
      termsText:
        "Valid for 15 days. Prices include GST unless noted. Material delivery as per site schedule.",
      lines: [
        {
          itemType: "product",
          catalogId: kitchenProduct?._id,
          group: "Materials",
          name: kitchenProduct?.name || "CEMENT",
          unit: "bag",
          defaultQuantity: "10",
          defaultRate: "420",
          gstPercentage: "18",
          sortOrder: 1,
        },
        {
          itemType: "service",
          catalogId: serviceDocs[0]?._id,
          group: "ELECTRICAL",
          name: serviceDocs[0].name,
          unit: "lump sum",
          defaultQuantity: "1",
          defaultRate: "85000",
          sortOrder: 2,
        },
      ],
    },
    {
      code: "QTM-0002",
      name: "Interior scope — without materials",
      formatType: "services_only",
      status: "Active",
      businessModule: "residential",
      description: "Labour and services only; no material line items.",
      defaultTaxPercent: "18",
      displayDefaults: {
        showRate: true,
        showGst: true,
        showDimension: false,
        showGroupWise: true,
      },
      termsText:
        "Client to supply materials unless agreed otherwise. Labour rates fixed at time of quote.",
      lines: [
        {
          itemType: "service",
          catalogId: serviceDocs[1]?._id,
          group: "RENOVATION & REMODELLING",
          name: serviceDocs[1].name,
          unit: "lump sum",
          defaultQuantity: "1",
          defaultRate: "45000",
          sortOrder: 1,
        },
        {
          itemType: "service",
          name: "Site supervision & handover",
          unit: "lump sum",
          defaultQuantity: "1",
          defaultRate: "12000",
          sortOrder: 2,
        },
      ],
    },
  ]);

  const vikramClient = clientDocs.find((c) => c.code === "CLT-2206");

  const clientPasswordHash = await bcrypt.hash(env.seedClientPassword, 12);
  await User.create({
    userId: env.seedClientUserId.toUpperCase(),
    passwordHash: clientPasswordHash,
    name: "Vikram Mehta",
    email: "vikram.mehta@mailinator.com",
    mobile: "+91 98231 44780",
    userType: "client",
    clientId: vikramClient._id,
    initials: "VM",
    status: "Active",
  });

  const enquiryDocs = [];
  for (const enq of SAMPLE_ENQUIRIES) {
    const payload =
      enq.code === "ENQ-1042" && vikramClient
        ? { ...enq, clientId: vikramClient._id }
        : enq;
    const doc = await Enquiry.create(payload);
    enquiryDocs.push(doc);
    await EnquiryActivity.create({
      enquiryId: doc._id,
      title: "Enquiry Created",
      desc: "Seeded sample data",
    });
    if (enq.code === "ENQ-1042") {
      await EnquiryFollowUp.create({
        enquiryId: doc._id,
        type: "whatsapp",
        channel: "WhatsApp",
        scheduledAt: "13/06/2025 at 09:00 am",
        note: "Discuss layout options and budget range",
        status: "Scheduled",
      });
      await EnquiryAppointment.create({
        enquiryId: doc._id,
        title: "Site visit",
        when: "22 Jun 2025 at 11:00 am",
        assignee: "Neha Desai (E)",
        assigneeInitials: "ND",
        status: "Scheduled",
      });
    }
  }

  const enq1088 = enquiryDocs.find((e) => e.code === "ENQ-1088");
  const project = await Project.create({
    code: "PRJ-0039",
    name: "Greenfield Villa",
    client: "Greenfield Build",
    clientInitials: "GB",
    manager: "Arjun Malhotra",
    managerInitials: "AM",
    managerRole: "Project Manager",
    deadline: "07-02-2026",
    progress: 0,
    status: "Active",
    enquiryId: enq1088._id,
    enquiryCode: enq1088.code,
    businessModule: "residential",
  });

  await Task.create([
    {
      taskCode: "0002",
      title: "ATTENDANCE COORDINATOR",
      priority: "Medium",
      status: "todo",
      startDate: "22/04/2026",
      endDate: "05/08/2026",
      assigneeInitials: "MC",
      projectId: project._id,
      stage: "STAGE 1: SITE STUDY",
      businessModule: "residential",
    },
    {
      taskCode: "0003",
      title: "Approved for tiling",
      priority: "Medium",
      status: "progress",
      startDate: "01/05/2026",
      endDate: "15/05/2026",
      assigneeInitials: "MT",
      projectId: project._id,
      stage: "STAGE 1: SITE STUDY",
      businessModule: "residential",
    },
    {
      taskCode: "0004",
      title: "General site review",
      priority: "Medium",
      status: "todo",
      startDate: "01/06/2026",
      endDate: "10/06/2026",
      assigneeInitials: "RS",
      businessModule: "residential",
    },
  ]);

  await Workflow.create({
    name: "CATEGORY 7: CEILING SYSTEMS (INDIAN SITE PRACTICE)",
    description: "Indian site practice checklist for ceiling systems.",
    status: "Published",
    businessModule: "residential",
    stages: [
      {
        order: 1,
        title: "STAGE 1: CEILING TYPE FREEZE",
        serviceCode: "SRV-0073",
        tasks: [
          { code: "01", title: "Measure ceiling area" },
          { code: "02", title: "Confirm design" },
        ],
      },
      {
        order: 2,
        title: "STAGE 2: GYPSUM BOARD CEILING",
        serviceCode: "SRV-0074",
        tasks: [{ code: "01", title: "Install framework" }],
      },
    ],
  });

  await Quotation.create({
    code: "QT-5235",
    name: "Lakeview_Interior_BOQ",
    variantLabel: "With materials",
    formatType: "full_boq",
    isPrimary: true,
    sortOrder: 0,
    clientDisplay: "—",
    amount: "₹550",
    grandTotal: "₹550",
    subtotal: "₹466",
    taxAmount: "₹84",
    status: "Sent",
    sentAt: new Date(),
    enquiryId: enquiryDocs[0]._id,
    products: [],
    services: [
      {
        name: "Modular kitchen package",
        unit: "lump sum",
        quantity: "1",
        rate: "550",
        price: "₹550",
      },
    ],
  });

  await syncCounterFromMax("DSG", 2);
  await syncCounterFromMax("ENQ", 1088);
  await syncCounterFromMax("PRJ", 39);
  await syncCounterFromMax("QUO", 5235);
  await syncCounterFromMax("TSK", 4);
  await syncCounterFromMax("VND", 1);
  await syncCounterFromMax("CLT", 2206);
  await syncCounterFromMax("PRD", 100);
  await syncCounterFromMax("SRV", 73);
  await syncCounterFromMax("QTM", 2);
  await syncCounterFromMax("BRN", 3);
  await syncCounterFromMax("DPT", 21);
  await syncCounterFromMax("USRSEQ", 2206);

  console.log("Seed complete.");
  console.log(`  Admin: ${env.seedAdminUserId} / ${env.seedAdminPassword}`);
  console.log(`  Sales: USR5001 / sales123`);
  console.log(`  Vendor: VNDUSR001 / vendor123`);
  console.log(`  Client: ${env.seedClientUserId} / ${env.seedClientPassword}`);
  console.log(
    `  Payables demo: Build Mart — ₹500 committed, ₹200 paid (₹300 outstanding)`,
  );
  await disconnectDatabase();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
