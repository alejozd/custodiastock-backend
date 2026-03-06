import express from "express";

const router = express.Router();

router.get("/health", (req, res) => {
  console.log("health endpoint llamado");
  res.json({ status: "ok" });
});

router.get("/test", (req, res) => {
  res.json({ test: "funciona" });
});

export default router;
