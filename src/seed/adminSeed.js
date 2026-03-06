import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const username = process.env.ADMIN_USER;
const password = process.env.ADMIN_PASSWORD;

export async function ensureAdminUser() {
  const existing = await prisma.user.findFirst({
    where: {
      username: username,
    },
  });

  if (existing) {
    console.log("ADMIN ya existe");
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      username,
      fullName: username,
      email: "alejo@local.dev",
      password: hashedPassword,
      role: "ADMIN",
      active: true,
    },
  });

  console.log("ADMIN creado automáticamente");
  console.log(admin);
}
