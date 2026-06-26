import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.js";
import { requirePermission } from "../../../core/middleware/authorize.js";
import * as masterController from "./master.controller.js";

const router = Router();
router.use(authenticate);

router.get(
  "/clients",
  requirePermission("common.masters.clients.view"),
  masterController.listClients,
);
router.post(
  "/clients",
  requirePermission("common.masters.clients.create"),
  masterController.createClient,
);
router.patch(
  "/clients/:id",
  requirePermission("common.masters.clients.update"),
  masterController.updateClient,
);
router.delete(
  "/clients/:id",
  requirePermission("common.masters.clients.delete"),
  masterController.deleteClient,
);

router.get(
  "/vendors",
  requirePermission("common.masters.vendors.view"),
  masterController.listVendors,
);
router.post(
  "/vendors",
  requirePermission("common.masters.vendors.create"),
  masterController.createVendor,
);
router.patch(
  "/vendors/:id",
  requirePermission("common.masters.vendors.update"),
  masterController.updateVendor,
);
router.delete(
  "/vendors/:id",
  requirePermission("common.masters.vendors.delete"),
  masterController.deleteVendor,
);

router.get(
  "/products",
  requirePermission("common.masters.products.view"),
  masterController.listProducts,
);
router.post(
  "/products",
  requirePermission("common.masters.products.create"),
  masterController.createProduct,
);
router.patch(
  "/products/:id",
  requirePermission("common.masters.products.update"),
  masterController.updateProduct,
);
router.delete(
  "/products/:id",
  requirePermission("common.masters.products.delete"),
  masterController.deleteProduct,
);

router.get(
  "/services",
  requirePermission("common.masters.services.view"),
  masterController.listServices,
);
router.post(
  "/services",
  requirePermission("common.masters.services.create"),
  masterController.createService,
);
router.patch(
  "/services/:id",
  requirePermission("common.masters.services.update"),
  masterController.updateService,
);
router.delete(
  "/services/:id",
  requirePermission("common.masters.services.delete"),
  masterController.deleteService,
);

router.get(
  "/product-categories",
  requirePermission("common.masters.products.view"),
  masterController.listProductCategories,
);
router.get(
  "/product-categories/titles",
  requirePermission("common.masters.products.view"),
  masterController.listProductCategoryTitles,
);
router.get(
  "/product-categories/:title/descriptions",
  requirePermission("common.masters.products.view"),
  masterController.getProductCategoryDescriptions,
);
router.post(
  "/product-categories",
  requirePermission("common.masters.products.create"),
  masterController.addProductCategoryDescription,
);
router.delete(
  "/product-categories/:id/descriptions/:descId",
  requirePermission("common.masters.products.update"),
  masterController.deleteProductCategoryDescription,
);

router.get(
  "/materials",
  requirePermission("common.masters.products.view"),
  masterController.listMaterials,
);
router.post(
  "/materials",
  requirePermission("common.masters.products.create"),
  masterController.createMaterial,
);
router.post(
  "/materials/preview-code",
  requirePermission("common.masters.products.create"),
  masterController.previewMaterialCode,
);
router.patch(
  "/materials/:id",
  requirePermission("common.masters.products.update"),
  masterController.updateMaterial,
);
router.delete(
  "/materials/:id",
  requirePermission("common.masters.products.delete"),
  masterController.deleteMaterial,
);

export default router;
