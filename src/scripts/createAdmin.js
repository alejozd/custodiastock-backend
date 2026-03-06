import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = "usaurio";
  const password = "password123";

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: username,
      email: `${username}@local.dev`,
      password: hashedPassword,
      role: "ADMIN",
      active: true,
    },
  });

  console.log("Usuario ADMIN creado correctamente");
  console.log(user);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
