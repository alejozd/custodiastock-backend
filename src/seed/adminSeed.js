import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
      console.log(`Secuencia '${seq.name}' creada.`);
    }
  }
}

export async function ensureAdminUser() {
  await ensureSequences();

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
