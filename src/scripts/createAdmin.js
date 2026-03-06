import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = "usuario";
  const password = "pasword123";

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username: username,
      email: `${username}@local.dev`,
      fullName: "John Doe",
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
