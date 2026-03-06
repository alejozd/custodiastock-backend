import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";

const deliveryInclude = {
  deliveredBy: {
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      role: true,
      active: true,
    },
  },
  receivedBy: {
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      role: true,
      active: true,
    },
  },
  canceledBy: {
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      role: true,
    },
  },
  items: {
    where: {
      deletedAt: null,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          reference: true,
          active: true,
        },
      },
    },
  },
};

const mapDeliveryResponse = (delivery) => {
  const firstItem = delivery.items?.[0];

  return {
    id: delivery.id,
    status: delivery.status,
    productId: firstItem?.productId ?? null,
    quantity: firstItem?.quantity ?? null,
    deliveredById: delivery.deliveredById,
    receivedById: delivery.receivedById,
    signatureImage: delivery.signatureImage,
    cancelReason: delivery.cancelReason,
    canceledAt: delivery.canceledAt,
    canceledById: delivery.canceledById,
    createdAt: delivery.createdAt,
    deletedAt: delivery.deletedAt,
    product: firstItem?.product ?? null,
    deliveredBy: delivery.deliveredBy,
    receivedBy: delivery.receivedBy,
    canceledBy: delivery.canceledBy,
  };
};

const getActiveDeliveryEntityById = async (id) => {
  const delivery = await prisma.delivery.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: deliveryInclude,
  });

  if (!delivery) {
    throw new ApiError(404, "Delivery not found");
  }

  return delivery;
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
    prisma.product.findFirst({ where: { id: payload.productId, deletedAt: null } }),
    prisma.user.findFirst({ where: { id: payload.deliveredById, deletedAt: null } }),
    prisma.user.findFirst({ where: { id: payload.receivedById, deletedAt: null } }),
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
    where: {
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    include: deliveryInclude,
  });

  return deliveries.map(mapDeliveryResponse);
};

export const getDeliveryById = async (id) => {
  const delivery = await getActiveDeliveryEntityById(id);
  return mapDeliveryResponse(delivery);
};

export const cancelDelivery = async (id, payload) => {
  const { adminUserId, reason } = payload;

  if (!adminUserId || !reason) {
    throw new ApiError(400, "adminUserId and reason are required");
  }

  const [delivery, adminUser] = await Promise.all([
    getActiveDeliveryEntityById(id),
    prisma.user.findFirst({ where: { id: adminUserId, deletedAt: null } }),
  ]);

  if (!adminUser || !adminUser.active) {
    throw new ApiError(400, "Admin user does not exist or is inactive");
  }

  if (adminUser.role !== "ADMIN") {
    throw new ApiError(403, "Only ADMIN users can cancel deliveries");
  }

  if (delivery.status === "CANCELED") {
    throw new ApiError(409, "Delivery is already canceled");
  }

  const canceled = await prisma.delivery.update({
    where: { id },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
      canceledById: adminUserId,
      cancelReason: reason,
    },
    include: deliveryInclude,
  });

  return mapDeliveryResponse(canceled);
};

export const deleteDelivery = async (id) => {
  await getActiveDeliveryEntityById(id);

  await prisma.$transaction([
    prisma.deliveryItem.updateMany({
      where: { deliveryId: id, deletedAt: null },
      data: { deletedAt: new Date() },
    }),
    prisma.delivery.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
  ]);
};
