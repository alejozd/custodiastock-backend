import { createHash } from "node:crypto";

export const hashPassword = (value) =>
  createHash("sha256").update(value).digest("hex");
