import express from "express";
import {
  createProductController,
  deleteProductController,
  getProductByIdController,
  getProductsController,
  updateProductController,
} from "../controllers/productController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.post("/", asyncHandler(createProductController));
router.get("/", asyncHandler(getProductsController));
router.get("/:id", asyncHandler(getProductByIdController));
router.put("/:id", asyncHandler(updateProductController));
router.delete("/:id", asyncHandler(deleteProductController));

export default router;
