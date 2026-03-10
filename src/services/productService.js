import XLSX from "xlsx";
import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

// Configuración de Day.js para manejar Colombia
dayjs.extend(utc);
dayjs.extend(timezone);
const COLOMBIA_TZ = "America/Bogota";

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

const normalizeHeader = (header) =>
  String(header || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const parseActiveValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["true", "1", "si", "sí", "yes", "y"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }

  throw new Error("active must be true/false");
};

export const importProductsFromExcel = async (filePath) => {
  if (!filePath) {
    throw new ApiError(400, "Excel file path is required");
  }

  const workbook = XLSX.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new ApiError(400, "Excel file does not contain sheets");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false,
  });

  const totalRows = rows.length;

  if (totalRows === 0) {
    return {
      totalRows: 0,
      validRows: 0,
      importedCount: 0,
      skippedCount: 0,
      invalidRows: [],
    };
  }

  const invalidRows = [];
  const productsToCreate = [];

  rows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const normalizedRow = Object.entries(rawRow).reduce((acc, [key, value]) => {
      acc[normalizeHeader(key)] = value;
      return acc;
    }, {});

    const reference = String(normalizedRow.reference || normalizedRow.referencia || "").trim();
    const name = String(normalizedRow.name || normalizedRow.nombre || "").trim();
    const descriptionValue = normalizedRow.description ?? normalizedRow.descripcion;
    const description = descriptionValue === "" ? null : String(descriptionValue || "").trim() || null;

    if (!reference) {
      invalidRows.push({ row: rowNumber, reason: "reference is required" });
      return;
    }

    if (!name) {
      invalidRows.push({ row: rowNumber, reason: "name is required" });
      return;
    }

    let active = true;

    try {
      active = parseActiveValue(normalizedRow.active ?? normalizedRow.activo);
    } catch {
      invalidRows.push({ row: rowNumber, reason: "active must be true or false" });
      return;
    }

    productsToCreate.push({
      reference,
      name,
      description,
      active,
    });
  });

  if (productsToCreate.length === 0) {
    return {
      totalRows,
      validRows: 0,
      importedCount: 0,
      skippedCount: 0,
      invalidRows,
    };
  }

  const insertResult = await prisma.product.createMany({
    data: productsToCreate,
    skipDuplicates: true,
  });

  return {
    totalRows,
    validRows: productsToCreate.length,
    importedCount: insertResult.count,
    skippedCount: productsToCreate.length - insertResult.count,
    invalidRows,
  };
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

export const getProductStockReport = async (filters = {}) => {
  const { startDate, endDate } = filters;

  const entryWhere = {
    deletedAt: null,
    entry: {
      status: "ACTIVE",
      deletedAt: null,
    },
  };

  const deliveryWhere = {
    deletedAt: null,
    delivery: {
      status: "ACTIVE",
      deletedAt: null,
    },
  };

  if (startDate || endDate) {
    const entryDateFilter = {};
    const deliveryDateFilter = {};

    if (startDate) {
      const start = dayjs.tz(startDate, COLOMBIA_TZ).startOf("day").toDate();
      entryDateFilter.gte = start;
      deliveryDateFilter.gte = start;
    }
    if (endDate) {
      const end = dayjs.tz(endDate, COLOMBIA_TZ).endOf("day").toDate();
      entryDateFilter.lte = end;
      deliveryDateFilter.lte = end;
    }

    entryWhere.entry.entryDate = entryDateFilter;
    deliveryWhere.delivery.deliveryDate = deliveryDateFilter;
  }

  // Get all active products first to ensure we show products even with 0 stock
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      reference: true,
    },
  });

  const [entriesByProduct, deliveriesByProduct] = await Promise.all([
    prisma.entryItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      where: entryWhere,
    }),
    prisma.deliveryItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      where: deliveryWhere,
    }),
  ]);

  const entriesMap = entriesByProduct.reduce((acc, curr) => {
    acc[curr.productId] = curr._sum.quantity || 0;
    return acc;
  }, {});

  const deliveriesMap = deliveriesByProduct.reduce((acc, curr) => {
    acc[curr.productId] = curr._sum.quantity || 0;
    return acc;
  }, {});

  return products.map((product) => {
    const totalEntries = entriesMap[product.id] || 0;
    const totalDeliveries = deliveriesMap[product.id] || 0;
    return {
      id: product.id,
      name: product.name,
      reference: product.reference,
      totalEntries,
      totalDeliveries,
      stock: totalEntries - totalDeliveries,
    };
  });
};
