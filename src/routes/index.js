import express from "express";
import userRoutes from "./userRoutes.js";
import productRoutes from "./productRoutes.js";
import deliveryRoutes from "./deliveryRoutes.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/deliveries", deliveryRoutes);

export default router;
