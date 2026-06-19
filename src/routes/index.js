import { Router } from "express";
import authRoutes from "../modules/user-management/auth/auth.routes.js";
import designationRoutes from "../modules/user-management/designations/designation.routes.js";
import permissionRoutes from "../modules/common/permissions/permissions.routes.js";
import lookupRoutes from "../modules/common/lookups/lookup.routes.js";
import enquiryRoutes from "../modules/residential/enquiries/enquiry.routes.js";
import publicEnquiryRoutes from "../modules/residential/enquiries/publicEnquiry.routes.js";
import projectRoutes from "../modules/residential/projects/project.routes.js";
import taskRoutes from "../modules/residential/tasks/task.routes.js";
import workflowRoutes from "../modules/residential/workflows/workflow.routes.js";
import quotationRoutes from "../modules/residential/quotations/quotation.routes.js";
import masterRoutes from "../modules/common/masters/master.routes.js";
import organizationRoutes from "../modules/common/organization/organization.routes.js";
import userRoutes from "../modules/user-management/users/user.routes.js";
import codeRoutes from "../modules/common/codes/code.routes.js";
import clientPortalRoutes from "../modules/client-portal/clientPortal.routes.js";
import payableRoutes from "../modules/common/payables/payable.routes.js";
import financeRoutes from "../modules/common/finance/finance.routes.js";
import quotationTemplateRoutes from "../modules/common/quotation-templates/quotationTemplate.routes.js";
import dashboardRoutes from "../modules/common/dashboard/dashboard.routes.js";
import vendorPortalRoutes from "../modules/vendor-portal/vendorPortal.routes.js";
import workforceRoutes from "../modules/workforce/workforce.routes.js";
import notificationRoutes from "../modules/common/notifications/notification.routes.js";
import contactRoutes from "../modules/common/contacts/contact.routes.js";
import vendorQuotationRoutes from "../modules/common/vendor-quotations/vendorQuotation.routes.js";
import { sendSuccess } from "../core/http/apiResponse.js";

const router = Router();

router.get("/health", (_req, res) => {
  sendSuccess(res, { status: "ok", service: "complete-home-backend" });
});

router.use("/public", publicEnquiryRoutes);
router.use("/auth", authRoutes);
router.use("/designations", designationRoutes);
router.use("/permissions", permissionRoutes);
router.use("/lookups", lookupRoutes);
router.use("/enquiries", enquiryRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/workflows", workflowRoutes);
router.use("/quotations", quotationRoutes);
router.use("/masters", masterRoutes);
router.use("/masters", organizationRoutes);
router.use("/users", userRoutes);
router.use("/codes", codeRoutes);
router.use("/client", clientPortalRoutes);
router.use("/payables", payableRoutes);
router.use("/finance", financeRoutes);
router.use("/quotation-templates", quotationTemplateRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/vendor", vendorPortalRoutes);
router.use("/workforce", workforceRoutes);
router.use("/notifications", notificationRoutes);
router.use("/contacts", contactRoutes);
router.use("/vendor-quotations", vendorQuotationRoutes);

export default router;
