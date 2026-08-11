import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "./auth/auth.routes.js";
import { loadAuth } from "./auth/context.js";
import { config } from "./config/index.js";
import { errorHandler, notFoundHandler } from "./lib/http.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export function createApp(): Express {
  const app = express();

  if (config.TRUST_PROXY) app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'"],
          // Framer Motion and MapLibre both set element styles inline.
          "style-src": ["'self'", "'unsafe-inline'"],
          "img-src": ["'self'", "data:", "blob:"],
          "font-src": ["'self'"],
          "connect-src": ["'self'"],
          // MapLibre runs its tile parser in a blob-backed worker.
          "worker-src": ["'self'", "blob:"],
          "object-src": ["'none'"],
          "frame-ancestors": ["'none'"],
          "base-uri": ["'self'"],
          "form-action": ["'self'"],
        },
      },
      // The SPA and API share an origin; COEP would block nothing useful here
      // and breaks blob workers in some browsers.
      crossOriginEmbedderPolicy: false,
    }),
  );

  // In production the SPA is served by this process, so cross-origin requests
  // are never legitimate. In development Vite runs on another port.
  app.use(
    cors({
      origin: config.isProduction ? false : (config.PUBLIC_ORIGIN ?? true),
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(cookieParser());

  if (!config.isTest) {
    app.use(morgan(config.isProduction ? "combined" : "dev"));
  }

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", version: process.env.APP_VERSION ?? "1.0.0" });
  });

  // Every /api request carries its resolved sessions; guards enforce access.
  app.use("/api", loadAuth);

  app.use("/api/auth", authRouter);

  app.use("/api", notFoundHandler);

  if (config.isProduction) {
    const publicDir = path.resolve(here, "../../public");
    app.use(
      express.static(publicDir, {
        // Vite emits content-hashed asset filenames, so they can be cached hard
        // while index.html must always be revalidated.
        setHeaders: (res, filePath) => {
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache");
          } else {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      }),
    );
    app.get("*", (_req, res) => {
      res.sendFile(path.join(publicDir, "index.html"));
    });
  }

  app.use(errorHandler);

  return app;
}
