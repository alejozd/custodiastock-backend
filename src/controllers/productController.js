import { ApiError } from "../utils/apiError.js";
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  importProductsFromCsv,
  updateProduct,
} from "../services/productService.js";

export const createProductController = async (req, res) => {
  const product = await createProduct(req.body);
  res.status(201).json(product);
};

export const getProductsController = async (req, res) => {
  const products = await getProducts();
  res.json(products);
};

export const getProductByIdController = async (req, res) => {
  const product = await getProductById(Number(req.params.id));
  res.json(product);
};

export const updateProductController = async (req, res) => {
  const product = await updateProduct(Number(req.params.id), req.body);
  res.json(product);
};

export const deleteProductController = async (req, res) => {
  await deleteProduct(Number(req.params.id));
  res.status(204).send();
};


export const importProductsController = async (req, res) => {
  const contentType = req.headers["content-type"] || "";

  if (!contentType.includes("text/csv") && !contentType.includes("application/vnd.ms-excel")) {
    throw new ApiError(415, "Unsupported content type. Use text/csv");
  }

  const result = await importProductsFromCsv(req.body);
  return res.status(201).json(result);
};
