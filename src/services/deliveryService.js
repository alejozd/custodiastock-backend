import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";

const deliveryInclude = {
  product: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  deliveredBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  receivedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

export const createDelivery = async (payload) => {
  const requiredFields = [
    "productId",
    "quantity",
    "deliveredById",
    "receivedById",
    "signatureImage",
  ];

  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length) {
    throw new ApiError(400, "Missing required delivery fields", { missing });
  }

  if (payload.quantity <= 0) {
    throw new ApiError(400, "Quantity must be greater than 0");
  }

  const [product, deliveredBy, receivedBy] = await Promise.all([
    prisma.product.findUnique({ where: { id: payload.productId } }),
    prisma.user.findUnique({ where: { id: payload.deliveredById } }),
    prisma.user.findUnique({ where: { id: payload.receivedById } }),
  ]);

  if (!product || !product.active) {
    throw new ApiError(400, "Product does not exist or is inactive");
  }

  if (!deliveredBy || !deliveredBy.active) {
    throw new ApiError(400, "DeliveredBy user does not exist or is inactive");
  }

  if (!receivedBy || !receivedBy.active) {
    throw new ApiError(400, "ReceivedBy user does not exist or is inactive");
  }

  return prisma.delivery.create({
    data: {
      productId: payload.productId,
      quantity: payload.quantity,
      deliveredById: payload.deliveredById,
      receivedById: payload.receivedById,
      signatureImage: payload.signatureImage,
    },
    include: deliveryInclude,
  });
};

export const getDeliveries = async () => {
  return prisma.delivery.findMany({
    orderBy: { createdAt: "desc" },
    include: deliveryInclude,
  });
};

export const getDeliveryById = async (id) => {
  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: deliveryInclude,
  });

  if (!delivery) {
    throw new ApiError(404, "Delivery not found");
  }

  return delivery;
};
