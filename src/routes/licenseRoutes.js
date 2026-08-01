import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  activateLicense,
  getLicenseStatus,
  registerLicense,
  validateLicense,
} from "../controllers/licenseController.js";

const router = express.Router();

// These routes are intentionally public (mounted before authMiddleware in routes/index.js):
// - The app has no user session yet on first boot, before a license is activated,
//   so register/activate cannot require auth without breaking the first-run flow.
// - All operations here are scoped to THIS installation only, keyed by a machine
//   fingerprint hash derived server-side (see licenseService.getTeamFingerprint);
//   the client cannot target or read another installation's license by supplying
//   an id, so there is no cross-tenant data exposure.
// - None of these endpoints deactivate/disable a license or expose secrets; they
//   only read or (re)activate the license tied to this machine.
router.get("/status", asyncHandler(getLicenseStatus));
router.post("/register", asyncHandler(registerLicense));
router.post("/validate", asyncHandler(validateLicense));
router.post("/activate", asyncHandler(activateLicense));

export default router;
