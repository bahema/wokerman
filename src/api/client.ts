const normalizeBase = (value: string) => value.trim().replace(/\/+$/, "");

const resolveApiBaseUrls = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured
      .split(",")
      .map((entry: string) => normalizeBase(entry))
      .filter(Boolean);
  }
  if (typeof window === "undefined") return [""];
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return [`${window.location.protocol}//${host}:4000`];
  }
  // GitHub Pages serves static assets only; API must fall back to Railway when env is missing.
  if (host.endsWith(".github.io")) {
    return [window.location.origin, "https://autohub-backend-production.up.railway.app"];
  }
  return [window.location.origin];
};

const API_BASE_URLS = resolveApiBaseUrls();
let activeApiBaseUrl = API_BASE_URLS[0] ?? "";
const API_REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_REQUEST_TIMEOUT_MS ?? 15_000);
const API_NETWORK_RETRY_COUNT = Number(import.meta.env.VITE_API_NETWORK_RETRY_COUNT ?? 1);
const CSRF_COOKIE_NAME = "autohub_admin_csrf";
const CSRF_STORAGE_KEY = "autohub_admin_csrf_header_token";
const AUTH_TOKEN_STORAGE_KEY = "autohub_admin_auth_token";
let csrfTokenCache =
  typeof window !== "undefined" ? window.sessionStorage.getItem(CSRF_STORAGE_KEY) ?? "" : "";
let authTokenCache = "";
if (typeof window !== "undefined") {
  // Security hardening: keep bearer fallback token in memory only.
  // This removes token persistence across refreshes and reduces exposure in storage.
  window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

const getCookieValue = (name: string) => {
  if (typeof document === "undefined") return "";
  const raw = document.cookie;
  if (!raw) return "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key !== name) continue;
    const value = rest.join("=");
    if (!value) return "";
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return "";
};

const getCsrfHeaders = (): Record<string, string> => {
  const token = csrfTokenCache || getCookieValue(CSRF_COOKIE_NAME);
  if (!token) return {};
  return { "x-csrf-token": token };
};

const cacheCsrfToken = (token: string) => {
  const next = token.trim();
  if (!next) return;
  csrfTokenCache = next;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(CSRF_STORAGE_KEY, next);
  }
};

export const setAuthToken = (token: string) => {
  const normalized = token.trim();
  authTokenCache = normalized;
};

export const clearAuthToken = () => {
  authTokenCache = "";
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
};

const parseError = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: string; message?: string };
    return body.message ?? body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

const isAbortError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  typeof (error as { name?: unknown }).name === "string" &&
  (error as { name: string }).name === "AbortError";

const fetchWithTimeout = async (url: string, init: RequestInit) => {
  const controller = new AbortController();
  const timeoutMs = Number.isFinite(API_REQUEST_TIMEOUT_MS) && API_REQUEST_TIMEOUT_MS > 0 ? API_REQUEST_TIMEOUT_MS : 15_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const externalSignal = init.signal;
  const abortFromExternal = () => controller.abort();

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", abortFromExternal, { once: true });
    }
  }

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", abortFromExternal);
    }
  }
};

export const apiGet = async <T>(path: string): Promise<T> => {
  const response = await fetchWithFallback(path, { credentials: "include" });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as T;
};

export const apiJson = async <T>(path: string, method: "POST" | "PUT" | "DELETE", body?: unknown): Promise<T> => {
  const response = await fetchWithFallback(path, {
    method,
    headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as T;
};

export const apiForm = async <T>(path: string, formData: FormData): Promise<T> => {
  const response = await fetchWithFallback(path, {
    method: "POST",
    credentials: "include",
    headers: { ...getCsrfHeaders() },
    body: formData
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as T;
};

const fetchWithFallback = async (path: string, init: RequestInit) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const tried = new Set<string>();
  const orderedBases = [activeApiBaseUrl, ...API_BASE_URLS].filter(Boolean);
  let lastError: unknown = null;
  let lastResponse: Response | null = null;

  for (const base of orderedBases) {
    if (tried.has(base)) continue;
    tried.add(base);
    const url = `${base}${normalizedPath}`;
    const retries = Number.isFinite(API_NETWORK_RETRY_COUNT) && API_NETWORK_RETRY_COUNT >= 0 ? Math.floor(API_NETWORK_RETRY_COUNT) : 1;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const headers = new Headers(init.headers ?? {});
        if (authTokenCache && !headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${authTokenCache}`);
        }
        const response = await fetchWithTimeout(url, { ...init, headers });
        cacheCsrfToken(response.headers.get("x-csrf-token") ?? "");
        const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
        if (response.ok) {
          // Static hosts may return index.html (200 text/html) for unknown /api/* paths.
          // Treat non-JSON API responses as wrong-origin hits and fall back to next base URL.
          if (normalizedPath.startsWith("/api/") && !contentType.includes("application/json")) {
            lastResponse = response;
            break;
          }
          activeApiBaseUrl = base;
          return response;
        }

        // If frontend origin is wrong for API (common on static hosts), try next base.
        if (normalizedPath.startsWith("/api/") && (response.status === 404 || response.status === 405 || response.status === 501)) {
          lastResponse = response;
          break;
        }

        if (response.status === 401) {
          clearAuthToken();
        }

        activeApiBaseUrl = base;
        return response;
      } catch (error) {
        const retriable = isAbortError(error) || error instanceof TypeError;
        if (retriable && attempt < retries) continue;
        lastError = error;
      }
    }
  }

  if (lastResponse) return lastResponse;
  if (lastError instanceof Error) {
    throw new Error(`Failed to reach API server. ${lastError.message}`);
  }
  throw new Error("Failed to reach API server.");
};
