import express from "express";
import {
  cancelEntryController,
  createEntryController,
  getEntriesController,
  getEntryByIdController,
  getNextNumberController,
} from "../controllers/entryController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.get("/next-number", asyncHandler(getNextNumberController));
router.post("/", asyncHandler(createEntryController));
router.get("/", asyncHandler(getEntriesController));
router.get("/:id", asyncHandler(getEntryByIdController));
router.patch("/:id/cancel", asyncHandler(cancelEntryController));

export default router;
