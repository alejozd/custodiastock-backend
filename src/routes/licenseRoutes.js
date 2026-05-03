import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  activateLicense,
  getLicenseStatus,
  registerLicense,
  validateLicense,
} from "../controllers/licenseController.js";

const router = express.Router();

router.get("/status", asyncHandler(getLicenseStatus));
router.post("/register", asyncHandler(registerLicense));
router.post("/validate", asyncHandler(validateLicense));
router.post("/activate", asyncHandler(activateLicense));

export default router;
