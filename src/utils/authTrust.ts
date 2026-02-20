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
  twoFactorEnabled: boolean;
};

type StartLoginResponse = {
  ok: true;
  requiresOtp: boolean;
  devOtp?: string;
};

export const getAuthStatus = async () => {
  return apiGet<{ hasOwner: boolean }>("/api/auth/status");
};

export const startSignup = async (email: string, password: string, bootstrapKey?: string) => {
  const normalizedBootstrapKey = bootstrapKey?.trim();
  return apiJson<{ ok: true }>(
    "/api/auth/signup/start",
    "POST",
    normalizedBootstrapKey ? { email, password, bootstrapKey: normalizedBootstrapKey } : { email, password }
  );
};

export const startLogin = async (email: string, password: string) => {
  return apiJson<StartLoginResponse>("/api/auth/login/start", "POST", { email, password });
};

// Backward-compatible exports for older callers.
export const startSignupOtp = startSignup;
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
