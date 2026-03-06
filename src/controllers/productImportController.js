import fs from "fs/promises";
import { ApiError } from "../utils/apiError.js";
import { importProductsFromExcel } from "../services/productService.js";

export const importProductsController = async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "file is required (.xlsx)");
  }

  const filePath = req.file.path;

  try {
    const result = await importProductsFromExcel(filePath);
    return res.status(201).json(result);
  } finally {
    await fs.unlink(filePath).catch(() => {});
  }
};
