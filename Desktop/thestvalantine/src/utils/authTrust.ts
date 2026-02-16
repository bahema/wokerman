import { apiGet, apiJson } from "../api/client";

const AUTH_TOKEN_KEY = "admin:auth:token";
const AUTH_EMAIL_KEY = "admin:auth:email";
const AUTH_EXPIRES_KEY = "admin:auth:expiresAt";

type SessionPayload = {
  token: string;
  expiresAt: number;
  ownerEmail: string;
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
  session?: SessionPayload;
};

const setSession = (session: SessionPayload) => {
  localStorage.setItem(AUTH_TOKEN_KEY, session.token);
  localStorage.setItem(AUTH_EMAIL_KEY, session.ownerEmail);
  localStorage.setItem(AUTH_EXPIRES_KEY, String(session.expiresAt));
};

const clearLocalSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_EMAIL_KEY);
  localStorage.removeItem(AUTH_EXPIRES_KEY);
};

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY) ?? "";

export const getAuthStatus = async () => {
  return apiGet<{ hasOwner: boolean }>("/api/auth/status");
};

export const startSignupOtp = async (email: string, password: string) => {
  return apiJson<{ ok: true; devOtp?: string }>("/api/auth/signup/start", "POST", { email, password });
};

export const verifySignupOtp = async (email: string, otp: string) => {
  const response = await apiJson<{ ok: true; session: SessionPayload }>("/api/auth/signup/verify", "POST", { email, otp });
  setSession(response.session);
  return response.session;
};

export const startLoginOtp = async (email: string, password: string) => {
  const response = await apiJson<StartLoginResponse>("/api/auth/login/start", "POST", { email, password });
  if (response.session) setSession(response.session);
  return response;
};

export const verifyLoginOtp = async (email: string, otp: string) => {
  const response = await apiJson<{ ok: true; session: SessionPayload }>("/api/auth/login/verify", "POST", { email, otp });
  setSession(response.session);
  return response.session;
};

export const hasAdminAccess = async () => {
  const token = getAuthToken();
  if (!token) return false;
  const expiresAt = Number(localStorage.getItem(AUTH_EXPIRES_KEY) ?? "0");
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    clearLocalSession();
    return false;
  }
  try {
    const response = await apiGet<{ valid: boolean }>("/api/auth/session");
    if (!response.valid) clearLocalSession();
    return response.valid;
  } catch {
    clearLocalSession();
    return false;
  }
};

export const clearAuth = async () => {
  try {
    await apiJson<{ ok: boolean }>("/api/auth/logout", "POST");
  } catch {
    // Ignore network errors during local cleanup.
  }
  clearLocalSession();
};

export const getAccountSettings = async () => {
  return apiGet<AccountSettingsPayload>("/api/auth/account");
};

export const saveAccountSettings = async (settings: AccountSettingsPayload) => {
  return apiJson<AccountSettingsPayload>("/api/auth/account", "PUT", settings);
};

export const changeAccountPassword = async (currentPassword: string, newPassword: string) => {
  const response = await apiJson<{ ok: boolean; session?: SessionPayload }>("/api/auth/password", "PUT", { currentPassword, newPassword });
  if (response.session) setSession(response.session);
  return response;
};

export const logoutAllSessions = async (keepCurrent = false) => {
  const response = await apiJson<{ ok: boolean; keepCurrent: boolean }>("/api/auth/logout-all", "POST", { keepCurrent });
  if (!keepCurrent) clearLocalSession();
  return response;
};
