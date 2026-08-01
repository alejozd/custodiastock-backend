import "dotenv/config";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import routes from "./routes/index.js";
import { swaggerSpec } from "./docs/swagger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { createSwaggerAuthMiddleware } from "./middleware/swaggerAuthMiddleware.js";
import { ensureAdminUser } from "./seed/adminSeed.js";
import { licenseService } from "./services/licenseService.js";
import { assertJwtSecretConfigured } from "./services/auth.service.js";

// Only the real server startup kills the process on a missing JWT_SECRET in
// production; importing auth.service.js never does this by itself, so
// scripts/workers/tests that only need e.g. verifyAccessToken aren't at risk
// of being killed as a side effect of the import.
try {
  assertJwtSecretConfigured();
} catch (error) {
  console.error(`[Auth] ${error.message} Refusing to start.`);
  process.exit(1);
}

const app = express();

// Only trust X-Forwarded-For when the app actually sits behind a reverse
// proxy (nginx, load balancer, etc.) — set TRUST_PROXY_HOPS to the number of
// hops to trust in that case. Defaults to "trust nothing" (false) so a
// client cannot spoof its own IP and dodge the /login rate limiter when
// there is no proxy in front of this process.
const trustProxyHops = process.env.TRUST_PROXY_HOPS
  ? Number(process.env.TRUST_PROXY_HOPS)
  : false;
app.set("trust proxy", trustProxyHops);

// CORS_ORIGIN accepts a comma-separated whitelist of allowed origins.
// Falls back to the local Vite dev server when unset, never to "*".
const DEFAULT_DEV_ORIGIN = "http://localhost:5173";
const corsOrigins = (process.env.CORS_ORIGIN || DEFAULT_DEV_ORIGIN)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins,
    credentials: false,
  }),
);

app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({ message: "Custodia API running" });
});

app.use("/api/docs", createSwaggerAuthMiddleware(), swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

await ensureAdminUser();
await licenseService.initializeLicense();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
