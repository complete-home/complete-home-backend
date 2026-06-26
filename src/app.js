import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { isAllowedCorsOrigin } from "./config/env.js";
import apiRoutes from "./routes/index.js";
import { notFoundHandler } from "./core/middleware/notFound.js";
import { errorHandler } from "./core/middleware/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedCorsOrigin(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  if (env.nodeEnv !== "test") {
    app.use(morgan("dev"));
  }

  app.use("/api/v1", apiRoutes);
  app.use(
    "/uploads",
    express.static(path.join(__dirname, "../uploads")),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
