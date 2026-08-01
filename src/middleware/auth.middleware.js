import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { verifyAccessToken } from "../services/auth.service.js";

export const authMiddleware = async (req, res, next) => {
  const headerValue = req.headers.authorization;

  if (!headerValue) {
    return next(new ApiError(401, "Authorization header is required"));
  }

  const [scheme, token] = headerValue.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new ApiError(401, "Authorization format must be: Bearer <token>"));
  }

  const payload = verifyAccessToken(token);

  // Re-check the user on every request: a valid JWT signature alone doesn't
  // tell us the account is still active, so a deactivated/deleted user's
  // still-unexpired token must stop working immediately.
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, role: true, active: true, deletedAt: true },
    });
  } catch (error) {
    // Distinguish DB connectivity/timeout failures from any other error, so
    // a transient outage surfaces as a 503 instead of a generic 500. A real
    // "can't reach the database" failure is a PrismaClientInitializationError,
    // which carries its P1xxx code in `.errorCode` (not `.code`); a query
    // that runs but times out on the connection pool is a
    // PrismaClientKnownRequestError with code "P2024", which does use `.code`.
    const connectivityCode = error?.errorCode || error?.code;
    if (
      connectivityCode &&
      (connectivityCode.startsWith("P1") || connectivityCode === "P2024")
    ) {
      return next(new ApiError(503, "Service temporarily unavailable, please try again."));
    }
    return next(error);
  }

  if (!user || !user.active || user.deletedAt) {
    return next(new ApiError(401, "Session is no longer valid"));
  }

  req.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    active: user.active,
  };

  return next();
};
