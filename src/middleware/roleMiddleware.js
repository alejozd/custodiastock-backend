import { ApiError } from "../utils/apiError.js";

export const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "User not authenticated"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden: Insufficient permissions"));
    }

    next();
  };
};
