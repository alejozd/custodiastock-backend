import express from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./userRoutes.js";
import productRoutes from "./productRoutes.js";
import deliveryRoutes from "./deliveryRoutes.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRoutes);

router.use("/users", authMiddleware, userRoutes);
router.use("/products", authMiddleware, productRoutes);
router.use("/deliveries", authMiddleware, deliveryRoutes);

export default router;
