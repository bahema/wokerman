const normalizeBase = (value: string) => value.trim().replace(/\/+$/, "");

const resolveApiBaseUrls = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return [normalizeBase(configured)];
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return [`${window.location.protocol}//${host}:4000`];
    }
  }
  return [
    "https://autohub-backend-production-9663.up.railway.app",
    "https://autohub-backend-production-5a29.up.railway.app",
    "https://autohub-backend-production.up.railway.app"
  ];
};

const API_BASE_URLS = resolveApiBaseUrls();
let activeApiBaseUrl = API_BASE_URLS[0] ?? "";
const CSRF_COOKIE_NAME = "autohub_admin_csrf";

const getAuthHeaders = (): Record<string, string> => ({});

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
  const token = getCookieValue(CSRF_COOKIE_NAME);
  if (!token) return {};
  return { "x-csrf-token": token };
};

const parseError = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: string; message?: string };
    return body.message ?? body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

export const apiGet = async <T>(path: string): Promise<T> => {
  const response = await fetchWithFallback(path, { credentials: "include", headers: { ...getAuthHeaders() } });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as T;
};

export const apiJson = async <T>(path: string, method: "POST" | "PUT" | "DELETE", body?: unknown): Promise<T> => {
  const response = await fetchWithFallback(path, {
    method,
    headers: { "Content-Type": "application/json", ...getAuthHeaders(), ...getCsrfHeaders() },
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
    headers: { ...getAuthHeaders(), ...getCsrfHeaders() },
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

  for (const base of orderedBases) {
    if (tried.has(base)) continue;
    tried.add(base);
    const url = `${base}${normalizedPath}`;
    try {
      const response = await fetch(url, init);
      activeApiBaseUrl = base;
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw new Error(`Failed to reach API server. ${lastError.message}`);
  }
  throw new Error("Failed to reach API server.");
};
