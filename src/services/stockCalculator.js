/**
 * Calculates active stock (active entries minus active deliveries) for a set
 * of products.
 *
 * Shared by `deliveryService.createDelivery` (called with the transaction's
 * `tx` client, so the read stays consistent with the delivery being created
 * in that same transaction) and `productService.getProductStockReport`
 * (called with the plain `prisma` client, outside any transaction). Accepts
 * either client because both are Prisma clients exposing the same
 * `entryItem`/`deliveryItem` model API.
 *
 * @param {import("@prisma/client").PrismaClient | import("@prisma/client").Prisma.TransactionClient} tx - Prisma client or transaction to run the queries with.
 * @param {number[]} productIds - Product ids to scope the calculation to.
 * @param {{ entryDateFilter?: object, deliveryDateFilter?: object }} [dateFilters] - Optional Prisma date-range filters applied to `entry.entryDate` / `delivery.deliveryDate` respectively (used by productService's report date range; deliveryService does not need this).
 * @returns {Promise<{ entriesMap: Record<number, number>, deliveriesMap: Record<number, number>, availableStock: Record<number, number> }>}
 */
export const calculateAvailableStock = async (tx, productIds, dateFilters = {}) => {
  const { entryDateFilter, deliveryDateFilter } = dateFilters;

  const entryWhere = {
    productId: { in: productIds },
    deletedAt: null,
    entry: {
      status: "ACTIVE",
      deletedAt: null,
      ...(entryDateFilter ? { entryDate: entryDateFilter } : {}),
    },
  };

  const deliveryWhere = {
    productId: { in: productIds },
    deletedAt: null,
    delivery: {
      status: "ACTIVE",
      deletedAt: null,
      ...(deliveryDateFilter ? { deliveryDate: deliveryDateFilter } : {}),
    },
  };

  const [entriesByProduct, deliveriesByProduct] = await Promise.all([
    tx.entryItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      where: entryWhere,
    }),
    tx.deliveryItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      where: deliveryWhere,
    }),
  ]);

  const entriesMap = entriesByProduct.reduce((acc, curr) => {
    acc[curr.productId] = curr._sum.quantity || 0;
    return acc;
  }, {});

  const deliveriesMap = deliveriesByProduct.reduce((acc, curr) => {
    acc[curr.productId] = curr._sum.quantity || 0;
    return acc;
  }, {});

  const availableStock = productIds.reduce((acc, productId) => {
    acc[productId] = (entriesMap[productId] || 0) - (deliveriesMap[productId] || 0);
    return acc;
  }, {});

  return { entriesMap, deliveriesMap, availableStock };
};
