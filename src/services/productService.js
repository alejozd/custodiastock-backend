import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";

const mapProductResponse = (product) => ({
  id: product.id,
  name: product.name,
  reference: product.reference,
  description: product.description,
  active: product.active,
  createdAt: product.createdAt,
  deletedAt: product.deletedAt,
});

const getActiveProductEntityById = async (id) => {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
};

export const createProduct = async (payload) => {
  const requiredFields = ["name", "reference"];
  const missing = requiredFields.filter((field) => !payload[field]);

  if (missing.length) {
    throw new ApiError(400, "Missing required product fields", { missing });
  }

  try {
    const product = await prisma.product.create({
      data: {
        name: payload.name,
        reference: payload.reference,
        description: payload.description,
        active: payload.active ?? true,
      },
    });

    return mapProductResponse(product);
  } catch (error) {
    if (error.code === "P2002") {
      throw new ApiError(409, "Product reference already in use");
    }
    throw error;
  }
};

export const getProducts = async () => {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return products.map(mapProductResponse);
};

export const getProductById = async (id) => {
  const product = await getActiveProductEntityById(id);
  return mapProductResponse(product);
};

export const updateProduct = async (id, payload) => {
  await getActiveProductEntityById(id);

  const data = {
    ...(payload.name !== undefined && { name: payload.name }),
    ...(payload.reference !== undefined && { reference: payload.reference }),
    ...(payload.description !== undefined && { description: payload.description }),
    ...(payload.active !== undefined && { active: payload.active }),
  };

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, "No supported fields sent for update", {
      supportedFields: ["name", "reference", "description", "active"],
    });
  }

  try {
    const product = await prisma.product.update({ where: { id }, data });
    return mapProductResponse(product);
  } catch (error) {
    if (error.code === "P2002") {
      throw new ApiError(409, "Product reference already in use");
    }
    throw error;
  }
};

export const deleteProduct = async (id) => {
  await getActiveProductEntityById(id);

  await prisma.product.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      active: false,
    },
  });
};
