const resolveApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:4000";
    }
  }
  return "";
};

const API_BASE_URL = resolveApiBaseUrl();
const AUTH_TOKEN_KEY = "admin:auth:token";

const buildUrl = (path: string) => {
  if (!API_BASE_URL) {
    throw new Error("Missing VITE_API_BASE_URL. Set it in GitHub repository variables before production deploy.");
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

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
  const response = await fetch(buildUrl(path), { credentials: "include", headers: { ...getAuthHeaders() } });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as T;
};

export const apiJson = async <T>(path: string, method: "POST" | "PUT" | "DELETE", body?: unknown): Promise<T> => {
  const response = await fetch(buildUrl(path), {
    method,
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as T;
};

export const apiForm = async <T>(path: string, formData: FormData): Promise<T> => {
  const response = await fetch(buildUrl(path), {
    method: "POST",
    credentials: "include",
    headers: { ...getAuthHeaders() },
    body: formData
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as T;
};
