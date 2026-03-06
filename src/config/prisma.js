import { PrismaClient } from "@prisma/client";

const prismaClient = new PrismaClient();

const modelAliases = {
  user: ["user", "usuario"],
  product: ["product", "producto"],
  delivery: ["delivery", "entrega"],
};

const prisma = new Proxy(prismaClient, {
  get(target, prop, receiver) {
    if (typeof prop === "string" && modelAliases[prop]) {
      for (const candidate of modelAliases[prop]) {
        if (target[candidate]) {
          return target[candidate];
        }
      }
    }

    return Reflect.get(target, prop, receiver);
  },
});

const missingModels = Object.entries(modelAliases)
  .filter(([, candidates]) => !candidates.some((candidate) => prismaClient[candidate]))
  .map(([canonical]) => canonical);

if (missingModels.length > 0) {
  console.warn(
    `[Prisma] Missing delegates for models: ${missingModels.join(", ")}. ` +
      "Run 'npx prisma generate' to sync Prisma Client with schema."
  );
}

export default prisma;
