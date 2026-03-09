import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { ensureSequenceAdvanced, peekNextNumber } from "./sequenceService.js";

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
    documentNumber: delivery.documentNumber,
    status: delivery.status,
    productId: firstItem?.productId ?? null,
    quantity: firstItem?.quantity ?? null,
    deliveredById: delivery.deliveredById,
    receivedById: delivery.receivedById,
    signatureImage: delivery.signatureImage,
    cancelReason: delivery.cancelReason,
    canceledAt: delivery.canceledAt,
    canceledById: delivery.canceledById,
    deliveryDate: delivery.deliveryDate,
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
    "documentNumber",
    "productId",
    "quantity",
    "deliveredById",
    "receivedById",
    "signatureImage",
    "deliveryDate",
  ];

  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length) {
    throw new ApiError(400, "Missing required delivery fields", { missing });
  }

  if (payload.quantity <= 0) {
    throw new ApiError(400, "Quantity must be greater than 0");
  }

  const [product, deliveredBy, receivedBy] = await Promise.all([
    prisma.product.findFirst({
      where: { id: payload.productId, deletedAt: null },
    }),
    prisma.user.findFirst({
      where: { id: payload.deliveredById, deletedAt: null },
    }),
    prisma.user.findFirst({
      where: { id: payload.receivedById, deletedAt: null },
    }),
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

  try {
    const delivery = await prisma.delivery.create({
      data: {
        documentNumber: payload.documentNumber,
        deliveredById: payload.deliveredById,
        receivedById: payload.receivedById,
        signatureImage: payload.signatureImage,
        deliveryDate: new Date(payload.deliveryDate),
        items: {
          create: {
            productId: payload.productId,
            quantity: payload.quantity,
          },
        },
      },
      include: deliveryInclude,
    });

    // Advance sequence if necessary
    await ensureSequenceAdvanced("ENTREGA", payload.documentNumber);

    return mapDeliveryResponse(delivery);
  } catch (error) {
    // Check for unique constraint violation on documentNumber
    if (
      error.code === "P2002" &&
      error.meta?.target?.includes("numeroDocumento")
    ) {
      const nextSuggested = await peekNextNumber("ENTREGA");
      throw new ApiError(409, "Document number already exists", {
        suggestedNumber: nextSuggested,
      });
    }
    throw error;
  }
};

export const getDeliveries = async (filters = {}) => {
  const { startDate, endDate } = filters;

  const where = {
    deletedAt: null,
  };

  if (startDate || endDate) {
    where.deliveryDate = {};
    if (startDate) {
      where.deliveryDate.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      // Si la fecha viene solo como YYYY-MM-DD (10 caracteres)
      if (endDate.length <= 10) {
        end.setHours(23, 59, 59, 999);
      }
      where.deliveryDate.lte = end; // Antes decía createdAt, ¡bien corregido!
    }
  }

  const deliveries = await prisma.delivery.findMany({
    where,
    orderBy: { deliveryDate: "desc" },
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
