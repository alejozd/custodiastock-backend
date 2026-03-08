import "dotenv/config";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import routes from "./routes/index.js";
import { swaggerSpec } from "./docs/swagger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { ensureAdminUser } from "./seed/adminSeed.js";

const app = express();

app.use(
  cors({
    origin: "http://192.168.1.50:8081",
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({ message: "Custodia API running" });
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

await ensureAdminUser();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
