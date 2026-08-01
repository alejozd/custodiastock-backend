import { createHash, timingSafeEqual } from "node:crypto";
import { logger } from "../utils/logger.js";

// Hashing to a fixed-length digest before comparing means timingSafeEqual
// never short-circuits on a length mismatch, so neither the length nor the
// content of SWAGGER_USER/SWAGGER_PASSWORD can be inferred from response
// timing across repeated guesses.
const secureEquals = (a, b) => {
  const digestA = createHash("sha256").update(a).digest();
  const digestB = createHash("sha256").update(b).digest();
  return timingSafeEqual(digestA, digestB);
};

// Basic Auth guard for /api/docs. This route is browsed directly from a
// browser (no Bearer token), so the normal JWT authMiddleware doesn't apply
// here — HTTP Basic Auth is what makes the browser show its native
// username/password prompt.
//
// Credentials come from SWAGGER_USER/SWAGGER_PASSWORD. When either is unset
// (typical in local dev), the route stays open but a warning is logged once
// at server startup so the gap is visible in logs instead of silent.
export const createSwaggerAuthMiddleware = () => {
  const expectedUser = process.env.SWAGGER_USER;
  const expectedPassword = process.env.SWAGGER_PASSWORD;
  const isProtected = Boolean(expectedUser && expectedPassword);

  if (!isProtected) {
    logger.warn(
      "SWAGGER",
      "/api/docs is not protected: set SWAGGER_USER and SWAGGER_PASSWORD to require HTTP Basic Auth.",
    );
  }

  return (req, res, next) => {
    if (!isProtected) {
      return next();
    }

    const authHeader = req.headers.authorization || "";
    const [scheme, encoded] = authHeader.split(" ");

    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const separatorIndex = decoded.indexOf(":");
      const user = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : decoded;
      const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : "";

      if (secureEquals(user, expectedUser) && secureEquals(password, expectedPassword)) {
        return next();
      }
    }

    res.set("WWW-Authenticate", 'Basic realm="API Docs"');
    return res.status(401).send("Unauthorized");
  };
};
