import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";

const mapProductResponse = (product) => ({
  id: product.id,
  name: product.name,
  code: product.code,
  description: product.description,
  active: true,
  createdAt: product.createdAt,
});

export const createProduct = async (payload) => {
  const requiredFields = ["name", "code"];
  const missing = requiredFields.filter((field) => !payload[field]);

  if (missing.length) {
    throw new ApiError(400, "Missing required product fields", { missing });
  }

  try {
    const product = await prisma.product.create({
      data: {
        name: payload.name,
        code: payload.code,
        description: payload.description,
      },
    });

    return mapProductResponse(product);
  } catch (error) {
    if (error.code === "P2002") {
      throw new ApiError(409, "Product code already in use");
    }
    throw error;
  }
};

export const getProducts = async () => {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return products.map(mapProductResponse);
};

export const getProductById = async (id) => {
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return mapProductResponse(product);
};

export const updateProduct = async (id, payload) => {
  await getProductById(id);

  const data = {
    ...(payload.name !== undefined && { name: payload.name }),
    ...(payload.code !== undefined && { code: payload.code }),
    ...(payload.description !== undefined && { description: payload.description }),
  };

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, "No supported fields sent for update", {
      supportedFields: ["name", "code", "description"],
    });
  }

  try {
    const product = await prisma.product.update({ where: { id }, data });
    return mapProductResponse(product);
  } catch (error) {
    if (error.code === "P2002") {
      throw new ApiError(409, "Product code already in use");
    }
    throw error;
  }
};
