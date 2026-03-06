import express from "express";
import {
  createDeliveryController,
  getDeliveriesController,
  getDeliveryByIdController,
} from "../controllers/deliveryController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.post("/", asyncHandler(createDeliveryController));
router.get("/", asyncHandler(getDeliveriesController));
router.get("/:id", asyncHandler(getDeliveryByIdController));

export default router;
