import express from "express";
import {
  cancelDeliveryController,
  createDeliveryController,
  deleteDeliveryController,
  getDeliveriesController,
  getDeliveryByIdController,
  getNextNumberController,
} from "../controllers/deliveryController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/next-number", asyncHandler(getNextNumberController));
router.post("/", asyncHandler(createDeliveryController));
router.get("/", asyncHandler(getDeliveriesController));
router.get("/:id", asyncHandler(getDeliveryByIdController));
router.patch(
  "/:id/cancel",
  roleMiddleware(["ADMIN"]),
  asyncHandler(cancelDeliveryController)
);
router.delete(
  "/:id",
  roleMiddleware(["ADMIN"]),
  asyncHandler(deleteDeliveryController)
);

export default router;
