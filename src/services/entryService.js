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

const entryInclude = {
  createdBy: {
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

const mapEntryResponse = (entry) => {
  return {
    id: entry.id,
    documentNumber: entry.documentNumber,
    status: entry.status,
    items: (entry.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      product: item.product,
    })),
    userId: entry.userId,
    cancelReason: entry.cancelReason,
    canceledAt: entry.canceledAt,
    canceledById: entry.canceledById,
    entryDate: entry.entryDate ? entry.entryDate.toISOString() : null,
    createdAt: entry.createdAt ? entry.createdAt.toISOString() : null,
    deletedAt: entry.deletedAt,
    createdBy: entry.createdBy,
    canceledBy: entry.canceledBy,
  };
};

const getActiveEntryEntityById = async (id) => {
  const entry = await prisma.entry.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: entryInclude,
  });

  if (!entry) {
    throw new ApiError(404, "Entry not found");
  }

  return entry;
};

export const createEntry = async (payload) => {
  const requiredFields = [
    "documentNumber",
    "items",
    "userId",
    "entryDate",
  ];

  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length) {
    throw new ApiError(400, "Missing required entry fields", { missing });
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

  const [products, createdBy] = await Promise.all([
    prisma.product.findMany({
      where: {
        id: { in: uniqueProductIds },
        deletedAt: null,
        active: true,
      },
    }),
    prisma.user.findFirst({
      where: { id: payload.userId, deletedAt: null },
    }),
  ]);

  if (products.length !== uniqueProductIds.length) {
    throw new ApiError(
      400,
      "One or more products do not exist or are inactive",
    );
  }

  if (!createdBy || !createdBy.active) {
    throw new ApiError(400, "User does not exist or is inactive");
  }

  try {
    const entry = await prisma.entry.create({
      data: {
        documentNumber: payload.documentNumber,
        userId: payload.userId,
        entryDate: dayjs.tz(payload.entryDate, COLOMBIA_TZ).startOf("day").toDate(),
        items: {
          create: payload.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: entryInclude,
    });

    // Advance sequence if necessary
    await ensureSequenceAdvanced("ENTRADA", payload.documentNumber);

    return mapEntryResponse(entry);
  } catch (error) {
    // Check for unique constraint violation on documentNumber
    if (
      error.code === "P2002" &&
      error.meta?.target?.includes("numeroDocumento")
    ) {
      const nextSuggested = await peekNextNumber("ENTRADA");
      throw new ApiError(409, "Document number already exists", {
        suggestedNumber: nextSuggested,
      });
    }
    throw error;
  }
};

export const getEntries = async (filters = {}) => {
  const { startDate, endDate } = filters;

  const where = {
    deletedAt: null,
  };

  if (startDate || endDate) {
    where.entryDate = {};
    if (startDate) {
      where.entryDate.gte = dayjs
        .tz(startDate, COLOMBIA_TZ)
        .startOf("day")
        .toDate();
    }
    if (endDate) {
      where.entryDate.lte = dayjs
        .tz(endDate, COLOMBIA_TZ)
        .endOf("day")
        .toDate();
    }
  }

  const entries = await prisma.entry.findMany({
    where,
    orderBy: { entryDate: "desc" },
    include: entryInclude,
  });

  return entries.map(mapEntryResponse);
};

export const getEntryById = async (id) => {
  const entry = await getActiveEntryEntityById(id);
  return mapEntryResponse(entry);
};

export const cancelEntry = async (id, payload) => {
  const { adminUserId, reason } = payload;

  if (!adminUserId || !reason) {
    throw new ApiError(400, "adminUserId and reason are required");
  }

  const [entry, adminUser] = await Promise.all([
    getActiveEntryEntityById(id),
    prisma.user.findFirst({ where: { id: adminUserId, deletedAt: null } }),
  ]);

  if (!adminUser || !adminUser.active) {
    throw new ApiError(400, "Admin user does not exist or is inactive");
  }

  // Follow the pattern of delivery cancellation
  if (adminUser.role !== "ADMIN") {
    throw new ApiError(403, "Only ADMIN users can cancel entries");
  }

  if (entry.status === "CANCELED") {
    throw new ApiError(409, "Entry is already canceled");
  }

  const canceled = await prisma.entry.update({
    where: { id },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
      canceledById: adminUserId,
      cancelReason: reason,
    },
    include: entryInclude,
  });

  return mapEntryResponse(canceled);
};
