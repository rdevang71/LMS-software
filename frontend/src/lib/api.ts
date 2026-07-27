export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
const LEGACY_TOKEN_KEY = "lms_token";
const ACCESS_TOKEN_KEY = "lms_access_token";
type TokenPersistence = "local" | "session";

function loadStoredAccessToken() {
  if (typeof window === "undefined") {
    return { token: null, persistence: null };
  }
  const localToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (localToken) {
    return { token: localToken, persistence: "local" as const };
  }
  const sessionToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  return {
    token: sessionToken,
    persistence: sessionToken ? ("session" as const) : null,
  };
}

const storedAccessToken = loadStoredAccessToken();
let accessToken: string | null = storedAccessToken.token;
let tokenPersistence: TokenPersistence | null = storedAccessToken.persistence;
let refreshPromise: Promise<boolean> | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function removeLegacyToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  sessionStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function setAccessToken(token: string, remember?: boolean) {
  accessToken = token;
  if (typeof remember === "boolean") {
    tokenPersistence = remember ? "local" : "session";
  } else if (!tokenPersistence) {
    tokenPersistence = "local";
  }

  removeLegacyToken();
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  const storage = tokenPersistence === "session" ? sessionStorage : localStorage;
  storage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  accessToken = null;
  tokenPersistence = null;
  removeLegacyToken();
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

function dispatchAuthExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth-expired"));
  }
}

async function requestOnce(path: string, options: RequestInit) {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const { response, payload } = await requestOnce("/auth/refresh", {
        method: "POST",
      });
      if (!response.ok || typeof payload.accessToken !== "string") {
        clearAccessToken();
        return false;
      }
      setAccessToken(payload.accessToken);
      return true;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let { response, payload } = await requestOnce(path, options);
  const mayRefresh = !["/auth/signin", "/auth/refresh"].includes(path);

  if (response.status === 401 && mayRefresh && (await refreshAccessToken())) {
    ({ response, payload } = await requestOnce(path, options));
  }

  if (!response.ok) {
    if (response.status === 401 && mayRefresh) {
      clearAccessToken();
      dispatchAuthExpired();
    }
    throw new ApiError(payload.message ?? "Request failed", response.status);
  }

  if (typeof payload.accessToken === "string") {
    setAccessToken(payload.accessToken);
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
