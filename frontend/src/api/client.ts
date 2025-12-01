import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE ?? "/api";

export const apiClient = axios.create({
  baseURL,
  timeout: 8000
});

export async function get<T>(url: string): Promise<T> {
  const response = await apiClient.get<T>(url);
  return response.data;
}

export async function post<T, B = unknown>(url: string, body: B): Promise<T> {
  const response = await apiClient.post<T>(url, body);
  return response.data;
}
