import { body } from "express-validator";

export const loginValidation = [
  body("userId").trim().notEmpty().withMessage("User ID is required"),
  body("password").notEmpty().withMessage("Password is required"),
  body("businessModule").optional().isString(),
];
