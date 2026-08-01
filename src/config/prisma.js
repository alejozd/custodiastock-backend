import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger.js";

const prisma = new PrismaClient();

// Fail loudly at startup, not on the first real request, if the generated
// Prisma Client is out of sync with the schema (e.g. someone forgot to run
// `npx prisma generate` after a migration).
const expectedModels = [
  "user",
  "product",
  "entry",
  "entryItem",
  "delivery",
  "deliveryItem",
  "sequence",
  "license",
];

const missingModels = expectedModels.filter((model) => !prisma[model]);

if (missingModels.length > 0) {
  logger.warn(
    "PRISMA",
    `Missing delegates for models: ${missingModels.join(", ")}. Run 'npx prisma generate' to sync Prisma Client with schema.`,
  );
}

export default prisma;
