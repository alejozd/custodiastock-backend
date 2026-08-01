import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { logger } from "../utils/logger.js";

const prisma = new PrismaClient();
const username = process.env.ADMIN_USER;
const password = process.env.ADMIN_PASSWORD;

async function ensureSequences() {
  const sequences = [
    { name: "ENTREGA", prefix: "ENT-", nextNumber: 1 },
    { name: "ENTRADA", prefix: "ENTR-", nextNumber: 1 },
  ];

  for (const seq of sequences) {
    const existing = await prisma.sequence.findUnique({
      where: { name: seq.name },
    });

    if (!existing) {
      await prisma.sequence.create({ data: seq });
      logger.info("DB", `Secuencia ${seq.name} creada.`);
    }
  }
}

async function createUserIfNotExists(userData) {
  const existing = await prisma.user.findFirst({
    where: { username: userData.username },
  });

  if (existing) {
    if (userData.username === "admin") {
      logger.debug("AUTH", "USER SEED EXISTS: admin");
    } else {
      logger.debug("AUTH", `USER SEED EXISTS: ${userData.username}`);
    }
    return existing;
  }

  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const createdUser = await prisma.user.create({
    data: {
      username: userData.username,
      fullName: userData.fullName,
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      active: userData.active,
    },
  });

  if (userData.username === "admin") {
    logger.debug("AUTH", "USER SEED CREATED: admin");
  } else {
    logger.debug("AUTH", `USER SEED CREATED: ${userData.username}`);
  }

  return createdUser;
}

export async function ensureAdminUser() {
  await ensureSequences();

  const isProduction = process.env.NODE_ENV === "production";
  const seedAdminForced = process.env.SEED_ADMIN === "true";

  // Operator-supplied admin (from ADMIN_USER/ADMIN_PASSWORD) is always allowed:
  // it is not a public backdoor, it is the deployment's own bootstrap credential.
  if (username && password) {
    await createUserIfNotExists({
      username,
      password,
      fullName: username,
      email: "alejo@local.dev",
      role: "ADMIN",
      active: true,
    });
  }

  // The hardcoded "admin/admin123*" fallback is only safe outside production,
  // or when explicitly forced via SEED_ADMIN=true.
  if (isProduction && !seedAdminForced) {
    logger.info(
      "AUTH",
      "Default 'admin' user seeding skipped (NODE_ENV=production and SEED_ADMIN is not 'true').",
    );
    return;
  }

  await createUserIfNotExists({
    username: "admin",
    password: process.env.ADMIN_DEFAULT_PASSWORD || "admin123*",
    fullName: "System Admin",
    email: "admin@local.dev",
    role: "ADMIN",
    active: true,
  });
}
