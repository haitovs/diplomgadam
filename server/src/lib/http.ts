import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, type ZodSchema } from "zod";
import { config } from "../config/index.js";
import { AppError, badRequest } from "./errors.js";

/**
 * Express 4 does not forward rejected promises to the error handler, so every
 * async route must be wrapped or a failed await becomes a hung request.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** Parses and returns a validated body, turning Zod issues into a 400. */
export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw badRequest("Invalid request body", formatZod(result.error));
  return result.data;
}

/** Parses and returns validated query parameters. */
export function parseQuery<T>(schema: ZodSchema<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success)
    throw badRequest("Invalid query parameters", formatZod(result.error));
  return result.data;
}

function formatZod(error: ZodError) {
  return error.issues.map((i) => ({
    field: i.path.join(".") || "(root)",
    message: i.message,
  }));
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: "not_found", message: "Not found" } });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "bad_request",
        message: "Invalid request",
        details: formatZod(err),
      },
    });
    return;
  }

  // Multer signals an oversized upload with this code.
  if (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "LIMIT_FILE_SIZE"
  ) {
    res.status(413).json({
      error: {
        code: "payload_too_large",
        message: `File exceeds the ${config.MAX_UPLOAD_MB} MB limit`,
      },
    });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    error: { code: "internal_error", message: "Internal server error" },
  });
}
