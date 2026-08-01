import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { hashPassword, verifyPassword } from "../utils/hash.js";
import { logger } from "../utils/logger.js";

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

// Fixed bcrypt hash (cost 10, matches SALT_ROUNDS in utils/hash.js) with no
// corresponding real password. Used only to run a bcrypt comparison when a
// login username doesn't exist, so the response time is similar to the
// "user exists but wrong password" case and doesn't leak whether a given
// username exists via timing.
const DUMMY_PASSWORD_HASH =
  "$2b$10$K6rXqdb0NaBbnNhxWHJGZODn8oe/wuGYtE8VVli3crxl.f9ue.F2m";

/**
 * Throws if JWT_SECRET is not configured in production mode. Does not log or
 * exit the process itself — callers (the real server startup, in
 * src/server.js) decide how to react, so importing this module never has
 * process-killing side effects for scripts, workers, or tests that only need
 * e.g. `verifyAccessToken`.
 */
export function assertJwtSecretConfigured() {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is required in production mode.");
  }
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
    // Run a bcrypt comparison against a dummy hash even though there's no
    // real user to check, so this path takes roughly as long as the
    // "wrong password" path below and a caller can't infer whether
    // `username` exists just by measuring response time.
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    throw new ApiError(401, "Invalid credentials");
  }

  const passwordMatch = await verifyPassword(password, user.password);
  if (!passwordMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (!user.active) {
    logger.warn("AUTH", `Login blocked: user '${username}' is inactive`);
    throw new ApiError(401, "Invalid credentials");
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
