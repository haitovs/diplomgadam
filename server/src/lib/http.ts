import type { NextFunction, Request, RequestHandler, Response } from "express";
import { z, ZodError, type ZodTypeAny } from "zod";
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

/**
 * Parses and returns a validated body, turning Zod issues into a 400.
 *
 * Generic over the schema rather than over a single type so that `z.output` is
 * used for the result: schemas with `.default()` or `.transform()` have an
 * input type that differs from their output, and collapsing the two makes
 * defaulted fields look optional to every caller.
 */
export function parseBody<S extends ZodTypeAny>(
  schema: S,
  body: unknown,
): z.output<S> {
  const result = schema.safeParse(body);
  if (!result.success) throw badRequest("Invalid request body", formatZod(result.error));
  return result.data;
}

/** Parses and returns validated query parameters. */
export function parseQuery<S extends ZodTypeAny>(
  schema: S,
  query: unknown,
): z.output<S> {
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

  /**
   * body-parser and other http-errors users mark client mistakes — malformed
   * JSON, an oversized body — with a 4xx statusCode and `expose: true`. Without
   * this, a client sending broken JSON gets a 500 and the log fills with
   * "Unhandled error" for what is entirely the caller's fault.
   */
  if (typeof err === "object" && err !== null) {
    const httpError = err as {
      status?: number;
      statusCode?: number;
      expose?: boolean;
      type?: string;
      message?: string;
    };
    const status = httpError.status ?? httpError.statusCode;
    if (httpError.expose === true && status && status >= 400 && status < 500) {
      res.status(status).json({
        error: {
          code: httpError.type ?? "bad_request",
          message: httpError.message ?? "Invalid request",
        },
      });
      return;
    }
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    error: { code: "internal_error", message: "Internal server error" },
  });
}
