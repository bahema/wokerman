const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const AUTH_TOKEN_KEY = "admin:auth:token";

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

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
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status})`;
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
