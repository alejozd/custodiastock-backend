import express from "express";
import {
  createUserController,
  deleteUserController,
  getUserByIdController,
  getUsersController,
  updateUserController,
} from "../controllers/userController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.post("/", asyncHandler(createUserController));
router.get("/", asyncHandler(getUsersController));
router.get("/:id", asyncHandler(getUserByIdController));
router.put("/:id", asyncHandler(updateUserController));
router.delete("/:id", asyncHandler(deleteUserController));

export default router;
