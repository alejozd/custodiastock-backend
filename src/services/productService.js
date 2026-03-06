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


const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const normalizeHeader = (header) =>
  String(header || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");

const parseActiveValue = (value, rowNumber) => {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["true", "1", "si", "sí", "yes", "y"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }

  throw new ApiError(400, "Invalid active value in import file", {
    row: rowNumber,
    value,
    acceptedValues: ["true", "false", "1", "0", "si", "no"],
  });
};

const getHeaderIndex = (normalizedHeaders, aliases) =>
  normalizedHeaders.findIndex((header) => aliases.includes(header));

export const importProductsFromCsv = async (csvContent) => {
  if (!csvContent || !String(csvContent).trim()) {
    throw new ApiError(400, "CSV content is required");
  }

  const rows = String(csvContent)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length < 2) {
    throw new ApiError(400, "CSV must include header and at least one data row");
  }

  const normalizedHeaders = parseCsvLine(rows[0]).map(normalizeHeader);
  const nameIndex = getHeaderIndex(normalizedHeaders, ["name", "nombre"]);
  const referenceIndex = getHeaderIndex(normalizedHeaders, ["reference", "referencia", "codigo"]);
  const descriptionIndex = getHeaderIndex(normalizedHeaders, ["description", "descripcion"]);
  const activeIndex = getHeaderIndex(normalizedHeaders, ["active", "activo"]);

  if (nameIndex === -1 || referenceIndex === -1) {
    throw new ApiError(400, "CSV header must include name/nombre and reference/referencia");
  }

  const invalidRows = [];
  const productsToCreate = [];
  const seenReferences = new Set();

  rows.slice(1).forEach((line, idx) => {
    const rowNumber = idx + 2;
    const values = parseCsvLine(line);

    const name = values[nameIndex]?.trim();
    const reference = values[referenceIndex]?.trim();
    const description = descriptionIndex === -1 ? undefined : (values[descriptionIndex]?.trim() || null);

    if (!name || !reference) {
      invalidRows.push({ row: rowNumber, reason: "name and reference are required" });
      return;
    }

    if (seenReferences.has(reference)) {
      invalidRows.push({ row: rowNumber, reason: "reference is duplicated in file", reference });
      return;
    }

    let active = true;

    try {
      if (activeIndex !== -1) {
        active = parseActiveValue(values[activeIndex], rowNumber);
      }
    } catch (error) {
      invalidRows.push({ row: rowNumber, reason: error.message, value: values[activeIndex] });
      return;
    }

    seenReferences.add(reference);
    productsToCreate.push({
      name,
      reference,
      description,
      active,
    });
  });

  if (productsToCreate.length === 0) {
    throw new ApiError(400, "No valid rows to import", { invalidRows });
  }

  const result = await prisma.product.createMany({
    data: productsToCreate,
    skipDuplicates: true,
  });

  return {
    totalRows: rows.length - 1,
    validRows: productsToCreate.length,
    importedCount: result.count,
    skippedCount: productsToCreate.length - result.count,
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
