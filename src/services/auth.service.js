import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { hashPassword, verifyPassword } from "../utils/hash.js";

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DEV_FALLBACK_SECRET = "dev-only-change-me";

const JWT_SECRET = process.env.JWT_SECRET || (!IS_PRODUCTION ? DEV_FALLBACK_SECRET : undefined);

if (!process.env.JWT_SECRET && !IS_PRODUCTION) {
  console.warn(
    "[Auth] JWT_SECRET is not configured. Using temporary development secret. " +
      "Set JWT_SECRET in .env for stable tokens across restarts."
  );
}

if (!JWT_SECRET && IS_PRODUCTION) {
  console.error("[Auth] JWT_SECRET is required in production mode.");
}

const buildTokenPayload = (user) => ({
  sub: user.id,
  username: user.username,
  role: user.role,
  active: user.active,
});

export const login = async ({ username, password }) => {
  if (!username || !password) {
    throw new ApiError(400, "Username and password are required");
  }

  const user = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (!user || user.deletedAt) {
    throw new ApiError(401, "Invalid credentials");
  }

  const passwordMatch = await verifyPassword(password, user.password);
  if (!passwordMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (!user.active) {
    throw new ApiError(403, "User is inactive");
  }

  if (!JWT_SECRET) {
    throw new ApiError(500, "JWT_SECRET is not configured");
  }

  // Transparent migration: if legacy sha256 hash, rehash with bcrypt on successful login.
  if (!user.password.startsWith("$2")) {
    const newHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHash },
    });
  }

  const token = jwt.sign(buildTokenPayload(user), JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return {
    token,
    tokenType: "Bearer",
    expiresIn: JWT_EXPIRES_IN,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      active: user.active,
    },
  };
};

export const verifyAccessToken = (token) => {
  if (!JWT_SECRET) {
    throw new ApiError(500, "JWT_SECRET is not configured");
  }

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }
};
