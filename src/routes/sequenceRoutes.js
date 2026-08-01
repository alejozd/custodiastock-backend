import express from "express";
import {
  getAllSequencesController,
  getSequenceByIdController,
  createSequenceController,
  updateSequenceController,
  deleteSequenceController,
} from "../controllers/sequenceController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Folio sequence configuration is administrative and affects system-wide numbering.
router.use(roleMiddleware(["ADMIN"]));

router.get("/", asyncHandler(getAllSequencesController));
router.get("/:id", asyncHandler(getSequenceByIdController));
router.post("/", asyncHandler(createSequenceController));
router.put("/:id", asyncHandler(updateSequenceController));
router.delete("/:id", asyncHandler(deleteSequenceController));

export default router;
