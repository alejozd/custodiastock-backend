import { ApiError } from "../utils/apiError.js";
import { verifyAccessToken } from "../services/auth.service.js";

export const authMiddleware = (req, res, next) => {
  const headerValue = req.headers.authorization;

  if (!headerValue) {
    return next(new ApiError(401, "Authorization header is required"));
  }

  const [scheme, token] = headerValue.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new ApiError(401, "Authorization format must be: Bearer <token>"));
  }

  const payload = verifyAccessToken(token);

  req.user = {
    id: payload.sub,
    username: payload.username,
    role: payload.role,
    active: payload.active,
  };

  return next();
};
