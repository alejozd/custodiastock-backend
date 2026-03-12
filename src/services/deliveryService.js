import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { ensureSequenceAdvanced, peekNextNumber } from "./sequenceService.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

// Configuración de Day.js para manejar Colombia
dayjs.extend(utc);
dayjs.extend(timezone);
const COLOMBIA_TZ = "America/Bogota";

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
  return {
    id: delivery.id,
    documentNumber: delivery.documentNumber,
    status: delivery.status,
    items: (delivery.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      product: item.product,
    })),
    deliveredById: delivery.deliveredById,
    receivedById: delivery.receivedById,
    signatureImage: delivery.signatureImage,
    cancelReason: delivery.cancelReason,
    canceledAt: delivery.canceledAt,
    canceledById: delivery.canceledById,
    deliveryDate: delivery.deliveryDate
      ? delivery.deliveryDate.toISOString()
      : null,
    createdAt: delivery.createdAt ? delivery.createdAt.toISOString() : null,
    deletedAt: delivery.deletedAt,
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
    "items",
    "deliveredById",
    "receivedById",
    "signatureImage",
    "deliveryDate",
  ];

  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length) {
    throw new ApiError(400, "Missing required delivery fields", { missing });
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new ApiError(400, "Items must be a non-empty array");
  }

  for (const item of payload.items) {
    if (!item.productId || !item.quantity || item.quantity <= 0) {
      throw new ApiError(
        400,
        "Each item must have a valid productId and quantity greater than 0",
      );
    }
  }

  const productIds = payload.items.map((i) => i.productId);
  const uniqueProductIds = [...new Set(productIds)];

  const [products, deliveredBy, receivedBy] = await Promise.all([
    prisma.product.findMany({
      where: {
        id: { in: uniqueProductIds },
        deletedAt: null,
        active: true,
      },
    }),
    prisma.user.findFirst({
      where: { id: payload.deliveredById, deletedAt: null },
    }),
    prisma.user.findFirst({
      where: { id: payload.receivedById, deletedAt: null },
    }),
  ]);

  if (products.length !== uniqueProductIds.length) {
    throw new ApiError(
      400,
      "One or more products do not exist or are inactive",
    );
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
        deliveryDate: dayjs.tz(payload.deliveryDate, COLOMBIA_TZ).startOf("day").toDate(),
        items: {
          create: payload.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
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
      where.deliveryDate.gte = dayjs
        .tz(startDate, COLOMBIA_TZ)
        .startOf("day")
        .toDate();
    }
    if (endDate) {
      where.deliveryDate.lte = dayjs
        .tz(endDate, COLOMBIA_TZ)
        .endOf("day")
        .toDate();
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
