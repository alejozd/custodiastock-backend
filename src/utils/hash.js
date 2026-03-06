import bcrypt from "bcrypt";
import { createHash } from "node:crypto";

const SALT_ROUNDS = 10;

export const hashPassword = async (value) => bcrypt.hash(value, SALT_ROUNDS);

const isSha256Hash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);

export const verifyPassword = async (plainPassword, storedHash) => {
  if (!storedHash) {
    return false;
  }

  if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
    return bcrypt.compare(plainPassword, storedHash);
  }

  // Legacy compatibility for previous SHA-256 hashes.
  if (isSha256Hash(storedHash)) {
    const legacyHash = createHash("sha256").update(plainPassword).digest("hex");
    return legacyHash === storedHash;
  }

  return false;
};
