import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  getProductStockReport,
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

export const getProductStockReportController = async (req, res) => {
  const { startDate, endDate } = req.query;
  const report = await getProductStockReport({ startDate, endDate });
  res.json(report);
};
