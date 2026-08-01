import express from "express";
import {
  createUserController,
  deleteUserController,
  getUserByIdController,
  getUsersController,
  updateUserController,
} from "../controllers/userController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Reading the user list/detail stays open to any authenticated user:
// CreateDelivery.jsx calls GET /users to populate the "recibido por" picker
// for operators, who are not ADMIN and never reach the /usuarios admin page.
router.get("/", asyncHandler(getUsersController));
router.get("/:id", asyncHandler(getUserByIdController));

// Mutating accounts (create/edit/delete/roles) stays administrative.
router.post("/", roleMiddleware(["ADMIN"]), asyncHandler(createUserController));
router.put("/:id", roleMiddleware(["ADMIN"]), asyncHandler(updateUserController));
router.delete("/:id", roleMiddleware(["ADMIN"]), asyncHandler(deleteUserController));

export default router;
