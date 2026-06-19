import { body, param } from "express-validator";

export const idParam = [
  param("id").isMongoId().withMessage("Invalid designation id"),
];

export const createDesignationValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("description").optional().trim(),
  body("permissionIds").optional().isArray(),
  body("status").optional().isIn(["Active", "Inactive"]),
  body("dashboardProfile")
    .optional()
    .isIn(["executive", "sales", "finance", "operations", "general"]),
  body("seedDefaultPermissions").optional().isBoolean(),
];

export const updateDesignationValidation = [
  ...idParam,
  body("name").optional().trim().notEmpty(),
  body("description").optional().trim(),
  body("permissionIds").optional().isArray(),
  body("status").optional().isIn(["Active", "Inactive"]),
  body("dashboardProfile")
    .optional()
    .isIn(["executive", "sales", "finance", "operations", "general"]),
  body("seedDefaultPermissions").optional().isBoolean(),
];

export const updatePermissionsValidation = [
  ...idParam,
  body("permissionIds").isArray().withMessage("permissionIds must be an array"),
];
