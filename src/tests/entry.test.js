import { createEntry, getEntries, getEntryById } from "../services/entryService.js";
import prisma from "../config/prisma.js";

describe("Entry Service with sourceDocument", () => {
  let adminUser;
  let product;

  beforeAll(async () => {
    // Manually create admin user without relying on env vars in seed
    adminUser = await prisma.user.upsert({
      where: { username: "admin_test" },
      update: {},
      create: {
        username: "admin_test",
        fullName: "Admin Test",
        password: "password123",
        role: "ADMIN",
        active: true,
      }
    });

    // Ensure sequences exist
    await prisma.sequence.upsert({
      where: { name: "ENTRADA" },
      update: {},
      create: { name: "ENTRADA", prefix: "ENTR-", nextNumber: 1 }
    });

    product = await prisma.product.create({
      data: {
        name: "Test Product",
        reference: "TEST-PROD-001",
      },
    });
  });

  afterAll(async () => {
    await prisma.deliveryItem.deleteMany();
    await prisma.delivery.deleteMany();
    await prisma.entryItem.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.sequence.deleteMany();
    await prisma.$disconnect();
  });

  it("should create an entry with sourceDocument", async () => {
    const payload = {
      documentNumber: "ENTR-TEST-001",
      sourceDocument: "FAC-12345",
      userId: adminUser.id,
      entryDate: new Date().toISOString(),
      items: [
        {
          productId: product.id,
          quantity: 10,
        },
      ],
    };

    const entry = await createEntry(payload);

    expect(entry).toBeDefined();
    expect(entry.documentNumber).toBe(payload.documentNumber);
    expect(entry.sourceDocument).toBe(payload.sourceDocument);
    expect(entry.items).toHaveLength(1);
    expect(entry.items[0].productId).toBe(product.id);
  });

  it("should return sourceDocument in getEntries", async () => {
    const entries = await getEntries();
    const testEntry = entries.find(e => e.documentNumber === "ENTR-TEST-001");

    expect(testEntry).toBeDefined();
    expect(testEntry.sourceDocument).toBe("FAC-12345");
  });

  it("should return sourceDocument in getEntryById", async () => {
    const entries = await getEntries();
    const id = entries.find(e => e.documentNumber === "ENTR-TEST-001").id;

    const entry = await getEntryById(id);

    expect(entry).toBeDefined();
    expect(entry.sourceDocument).toBe("FAC-12345");
  });
});
