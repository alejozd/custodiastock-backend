import express from "express";
import rateLimit from "express-rate-limit";
import { loginController } from "../controllers/auth.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

// Throttle login attempts per IP to slow down credential-stuffing/brute-force
// attacks, without affecting any other auth flow.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Only count failed attempts: successful logins from shared-IP networks
  // (office/warehouse NAT) must not eat into other users' quota.
  skipSuccessfulRequests: true,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
});

router.post("/login", loginLimiter, asyncHandler(loginController));

export default router;
