import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";

const productSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  active: true,
  createdAt: true,
};

export const createProduct = async (payload) => {
  const requiredFields = ["name", "code"];
  const missing = requiredFields.filter((field) => !payload[field]);

  if (missing.length) {
    throw new ApiError(400, "Missing required product fields", { missing });
  }

  try {
    return await prisma.product.create({
      data: {
        name: payload.name,
        code: payload.code,
        description: payload.description,
        active: payload.active ?? true,
      },
      select: productSelect,
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new ApiError(409, "Product code already in use");
    }
    throw error;
  }
};

export const getProducts = async () => {
  return prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    select: productSelect,
  });
};

export const getProductById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    select: productSelect,
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
};

export const updateProduct = async (id, payload) => {
  await getProductById(id);

  const data = {
    ...(payload.name !== undefined && { name: payload.name }),
    ...(payload.code !== undefined && { code: payload.code }),
    ...(payload.description !== undefined && { description: payload.description }),
    ...(payload.active !== undefined && { active: payload.active }),
  };

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, "No fields sent for update");
  }

  try {
    return await prisma.product.update({
      where: { id },
      data,
      select: productSelect,
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new ApiError(409, "Product code already in use");
    }
    throw error;
  }
};
