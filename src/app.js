import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { env, isAllowedCorsOrigin } from "./config/env.js";
import apiRoutes from "./routes/index.js";
import { notFoundHandler } from "./core/middleware/notFound.js";
import { errorHandler } from "./core/middleware/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CORS_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const CORS_ALLOWED_HEADERS = ["Content-Type", "Authorization"];

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedCorsOrigin(origin)) {
      callback(null, origin || env.corsOrigins[0] || true);
      return;
    }
    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: CORS_METHODS,
  allowedHeaders: CORS_ALLOWED_HEADERS,
};

export function createApp() {
  const app = express();

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));

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
