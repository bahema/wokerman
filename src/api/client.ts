const normalizeBase = (value: string) => value.trim().replace(/\/+$/, "");

const resolveApiBaseUrls = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return [normalizeBase(configured)];
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return ["http://localhost:4000"];
    }
  }
  return [
    "https://autohub-backend-production-5a29.up.railway.app",
    "https://autohub-backend-production.up.railway.app"
  ];
};

const API_BASE_URLS = resolveApiBaseUrls();
const AUTH_TOKEN_KEY = "admin:auth:token";
let activeApiBaseUrl = API_BASE_URLS[0] ?? "";

const getAuthHeaders = (): Record<string, string> => {
  let token = "";
  try {
    token = localStorage.getItem(AUTH_TOKEN_KEY) ?? "";
  } catch {
    token = "";
  }
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
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
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
    headers: { ...getAuthHeaders() },
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
