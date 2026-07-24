export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
const TOKEN_KEY = "lms_token";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string, remember = true) {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) {
      clearToken();
      window.dispatchEvent(new Event("auth-expired"));
    }
    throw new ApiError(payload.message ?? "Request failed", response.status);
  }
  return payload as T;
}

export type HealthResponse = {
  success: boolean;
  message: string;
  database: "connected" | "connecting" | "disconnected" | "disconnecting" | "unknown";
  timestamp: string;
};

export function getBackendHealth(signal?: AbortSignal) {
  return apiRequest<HealthResponse>("/health", { signal });
}
