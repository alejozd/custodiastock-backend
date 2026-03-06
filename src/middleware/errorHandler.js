const mapPrismaError = (error) => {
  // P2021: table does not exist
  if (error?.code === "P2021") {
    return {
      statusCode: 500,
      message:
        "Database schema is not synchronized. Run 'npm run prisma:sync' and restart the API.",
      details: {
        prismaCode: error.code,
        meta: error.meta,
      },
    };
  }

  // P2022: column does not exist
  if (error?.code === "P2022") {
    return {
      statusCode: 500,
      message:
        "Database columns are out of sync. Run 'npm run prisma:sync' and restart the API.",
      details: {
        prismaCode: error.code,
        meta: error.meta,
      },
    };
  }

  return null;
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const prismaMapped = mapPrismaError(error);

  const statusCode = prismaMapped?.statusCode || error.statusCode || 500;
  const payload = {
    message: prismaMapped?.message || error.message || "Internal server error",
  };

  if (prismaMapped?.details || error.details) {
    payload.details = prismaMapped?.details || error.details;
  }

  if (process.env.NODE_ENV !== "production" && error.stack) {
    payload.stack = error.stack;
  }

  return res.status(statusCode).json(payload);
};
