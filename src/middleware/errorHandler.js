import { ApiError } from "../utils/apiError.js";
import { logger } from "../utils/logger.js";

const mapUploadError = (error) => {
  if (error?.name !== "MulterError") {
    return null;
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    return {
      statusCode: 400,
      message: "File is too large. Maximum allowed size is 5MB.",
    };
  }

  return {
    statusCode: 400,
    message: error.message || "Invalid uploaded file",
  };
};

const mapPrismaError = (error) => {
  // P2021: table does not exist
  if (error?.code === "P2021") {
    return {
      statusCode: 500,
      message:
        "Database schema is not synchronized. Run 'npm run prisma:sync' and restart the API.",
      details: {
        prismaCode: error.code,
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
      },
    };
  }

  // P2003: foreign key constraint violation
  if (error?.code === "P2003") {
    return {
      statusCode: 400,
      message:
        "Cannot complete this operation: related records exist or reference is invalid.",
      details: {
        prismaCode: error.code,
      },
    };
  }

  // P2025: record not found (e.g. required relation missing)
  if (error?.code === "P2025") {
    return {
      statusCode: 404,
      message: "The requested record was not found.",
      details: {
        prismaCode: error.code,
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
  const uploadMapped = mapUploadError(error);

  const mappedError = uploadMapped || prismaMapped;

  const statusCode = mappedError?.statusCode || error.statusCode || 500;

  logger.error("HTTP", error.message, {
    stack: error.stack,
    code: error.code,
    meta: error.meta,
  });

  let message;
  if (mappedError?.message) {
    message = mappedError.message;
  } else if (error instanceof ApiError) {
    message = error.message;
  } else {
    message = "Internal server error";
  }

  const payload = { message };

  if (prismaMapped?.details || error.details) {
    payload.details = prismaMapped?.details || error.details;
  }

  if (process.env.NODE_ENV !== "production" && error.stack) {
    payload.stack = error.stack;
  }

  return res.status(statusCode).json(payload);
};
