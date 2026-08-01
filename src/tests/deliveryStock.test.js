import { createDelivery, cancelDelivery } from "../services/deliveryService.js";
import { createEntry } from "../services/entryService.js";
import prisma from "../config/prisma.js";

describe("Delivery Service - stock and cancellation", () => {
  let adminUser;
  let operatorUser;
  let product;

  beforeAll(async () => {
    adminUser = await prisma.user.upsert({
      where: { username: "admin_delivery_test" },
      update: {},
      create: {
        username: "admin_delivery_test",
        fullName: "Admin Delivery Test",
        password: "password123",
        role: "ADMIN",
        active: true,
      },
    });

    operatorUser = await prisma.user.upsert({
      where: { username: "operator_delivery_test" },
      update: {},
      create: {
        username: "operator_delivery_test",
        fullName: "Operator Delivery Test",
        password: "password123",
        role: "OPERATOR",
        active: true,
      },
    });

    await prisma.sequence.upsert({
      where: { name: "ENTRADA" },
      update: {},
      create: { name: "ENTRADA", prefix: "ENTR-", nextNumber: 1 },
    });

    await prisma.sequence.upsert({
      where: { name: "ENTREGA" },
      update: {},
      create: { name: "ENTREGA", prefix: "ENT-", nextNumber: 1 },
    });

    product = await prisma.product.create({
      data: {
        name: "Delivery Test Product",
        reference: "TEST-DEL-PROD-001",
      },
    });

    // Stock inicial: 10 unidades disponibles vía una entrada real.
    await createEntry({
      documentNumber: "ENTR-DEL-TEST-001",
      userId: adminUser.id,
      entryDate: new Date().toISOString(),
      items: [{ productId: product.id, quantity: 10 }],
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

  it("creates a delivery when the requested quantity is within available stock", async () => {
    const delivery = await createDelivery({
      documentNumber: "ENT-DEL-TEST-001",
      deliveredById: adminUser.id,
      receivedById: operatorUser.id,
      signatureImage: "data:image/png;base64,AAAA",
      deliveryDate: new Date().toISOString(),
      items: [{ productId: product.id, quantity: 4 }],
    });

    expect(delivery).toBeDefined();
    expect(delivery.documentNumber).toBe("ENT-DEL-TEST-001");
    expect(delivery.status).toBe("ACTIVE");
    expect(delivery.items).toHaveLength(1);
    expect(delivery.items[0].productId).toBe(product.id);
    expect(delivery.items[0].quantity).toBe(4);
  });

  it("rejects a delivery that requests more quantity than is available", async () => {
    await expect(
      createDelivery({
        documentNumber: "ENT-DEL-TEST-002",
        deliveredById: adminUser.id,
        receivedById: operatorUser.id,
        signatureImage: "data:image/png;base64,AAAA",
        deliveryDate: new Date().toISOString(),
        // Only 6 units remain available (10 - 4 delivered above).
        items: [{ productId: product.id, quantity: 999 }],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("Insufficient stock"),
    });
  });

  describe("cancellation", () => {
    let deliveryToCancel;

    beforeAll(async () => {
      deliveryToCancel = await createDelivery({
        documentNumber: "ENT-DEL-TEST-003",
        deliveredById: adminUser.id,
        receivedById: operatorUser.id,
        signatureImage: "data:image/png;base64,AAAA",
        deliveryDate: new Date().toISOString(),
        items: [{ productId: product.id, quantity: 1 }],
      });
    });

    it("cancels the delivery when the requesting user is ADMIN", async () => {
      const canceled = await cancelDelivery(deliveryToCancel.id, {
        adminUserId: adminUser.id,
        reason: "Test cancellation",
      });

      expect(canceled.status).toBe("CANCELED");
      expect(canceled.canceledById).toBe(adminUser.id);
    });

    it("rejects cancelling a delivery that is already canceled", async () => {
      await expect(
        cancelDelivery(deliveryToCancel.id, {
          adminUserId: adminUser.id,
          reason: "Second attempt",
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Delivery is already canceled",
      });
    });

    it("rejects cancellation when the requesting user is not ADMIN", async () => {
      const another = await createDelivery({
        documentNumber: "ENT-DEL-TEST-004",
        deliveredById: adminUser.id,
        receivedById: operatorUser.id,
        signatureImage: "data:image/png;base64,AAAA",
        deliveryDate: new Date().toISOString(),
        items: [{ productId: product.id, quantity: 1 }],
      });

      await expect(
        cancelDelivery(another.id, {
          adminUserId: operatorUser.id,
          reason: "Should fail",
        }),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Only ADMIN users can cancel deliveries",
      });
    });
  });
});
