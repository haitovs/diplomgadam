/**
 * Errors that are safe to show a client. Anything else that reaches the error
 * handler is treated as a bug and reported as a generic 500, so internal
 * details never leak into a response.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, "bad_request", message, details);

export const unauthorized = (message = "Authentication required") =>
  new AppError(401, "unauthorized", message);

export const forbidden = (message = "You do not have access to this resource") =>
  new AppError(403, "forbidden", message);

export const notFound = (message = "Not found") =>
  new AppError(404, "not_found", message);

export const conflict = (message: string, details?: unknown) =>
  new AppError(409, "conflict", message, details);

export const tooManyRequests = (message: string, details?: unknown) =>
  new AppError(429, "too_many_requests", message, details);

export const payloadTooLarge = (message: string) =>
  new AppError(413, "payload_too_large", message);

export const unprocessable = (message: string, details?: unknown) =>
  new AppError(422, "unprocessable", message, details);
