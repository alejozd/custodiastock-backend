import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { hashPassword, verifyPassword } from "../utils/hash.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

if (!JWT_SECRET) {
  console.warn("[Auth] JWT_SECRET is not defined. Login/token verification will fail until it is configured.");
}

const buildTokenPayload = (user) => ({
  sub: user.id,
  email: user.email,
  role: user.role,
  active: user.active,
});

export const login = async ({ email, password }) => {
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await prisma.user.findFirst({
    where: {
      email,
      deletedAt: null,
    },
  });

  if (!user) {
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
      name: user.name,
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
