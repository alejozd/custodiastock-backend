import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";

const deliveryInclude = {
  deliveredBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
    },
  },
  receivedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
    },
  },
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          reference: true,
        },
      },
    },
  },
};

const mapDeliveryResponse = (delivery) => {
  const firstItem = delivery.items?.[0];

  return {
    id: delivery.id,
    productId: firstItem?.productId ?? null,
    quantity: firstItem?.quantity ?? null,
    deliveredById: delivery.deliveredById,
    receivedById: delivery.receivedById,
    signatureImage: delivery.signatureImage,
    createdAt: delivery.createdAt,
    product: firstItem?.product ?? null,
    deliveredBy: delivery.deliveredBy,
    receivedBy: delivery.receivedBy,
  };
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

  if (!product) {
    throw new ApiError(400, "Product does not exist");
  }

  if (!deliveredBy || !deliveredBy.active) {
    throw new ApiError(400, "DeliveredBy user does not exist or is inactive");
  }

  if (!receivedBy || !receivedBy.active) {
    throw new ApiError(400, "ReceivedBy user does not exist or is inactive");
  }

  const delivery = await prisma.delivery.create({
    data: {
      deliveredById: payload.deliveredById,
      receivedById: payload.receivedById,
      signatureImage: payload.signatureImage,
      items: {
        create: {
          productId: payload.productId,
          quantity: payload.quantity,
        },
      },
    },
    include: deliveryInclude,
  });

  return mapDeliveryResponse(delivery);
};

export const getDeliveries = async () => {
  const deliveries = await prisma.delivery.findMany({
    orderBy: { createdAt: "desc" },
    include: deliveryInclude,
  });

  return deliveries.map(mapDeliveryResponse);
};

export const getDeliveryById = async (id) => {
  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: deliveryInclude,
  });

  if (!delivery) {
    throw new ApiError(404, "Delivery not found");
  }

  return mapDeliveryResponse(delivery);
};
