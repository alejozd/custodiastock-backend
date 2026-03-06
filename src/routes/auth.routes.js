import express from "express";
import { loginController } from "../controllers/auth.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.post("/login", asyncHandler(loginController));

export default router;
