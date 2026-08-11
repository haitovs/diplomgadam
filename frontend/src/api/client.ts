import axios, { AxiosError } from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? "/api",
  timeout: 20_000,
  // Sessions are httpOnly cookies, so every request must carry credentials.
  withCredentials: true,
});

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * A server error carrying the code and details the API returned, so callers
 * can react to `blockers` or field errors instead of parsing message strings.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Field-level validation messages, when the server sent them. */
  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    const out: Record<string, string> = {};
    for (const item of this.details) {
      if (
        item &&
        typeof item === "object" &&
        "field" in item &&
        "message" in item
      ) {
        out[String((item as { field: unknown }).field)] = String(
          (item as { message: unknown }).message,
        );
      }
    }
    return out;
  }

  /** Submission blockers returned when a listing is not complete. */
  get blockers(): string[] {
    if (
      this.details &&
      typeof this.details === "object" &&
      "blockers" in this.details &&
      Array.isArray((this.details as { blockers: unknown }).blockers)
    ) {
      return (this.details as { blockers: string[] }).blockers;
    }
    return [];
  }
}

function toApiError(err: unknown): ApiError {
  const axiosError = err as AxiosError<ApiErrorBody>;

  if (axiosError.response) {
    const body = axiosError.response.data;
    return new ApiError(
      axiosError.response.status,
      body?.error?.code ?? "error",
      body?.error?.message ?? axiosError.message,
      body?.error?.details,
    );
  }

  return new ApiError(0, "network_error", "Cannot reach the server");
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error)),
);

export async function get<T>(url: string, params?: unknown): Promise<T> {
  const { data } = await apiClient.get<T>(url, { params });
  return data;
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.post<T>(url, body);
  return data;
}

export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.patch<T>(url, body);
  return data;
}

export async function put<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.put<T>(url, body);
  return data;
}

export async function del<T>(url: string): Promise<T> {
  const { data } = await apiClient.delete<T>(url);
  return data;
}

export async function upload<T>(url: string, form: FormData): Promise<T> {
  const { data } = await apiClient.post<T>(url, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60_000,
  });
  return data;
}
