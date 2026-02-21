import { apiGet, apiJson } from "../api/client";

const LEGACY_AUTH_KEYS = ["admin:auth:token", "admin:auth:email", "admin:auth:expiresAt"] as const;

const clearLegacyLocalSession = () => {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_AUTH_KEYS) localStorage.removeItem(key);
};

export type AccountSettingsPayload = {
  fullName: string;
  email: string;
  role: string;
  timezone: string;
};

export const getAuthStatus = async () => {
  return apiGet<{ hasOwner: boolean }>("/api/auth/status");
};

export const startLogin = async (email: string, password: string, trustDevice = false) => {
  return apiJson<{ ok: true; trustedDevice?: boolean }>("/api/auth/login/start", "POST", { email, password, trustDevice });
};

// Backward-compatible exports for older callers.
export const startLoginOtp = startLogin;

export const hasAdminAccess = async () => {
  try {
    const response = await apiGet<{ valid: boolean }>("/api/auth/session");
    if (!response.valid) clearLegacyLocalSession();
    return response.valid;
  } catch {
    clearLegacyLocalSession();
    return false;
  }
};

export const clearAuth = async () => {
  try {
    await apiJson<{ ok: boolean }>("/api/auth/logout", "POST");
  } catch {
    // Ignore network errors during local cleanup.
  }
  clearLegacyLocalSession();
};

export const getAccountSettings = async () => {
  return apiGet<AccountSettingsPayload>("/api/auth/account");
};

export const saveAccountSettings = async (settings: AccountSettingsPayload) => {
  return apiJson<AccountSettingsPayload>("/api/auth/account", "PUT", settings);
};

export const changeAccountPassword = async (currentPassword: string, newPassword: string) => {
  return apiJson<{ ok: boolean }>("/api/auth/password", "PUT", { currentPassword, newPassword });
};

export const logoutAllSessions = async (keepCurrent = false) => {
  const response = await apiJson<{ ok: boolean; keepCurrent: boolean }>("/api/auth/logout-all", "POST", { keepCurrent });
  if (!keepCurrent) clearLegacyLocalSession();
  return response;
};
