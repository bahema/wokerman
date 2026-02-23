import "dotenv/config";
import cors from "cors";
import express from "express";
import type { SiteContent } from "../../shared/siteTypes";
import multer from "multer";
import path from "node:path";
import { promises as fs } from "node:fs";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createMediaStore } from "./media/store.js";
import { createAnalyticsStore } from "./analytics/store.js";
import { createSiteStore } from "./site/store.js";
import { createAuthStore, isAuthRateLimitError } from "./auth/store.js";
import { createEmailStore } from "./email/store.js";
import { createCookieConsentStore } from "./cookies/store.js";
import { EmailDeliveryError, sendAdminAlertEmail, sendConfirmationEmail, sendSmtpTestEmail } from "./email/confirmationSender.js";
import { CampaignDeliveryError, sendCampaignEmails } from "./email/campaignSender.js";
import { createTrafficAiStore } from "./traffic/store.js";
import { generateTrafficAiPlan } from "./traffic/engine.js";
import { searchWeb } from "./traffic/webSearch.js";
import { createAiControlStore, hashAiPayload } from "./ai/store.js";
import { hasAiCapability, listCapabilitiesForRole, resolveAiAdminRole, type AiCapability } from "./ai/governance.js";
import {
  EMAIL_CAMPAIGN_AUDIENCE_MODE,
  EMAIL_CAMPAIGN_BODY_MODE,
  EMAIL_CAMPAIGN_SEND_MODE,
  EMAIL_CAMPAIGN_STATUS,
  EMAIL_EVENT_TYPES,
  EMAIL_SUBSCRIBER_STATUS
} from "./db/schema.js";
import { defaultPublishedContent } from "./db/defaultPublishedContent.js";

const app = express();
app.disable("x-powered-by");

const PORT = Number(process.env.PORT ?? 4000);
const CORS_ORIGIN_RAW =
  process.env.CORS_ORIGIN ??
  [
    "http://localhost:5180",
    "http://127.0.0.1:5180",
    "http://localhost:5181",
    "http://127.0.0.1:5181",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ].join(",");
const EXTRA_CORS_ORIGINS_RAW = process.env.EXTRA_CORS_ORIGINS ?? "https://bahema.github.io";
const DB_URL = process.env.DB_URL ?? "";
const API_PUBLIC_BASE_URL = process.env.API_PUBLIC_BASE_URL ?? `http://localhost:${PORT}`;
const MEDIA_DIR = process.env.MEDIA_DIR ?? path.resolve(process.cwd(), "storage");
const EMAIL_SUBSCRIPTIONS_ENABLED = process.env.EMAIL_SUBSCRIPTIONS_ENABLED !== "false";
const isProduction = process.env.NODE_ENV === "production";
const RESET_SECURITY_STATE_ON_BOOT = process.env.RESET_SECURITY_STATE_ON_BOOT === "true";
const RESET_SECURITY_STATE_CONFIRM = (process.env.RESET_SECURITY_STATE_CONFIRM ?? "").trim();
const AUTH_COOKIE_NAME = "autohub_admin_session";
const CSRF_COOKIE_NAME = "autohub_admin_csrf";
const TRUSTED_DEVICE_COOKIE_NAME = "autohub_admin_trusted_device";
const resolveAuthCookieSigningKey = () =>
  (process.env.AUTH_COOKIE_SIGNING_KEY ?? process.env.AUTH_COOKIE_SECRET ?? process.env.SESSION_SECRET ?? "").trim();
const AUTH_COOKIE_SIGNING_KEY = resolveAuthCookieSigningKey();
const AI_SUPER_MODE_ENCRYPTION_SECRET = (process.env.AI_SUPER_MODE_ENCRYPTION_SECRET ?? AUTH_COOKIE_SIGNING_KEY).trim();
const AUTH_IP_RATE_WINDOW_MS = Number(process.env.AUTH_IP_RATE_WINDOW_MS ?? 60_000);
const AUTH_IP_RATE_MAX = Number(process.env.AUTH_IP_RATE_MAX ?? 30);
const AUTH_SENSITIVE_IP_RATE_WINDOW_MS = Number(process.env.AUTH_SENSITIVE_IP_RATE_WINDOW_MS ?? 60_000);
const AUTH_SENSITIVE_IP_RATE_MAX = Number(process.env.AUTH_SENSITIVE_IP_RATE_MAX ?? 12);
const SUBSCRIBE_IP_RATE_WINDOW_MS = Number(process.env.SUBSCRIBE_IP_RATE_WINDOW_MS ?? 60_000);
const SUBSCRIBE_IP_RATE_MAX = Number(process.env.SUBSCRIBE_IP_RATE_MAX ?? 20);
const MEDIA_UPLOAD_IP_RATE_WINDOW_MS = Number(process.env.MEDIA_UPLOAD_IP_RATE_WINDOW_MS ?? 60_000);
const MEDIA_UPLOAD_IP_RATE_MAX = Number(process.env.MEDIA_UPLOAD_IP_RATE_MAX ?? 20);
const MEDIA_UPLOAD_MAX_FILE_BYTES = Number(process.env.MEDIA_UPLOAD_MAX_FILE_BYTES ?? 10 * 1024 * 1024);
const MEDIA_UPLOAD_MAX_FILES = Number(process.env.MEDIA_UPLOAD_MAX_FILES ?? 20);
const ADMIN_MUTATION_IP_RATE_WINDOW_MS = Number(process.env.ADMIN_MUTATION_IP_RATE_WINDOW_MS ?? 60_000);
const ADMIN_MUTATION_IP_RATE_MAX = Number(process.env.ADMIN_MUTATION_IP_RATE_MAX ?? 60);
const AI_CHAT_IP_RATE_WINDOW_MS = Number(process.env.AI_CHAT_IP_RATE_WINDOW_MS ?? 60_000);
const AI_CHAT_IP_RATE_MAX = Number(process.env.AI_CHAT_IP_RATE_MAX ?? 40);
const AI_WEB_SEARCH_IP_RATE_WINDOW_MS = Number(process.env.AI_WEB_SEARCH_IP_RATE_WINDOW_MS ?? 60_000);
const AI_WEB_SEARCH_IP_RATE_MAX = Number(process.env.AI_WEB_SEARCH_IP_RATE_MAX ?? 20);
const RATE_LIMIT_BUCKET_LIMIT = Number(process.env.RATE_LIMIT_BUCKET_LIMIT ?? 10_000);
const TRUSTED_DEVICE_TTL_MS = Number(process.env.TRUSTED_DEVICE_TTL_MS ?? 30 * 24 * 60 * 60 * 1000);
const AI_CHAT_MAX_SESSION_ID_CHARS = Number(process.env.AI_CHAT_MAX_SESSION_ID_CHARS ?? 128);
const AI_CHAT_MAX_MESSAGE_CHARS = Number(process.env.AI_CHAT_MAX_MESSAGE_CHARS ?? 6_000);
const AI_CHAT_MAX_HISTORY_ITEM_CHARS = Number(process.env.AI_CHAT_MAX_HISTORY_ITEM_CHARS ?? 2_000);
const AI_CHAT_MAX_HISTORY_TOTAL_CHARS = Number(process.env.AI_CHAT_MAX_HISTORY_TOTAL_CHARS ?? 20_000);
const AI_CHAT_MAX_HISTORY_ITEMS = Number(process.env.AI_CHAT_MAX_HISTORY_ITEMS ?? 20);
const AI_WEB_SEARCH_MAX_QUERY_CHARS = Number(process.env.AI_WEB_SEARCH_MAX_QUERY_CHARS ?? 240);
const LOGIN_EMAIL_MAX_CHARS = Number(process.env.LOGIN_EMAIL_MAX_CHARS ?? 254);
const LOGIN_PASSWORD_MAX_CHARS = Number(process.env.LOGIN_PASSWORD_MAX_CHARS ?? 256);
const ADMIN_UNSUBSCRIBE_ALERT_EMAIL = (process.env.ADMIN_UNSUBSCRIBE_ALERT_EMAIL ?? "").trim().toLowerCase();
const ALLOWED_UPLOAD_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const ALLOWED_UPLOAD_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const resolveTrustProxySetting = (): boolean | number | string => {
  const raw = (process.env.TRUST_PROXY ?? "").trim();
  if (!raw) return false;
  const lowered = raw.toLowerCase();
  if (lowered === "true" || lowered === "yes") return true;
  if (lowered === "false" || lowered === "no") return false;
  const asNumber = Number(raw);
  if (Number.isInteger(asNumber) && asNumber >= 0) return asNumber;
  return raw;
};
app.set("trust proxy", resolveTrustProxySetting());
const resolveConfirmationMode = () => {
  const raw = (process.env.EMAIL_CONFIRM_MODE ?? process.env.EMAIL_CONFIRMATION_SEND_MODE ?? "").trim().toLowerCase();
  if (raw === "sync" || raw === "async") return raw;
  return isProduction ? "async" : "sync";
};
const EMAIL_CONFIRM_MODE = resolveConfirmationMode();
const _siteContentContract: SiteContent | null = null;
const PERSISTENCE_MODE = "filesystem";

const normalizeOrigin = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed === "*") return "*";
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed;
  }
};
const normalizePublicBaseUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
};
const parseOrigin = (value: string) => {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return "";
  }
};
type AuthCookieSameSite = "strict" | "lax" | "none";
const parseAuthCookieSameSite = (value: string): AuthCookieSameSite | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "strict" || normalized === "lax" || normalized === "none") return normalized;
  return null;
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hashEmailForAudit = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
const resolveSmtpSecureForPort = (smtpPort: number, smtpSecure: boolean) => {
  if (smtpPort === 465) return true;
  if (smtpPort === 587) return false;
  return smtpSecure;
};
const resolveRuntimeSigningKey = async (
  baseDir: string
): Promise<{ key: string; source: "env" | "file_existing" | "file_created" }> => {
  if (AUTH_COOKIE_SIGNING_KEY) {
    return { key: AUTH_COOKIE_SIGNING_KEY, source: "env" };
  }

  const securityDir = path.join(baseDir, "security");
  const keyPath = path.join(securityDir, "auth-cookie-signing.key");
  try {
    const existing = (await fs.readFile(keyPath, "utf-8")).trim();
    if (existing.length >= 32) {
      return { key: existing, source: "file_existing" };
    }
  } catch {
    // key file does not exist yet
  }

  const generated = createHash("sha256").update(`${randomUUID()}-${randomUUID()}-${Date.now()}`).digest("hex");
  await fs.mkdir(securityDir, { recursive: true });
  await fs.writeFile(keyPath, generated, "utf-8");
  return { key: generated, source: "file_created" };
};

const resetSecurityStateIfRequested = async (baseDir: string) => {
  if (!RESET_SECURITY_STATE_ON_BOOT) return;
  if (RESET_SECURITY_STATE_CONFIRM !== "RESET") {
    throw new Error(
      "RESET_SECURITY_STATE_ON_BOOT is true but RESET_SECURITY_STATE_CONFIRM is not 'RESET'. Refusing destructive reset."
    );
  }

  const resetMarkerPath = path.join(baseDir, "security", ".reset-security-state-complete");
  try {
    await fs.access(resetMarkerPath);
    return;
  } catch {
    // marker missing, continue
  }

  const targets = [
    path.join(baseDir, "auth"),
    path.join(baseDir, "security"),
    path.join(baseDir, "cookies")
  ];
  await Promise.all(
    targets.map(async (targetPath) => {
      await fs.rm(targetPath, { recursive: true, force: true });
    })
  );

  await fs.mkdir(path.dirname(resetMarkerPath), { recursive: true });
  await fs.writeFile(resetMarkerPath, new Date().toISOString(), "utf-8");
  // eslint-disable-next-line no-console
  console.warn("[security] Reset auth/security/cookies state from storage due to RESET_SECURITY_STATE_ON_BOOT=true.");
};

const CORS_ORIGINS = CORS_ORIGIN_RAW.split(",").map(normalizeOrigin).filter(Boolean);
const EXTRA_CORS_ORIGINS = EXTRA_CORS_ORIGINS_RAW.split(",").map(normalizeOrigin).filter(Boolean);
const CLIENT_PUBLIC_BASE_URL =
  normalizePublicBaseUrl(process.env.CLIENT_PUBLIC_BASE_URL ?? "") ||
  (CORS_ORIGINS.find((origin) => origin && origin !== "*") ?? "http://localhost:5180");
const configuredAuthCookieSameSite = parseAuthCookieSameSite(process.env.AUTH_COOKIE_SAME_SITE ?? "");
const frontendPublicOrigin = parseOrigin(CLIENT_PUBLIC_BASE_URL);
const apiPublicOrigin = parseOrigin(normalizePublicBaseUrl(API_PUBLIC_BASE_URL));
const requiresCrossSiteCookie = isProduction && Boolean(frontendPublicOrigin && apiPublicOrigin && frontendPublicOrigin !== apiPublicOrigin);
// In production, default to `none` so auth cookies survive cross-origin frontend/backend deployments
// even when public URL env vars are missing or misconfigured.
const authCookieSameSite: AuthCookieSameSite =
  configuredAuthCookieSameSite ?? (isProduction ? "none" : requiresCrossSiteCookie ? "none" : "strict");
const authCookieSecure = isProduction || authCookieSameSite === "none";
const isLocalLoopbackOrigin = (origin: string) => {
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    return (host === "localhost" || host === "127.0.0.1") && (parsed.protocol === "http:" || parsed.protocol === "https:");
  } catch {
    return false;
  }
};
const allowDevLoopbackOrigins = process.env.NODE_ENV !== "production" && CORS_ORIGINS.some(isLocalLoopbackOrigin);
const isOriginAllowed = (origin: string) =>
  CORS_ORIGINS.includes("*") ||
  CORS_ORIGINS.includes(origin) ||
  EXTRA_CORS_ORIGINS.includes(origin) ||
  (allowDevLoopbackOrigins && isLocalLoopbackOrigin(origin));

const assertProductionSecurityConfig = () => {
  if (!isProduction) return;

  const insecureCookieSigningKeys = new Set([
    "",
    "dev-cookie-signing-key",
    "change-me",
    "changeme",
    "secret",
    "autohub"
  ]);
  if (AUTH_COOKIE_SIGNING_KEY && (insecureCookieSigningKeys.has(AUTH_COOKIE_SIGNING_KEY.toLowerCase()) || AUTH_COOKIE_SIGNING_KEY.length < 32)) {
    throw new Error(
      "Invalid production configuration: set AUTH_COOKIE_SIGNING_KEY (or AUTH_COOKIE_SECRET / SESSION_SECRET) to a non-default value with at least 32 chars."
    );
  }

  if (CORS_ORIGINS.includes("*")) {
    throw new Error("Invalid production configuration: CORS_ORIGIN must not contain '*'.");
  }

};

const bootstrap = async () => {
  assertProductionSecurityConfig();
  await resetSecurityStateIfRequested(MEDIA_DIR);
  const mediaStore = await createMediaStore(MEDIA_DIR);
  const analyticsStore = await createAnalyticsStore(MEDIA_DIR);
  const siteStore = await createSiteStore(MEDIA_DIR);
  const authStore = await createAuthStore(MEDIA_DIR);
  const emailStore = await createEmailStore(MEDIA_DIR);
  const cookieConsentStore = await createCookieConsentStore(MEDIA_DIR);
  const trafficAiStore = await createTrafficAiStore(MEDIA_DIR);
  const aiControlStore = await createAiControlStore(MEDIA_DIR, {
    encryptionSecret: AI_SUPER_MODE_ENCRYPTION_SECRET
  });
  const toPublicSenderProfile = (profile: Awaited<ReturnType<typeof emailStore.getSenderProfile>>) => ({
    ...profile,
    smtpPass: "",
    hasSmtpPass: Boolean(profile.smtpPass.trim())
  });
  const runtimeSigningKey = await resolveRuntimeSigningKey(MEDIA_DIR);
  const effectiveCookieSigningKey = runtimeSigningKey.key;
  if (isProduction && runtimeSigningKey.source !== "env") {
    const note =
      runtimeSigningKey.source === "file_existing"
        ? "Using persisted local signing key from storage."
        : "Generated and persisted local signing key in storage.";
    // eslint-disable-next-line no-console
    console.warn(`[security] Missing AUTH_COOKIE_SIGNING_KEY/AUTH_COOKIE_SECRET/SESSION_SECRET. ${note}`);
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, mediaStore.uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || "";
      cb(null, `${Date.now()}-${randomUUID()}${ext}`);
    }
  });
  const maxUploadFileBytes =
    Number.isFinite(MEDIA_UPLOAD_MAX_FILE_BYTES) && MEDIA_UPLOAD_MAX_FILE_BYTES > 0 ? MEDIA_UPLOAD_MAX_FILE_BYTES : 10 * 1024 * 1024;
  const maxUploadFiles = Number.isFinite(MEDIA_UPLOAD_MAX_FILES) && MEDIA_UPLOAD_MAX_FILES > 0 ? Math.floor(MEDIA_UPLOAD_MAX_FILES) : 20;
  const upload = multer({
    storage,
    limits: {
      fileSize: maxUploadFileBytes,
      files: maxUploadFiles
    },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const mime = (file.mimetype || "").toLowerCase();
      if (!ALLOWED_UPLOAD_MIME_TYPES.has(mime) || !ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
        cb(new Error("Unsupported file type. Allowed: JPG, PNG, WEBP, GIF, AVIF."));
        return;
      }
      cb(null, true);
    }
  });

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || isOriginAllowed(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("CORS origin not allowed."));
      },
      credentials: true,
      exposedHeaders: ["x-csrf-token"]
    })
  );
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    // Uploaded media is displayed by a separate frontend origin (GitHub Pages/custom domain).
    // Keep API strict while allowing /uploads assets to be embedded cross-origin.
    if (req.path.startsWith("/uploads/")) {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    } else {
      res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    }
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    if (process.env.NODE_ENV === "production" && req.secure) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }
    next();
  });
  app.use(express.json({ limit: "2mb" }));
  app.use(
    "/uploads",
    express.static(mediaStore.uploadsDir, {
      maxAge: "365d",
      immutable: true,
      setHeaders: (res) => {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    })
  );

  const getCookieValue = (req: express.Request, name: string) => {
    const raw = req.headers.cookie ?? "";
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

  const signAuthToken = (token: string) => {
    const signature = createHmac("sha256", effectiveCookieSigningKey).update(token).digest("hex");
    return `${token}.${signature}`;
  };
  const signTrustedDeviceToken = (token: string) => {
    const signature = createHmac("sha256", effectiveCookieSigningKey).update(token).digest("hex");
    return `${token}.${signature}`;
  };

  const readSignedAuthToken = (signedValue: string) => {
    const dotIndex = signedValue.lastIndexOf(".");
    if (dotIndex <= 0 || dotIndex === signedValue.length - 1) return "";
    const token = signedValue.slice(0, dotIndex);
    const providedSignature = signedValue.slice(dotIndex + 1);
    const expectedSignature = createHmac("sha256", effectiveCookieSigningKey).update(token).digest("hex");
    const provided = Buffer.from(providedSignature);
    const expected = Buffer.from(expectedSignature);
    if (provided.length !== expected.length) return "";
    if (!timingSafeEqual(provided, expected)) return "";
    return token;
  };
  const readSignedTrustedDeviceToken = (signedValue: string) => {
    const dotIndex = signedValue.lastIndexOf(".");
    if (dotIndex <= 0 || dotIndex === signedValue.length - 1) return "";
    const token = signedValue.slice(0, dotIndex);
    const providedSignature = signedValue.slice(dotIndex + 1);
    const expectedSignature = createHmac("sha256", effectiveCookieSigningKey).update(token).digest("hex");
    const provided = Buffer.from(providedSignature);
    const expected = Buffer.from(expectedSignature);
    if (provided.length !== expected.length) return "";
    if (!timingSafeEqual(provided, expected)) return "";
    return token;
  };
  const hashTrustedDeviceToken = (token: string) => createHash("sha256").update(`${effectiveCookieSigningKey}:${token}`).digest("hex");

  const setAuthCookie = (res: express.Response, token: string, expiresAt: number) => {
    const csrfToken = randomUUID();
    res.cookie(AUTH_COOKIE_NAME, signAuthToken(token), {
      httpOnly: true,
      secure: authCookieSecure,
      sameSite: authCookieSameSite,
      path: "/",
      maxAge: Math.max(0, expiresAt - Date.now())
    });
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      secure: authCookieSecure,
      sameSite: authCookieSameSite,
      path: "/",
      maxAge: Math.max(0, expiresAt - Date.now())
    });
    res.setHeader("x-csrf-token", csrfToken);
  };
  const attachCsrfHeaderFromRequest = (req: express.Request, res: express.Response) => {
    const csrfToken = getCookieValue(req, CSRF_COOKIE_NAME);
    if (csrfToken) {
      res.setHeader("x-csrf-token", csrfToken);
    }
  };
  const setTrustedDeviceCookie = (res: express.Response, token: string, expiresAt: number) => {
    res.cookie(TRUSTED_DEVICE_COOKIE_NAME, signTrustedDeviceToken(token), {
      httpOnly: true,
      secure: authCookieSecure,
      sameSite: authCookieSameSite,
      path: "/",
      maxAge: Math.max(0, expiresAt - Date.now())
    });
  };

  const clearAuthCookie = (res: express.Response) => {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: authCookieSecure,
      sameSite: authCookieSameSite,
      path: "/"
    });
    res.clearCookie(CSRF_COOKIE_NAME, {
      httpOnly: false,
      secure: authCookieSecure,
      sameSite: authCookieSameSite,
      path: "/"
    });
  };
  const clearTrustedDeviceCookie = (res: express.Response) => {
    res.clearCookie(TRUSTED_DEVICE_COOKIE_NAME, {
      httpOnly: true,
      secure: authCookieSecure,
      sameSite: authCookieSameSite,
      path: "/"
    });
  };
  const getTrustedDeviceTokenHash = (req: express.Request) => {
    const trustedDeviceToken = readSignedTrustedDeviceToken(getCookieValue(req, TRUSTED_DEVICE_COOKIE_NAME));
    if (!trustedDeviceToken) return "";
    return hashTrustedDeviceToken(trustedDeviceToken);
  };

  const getBearerToken = (req: express.Request) => {
    const authorizationHeader = req.header("authorization") ?? "";
    const bearerMatch = authorizationHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch) {
      const bearerToken = bearerMatch[1]?.trim() ?? "";
      if (bearerToken) return bearerToken;
    }
    return "";
  };

  const getAuthContext = (req: express.Request) => {
    const cookieToken = readSignedAuthToken(getCookieValue(req, AUTH_COOKIE_NAME));
    if (cookieToken) return { token: cookieToken, source: "cookie" as const };
    const bearerToken = getBearerToken(req);
    if (bearerToken) return { token: bearerToken, source: "bearer" as const };
    return { token: "", source: "none" as const };
  };

  const getAuthToken = (req: express.Request) => {
    const resolved = (req as express.Request & { authToken?: string }).authToken;
    if (resolved) return resolved;
    return getAuthContext(req).token;
  };

  const validateCsrfPair = (req: express.Request) => {
    const cookieToken = getCookieValue(req, CSRF_COOKIE_NAME);
    const headerToken = (req.header("x-csrf-token") ?? "").trim();
    if (!cookieToken || !headerToken) return false;
    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);
    if (cookieBuffer.length !== headerBuffer.length) return false;
    return timingSafeEqual(cookieBuffer, headerBuffer);
  };

  const requireAdminAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let { token, source } = getAuthContext(req);
    let trustedDeviceTokenHash = source === "cookie" ? getTrustedDeviceTokenHash(req) : "";
    let valid =
      source === "cookie"
        ? await authStore.verifySessionForDevice(token, trustedDeviceTokenHash)
        : await authStore.verifySession(token);
    if (!valid && source === "cookie") {
      const bearerToken = getBearerToken(req);
      if (bearerToken && (await authStore.verifySession(bearerToken))) {
        token = bearerToken;
        source = "bearer";
        trustedDeviceTokenHash = "";
        valid = true;
      }
    }
    if (!valid) {
      clearAuthCookie(res);
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    if (trustedDeviceTokenHash) {
      await authStore.touchTrustedDevice(trustedDeviceTokenHash);
    }
    if (source === "cookie") {
      attachCsrfHeaderFromRequest(req, res);
    }
    res.locals.authSource = source;
    const requestWithAuth = req as express.Request & {
      authSource?: "cookie" | "bearer" | "none";
      authToken?: string;
      adminRole?: "viewer" | "editor" | "publisher" | "owner";
    };
    requestWithAuth.authSource = source;
    requestWithAuth.authToken = token;
    try {
      const account = await authStore.getAccountSettings();
      const adminRole = resolveAiAdminRole(account.role);
      requestWithAuth.adminRole = adminRole;
      res.locals.adminRole = adminRole;
    } catch {
      requestWithAuth.adminRole = "owner";
      res.locals.adminRole = "owner";
    }
    next();
  };

  const requireCsrfForCookieAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const source = ((req as express.Request & { authSource?: "cookie" | "bearer" | "none" }).authSource ??
      res.locals.authSource) as "cookie" | "bearer" | "none" | undefined;
    if (source === "cookie" && !validateCsrfPair(req)) {
      res.status(403).json({ error: "Invalid CSRF token." });
      return;
    }
    next();
  };

  const resolveRequestIp = (req: express.Request) => {
    return req.ip || req.socket.remoteAddress || "unknown";
  };

  const requireAiCapability = (capability: AiCapability) => {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const role =
        ((req as express.Request & { adminRole?: "viewer" | "editor" | "publisher" | "owner" }).adminRole ??
          res.locals.adminRole ??
          "viewer") as "viewer" | "editor" | "publisher" | "owner";
      if (hasAiCapability(role, capability)) {
        next();
        return;
      }
      await aiControlStore.logAudit({
        action: capability,
        status: "denied",
        role,
        authSource: ((req as express.Request & { authSource?: "cookie" | "bearer" | "none" }).authSource ?? "unknown") as string,
        path: req.originalUrl,
        ip: resolveRequestIp(req),
        metadata: { reason: "missing_capability" }
      });
      res.status(403).json({ error: "Forbidden: capability not granted for this role." });
    };
  };

  const createIpRateLimiter = (keyPrefix: string, options: { windowMs: number; max: number }) => {
    const buckets = new Map<string, { count: number; resetAt: number }>();
    let lastCleanupMs = 0;
    const maxBuckets = Number.isFinite(RATE_LIMIT_BUCKET_LIMIT) && RATE_LIMIT_BUCKET_LIMIT > 0 ? Math.floor(RATE_LIMIT_BUCKET_LIMIT) : 10_000;
    const cleanupBuckets = (nowMs: number, force = false) => {
      if (!force && nowMs - lastCleanupMs < options.windowMs) return;
      lastCleanupMs = nowMs;
      for (const [bucketKey, bucket] of buckets.entries()) {
        if (bucket.resetAt <= nowMs) buckets.delete(bucketKey);
      }
      if (buckets.size <= maxBuckets) return;
      const overflow = buckets.size - maxBuckets;
      const oldestBuckets = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt).slice(0, overflow);
      for (const [bucketKey] of oldestBuckets) {
        buckets.delete(bucketKey);
      }
    };

    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const nowMs = Date.now();
      cleanupBuckets(nowMs);
      const ip = resolveRequestIp(req);
      const key = `${keyPrefix}:${ip}`;
      const existing = buckets.get(key);
      const bucket = !existing || existing.resetAt <= nowMs ? { count: 0, resetAt: nowMs + options.windowMs } : existing;
      bucket.count += 1;
      buckets.set(key, bucket);
      if (buckets.size > maxBuckets) cleanupBuckets(nowMs, true);

      if (bucket.count > options.max) {
        const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - nowMs) / 1000));
        res.setHeader("Retry-After", String(retryAfterSec));
        res.status(429).json({ error: "Too many requests. Try again later.", retryAfterSec });
        return;
      }

      next();
    };
  };
  const authIpLimiter = createIpRateLimiter("auth", {
    windowMs: Number.isFinite(AUTH_IP_RATE_WINDOW_MS) && AUTH_IP_RATE_WINDOW_MS > 0 ? AUTH_IP_RATE_WINDOW_MS : 60_000,
    max: Number.isFinite(AUTH_IP_RATE_MAX) && AUTH_IP_RATE_MAX > 0 ? AUTH_IP_RATE_MAX : 30
  });
  const authSensitiveIpLimiter = createIpRateLimiter("auth_sensitive", {
    windowMs:
      Number.isFinite(AUTH_SENSITIVE_IP_RATE_WINDOW_MS) && AUTH_SENSITIVE_IP_RATE_WINDOW_MS > 0
        ? AUTH_SENSITIVE_IP_RATE_WINDOW_MS
        : 60_000,
    max: Number.isFinite(AUTH_SENSITIVE_IP_RATE_MAX) && AUTH_SENSITIVE_IP_RATE_MAX > 0 ? AUTH_SENSITIVE_IP_RATE_MAX : 12
  });
  const subscribeIpLimiter = createIpRateLimiter("subscribe", {
    windowMs: Number.isFinite(SUBSCRIBE_IP_RATE_WINDOW_MS) && SUBSCRIBE_IP_RATE_WINDOW_MS > 0 ? SUBSCRIBE_IP_RATE_WINDOW_MS : 60_000,
    max: Number.isFinite(SUBSCRIBE_IP_RATE_MAX) && SUBSCRIBE_IP_RATE_MAX > 0 ? SUBSCRIBE_IP_RATE_MAX : 20
  });
  const mediaUploadIpLimiter = createIpRateLimiter("media_upload", {
    windowMs:
      Number.isFinite(MEDIA_UPLOAD_IP_RATE_WINDOW_MS) && MEDIA_UPLOAD_IP_RATE_WINDOW_MS > 0
        ? MEDIA_UPLOAD_IP_RATE_WINDOW_MS
        : 60_000,
    max: Number.isFinite(MEDIA_UPLOAD_IP_RATE_MAX) && MEDIA_UPLOAD_IP_RATE_MAX > 0 ? MEDIA_UPLOAD_IP_RATE_MAX : 20
  });
  const adminMutationIpLimiter = createIpRateLimiter("admin_mutation", {
    windowMs:
      Number.isFinite(ADMIN_MUTATION_IP_RATE_WINDOW_MS) && ADMIN_MUTATION_IP_RATE_WINDOW_MS > 0
        ? ADMIN_MUTATION_IP_RATE_WINDOW_MS
        : 60_000,
    max: Number.isFinite(ADMIN_MUTATION_IP_RATE_MAX) && ADMIN_MUTATION_IP_RATE_MAX > 0 ? ADMIN_MUTATION_IP_RATE_MAX : 60
  });
  const aiChatIpLimiter = createIpRateLimiter("ai_chat", {
    windowMs: Number.isFinite(AI_CHAT_IP_RATE_WINDOW_MS) && AI_CHAT_IP_RATE_WINDOW_MS > 0 ? AI_CHAT_IP_RATE_WINDOW_MS : 60_000,
    max: Number.isFinite(AI_CHAT_IP_RATE_MAX) && AI_CHAT_IP_RATE_MAX > 0 ? AI_CHAT_IP_RATE_MAX : 40
  });
  const aiWebSearchIpLimiter = createIpRateLimiter("ai_web_search", {
    windowMs:
      Number.isFinite(AI_WEB_SEARCH_IP_RATE_WINDOW_MS) && AI_WEB_SEARCH_IP_RATE_WINDOW_MS > 0
        ? AI_WEB_SEARCH_IP_RATE_WINDOW_MS
        : 60_000,
    max: Number.isFinite(AI_WEB_SEARCH_IP_RATE_MAX) && AI_WEB_SEARCH_IP_RATE_MAX > 0 ? AI_WEB_SEARCH_IP_RATE_MAX : 20
  });

  const auditAdminAction = (action: string) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const started = Date.now();
      res.on("finish", () => {
        if (res.statusCode === 404) return;
        void analyticsStore.add("admin_action", {
          action,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: Date.now() - started,
          authSource: (req as express.Request & { authSource?: "cookie" | "bearer" | "none" }).authSource ?? "unknown",
          ip: resolveRequestIp(req),
          userAgent: req.header("user-agent") ?? "unknown",
          at: new Date().toISOString()
        });
      });
      next();
    };
  };

  const sendAuthError = (res: express.Response, error: unknown, fallbackMessage: string) => {
    if (isAuthRateLimitError(error)) {
      res.status(429).json({ error: error.message, retryAfterSec: error.retryAfterSec });
      return;
    }
    res.status(400).json({ error: error instanceof Error ? error.message : fallbackMessage });
  };
  const exposeInternalErrors = !isProduction || process.env.EXPOSE_INTERNAL_ERRORS === "true";
  const safeServerErrorMessage = (error: unknown, fallbackMessage: string) =>
    exposeInternalErrors && error instanceof Error && error.message.trim() ? error.message : fallbackMessage;

  const parseCampaignInput = (body: unknown) => {
    const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const id = typeof payload.id === "string" ? payload.id.trim() : "";
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
    const previewText = typeof payload.previewText === "string" ? payload.previewText : "";
    const bodyMode =
      payload.bodyMode === EMAIL_CAMPAIGN_BODY_MODE.rich || payload.bodyMode === EMAIL_CAMPAIGN_BODY_MODE.html
        ? payload.bodyMode
        : EMAIL_CAMPAIGN_BODY_MODE.rich;
    const bodyRich = typeof payload.bodyRich === "string" ? payload.bodyRich : "";
    const bodyHtml = typeof payload.bodyHtml === "string" ? payload.bodyHtml : "";
    const audienceMode =
      payload.audienceMode === EMAIL_CAMPAIGN_AUDIENCE_MODE.segments || payload.audienceMode === EMAIL_CAMPAIGN_AUDIENCE_MODE.all
        ? payload.audienceMode
        : EMAIL_CAMPAIGN_AUDIENCE_MODE.all;
    const segments = Array.isArray(payload.segments) ? payload.segments.map((item) => String(item).trim()).filter(Boolean) : [];
    const exclusions = Array.isArray(payload.exclusions) ? payload.exclusions.map((item) => String(item).trim()).filter(Boolean) : [];
    const sendMode =
      payload.sendMode === EMAIL_CAMPAIGN_SEND_MODE.schedule || payload.sendMode === EMAIL_CAMPAIGN_SEND_MODE.now
        ? payload.sendMode
        : EMAIL_CAMPAIGN_SEND_MODE.now;
    const scheduleAt = typeof payload.scheduleAt === "string" ? payload.scheduleAt : null;
    const timezone = typeof payload.timezone === "string" && payload.timezone.trim() ? payload.timezone.trim() : "UTC";
    const estimatedRecipientsRaw = typeof payload.estimatedRecipients === "number" ? payload.estimatedRecipients : Number(payload.estimatedRecipients ?? 0);
    const estimatedRecipients = Number.isFinite(estimatedRecipientsRaw) ? Math.max(0, Math.floor(estimatedRecipientsRaw)) : 0;

    return {
      id,
      name,
      subject,
      previewText,
      bodyMode,
      bodyRich,
      bodyHtml,
      audienceMode,
      segments,
      exclusions,
      sendMode,
      scheduleAt,
      timezone,
      estimatedRecipients
    };
  };

  const getClientIp = (req: express.Request) => {
    return resolveRequestIp(req);
  };

  const hashValue = (value: string) => {
    if (!value.trim()) return "";
    return createHash("sha256").update(value).digest("hex");
  };

  const toFirstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || "there";
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const normalizeLanguage = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (["en", "fr", "es", "de", "ar", "pt"].includes(normalized)) return normalized;
    return "en";
  };
  const languageLabel = (value: string) => {
    const map: Record<string, string> = { en: "English", fr: "French", es: "Spanish", de: "German", ar: "Arabic", pt: "Portuguese" };
    return map[value] ?? "English";
  };
  const toneLabel = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (["professional", "friendly", "urgent", "educational"].includes(normalized)) return normalized;
    return "professional";
  };
  const toEmoji = (section: string) => {
    const map: Record<string, string> = {
      health: "🌿",
      gadgets: "📱",
      supplements: "💊",
      upcoming: "🚀",
      forex: "📈",
      betting: "🎯",
      software: "💻",
      social: "📣"
    };
    return map[section] ?? "✨";
  };
  const buildAiEmailHtml = (input: {
    headline: string;
    intro: string;
    ctaLabel: string;
    ctaUrl: string;
    productBullets: string[];
    disclaimer: string;
    language: string;
  }) => {
    const bullets = input.productBullets.map((item) => `<li style="margin:0 0 8px 0;">${escapeHtml(item)}</li>`).join("");
    return `<!doctype html>
<html lang="${escapeHtml(input.language)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(input.headline)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f8ff;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f8ff;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dbe4ff;">
            <tr>
              <td style="padding:28px 24px;background:#0f172a;color:#ffffff;">
                <h1 style="margin:0;font-size:26px;line-height:1.2;">${escapeHtml(input.headline)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;color:#0f172a;">
                <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;">${escapeHtml(input.intro)}</p>
                <ul style="padding-left:20px;margin:0 0 18px 0;font-size:15px;line-height:1.5;color:#1e293b;">
                  ${bullets}
                </ul>
                <p style="margin:0 0 18px 0;">
                  <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">
                    ${escapeHtml(input.ctaLabel)}
                  </a>
                </p>
                <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#475569;">${escapeHtml(input.disclaimer)}</p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">
                  Unsubscribe: <a href="{{unsubscribe_link}}" style="color:#2563eb;">{{unsubscribe_link}}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  };
  const buildAiEmailRich = (input: {
    headline: string;
    intro: string;
    ctaLabel: string;
    ctaUrl: string;
    productBullets: string[];
    disclaimer: string;
  }) =>
    [
      input.headline,
      "",
      input.intro,
      "",
      ...input.productBullets.map((item, index) => `${index + 1}. ${item}`),
      "",
      `${input.ctaLabel}: ${input.ctaUrl}`,
      "",
      input.disclaimer,
      "",
      "Unsubscribe: {{unsubscribe_link}}"
    ].join("\n");
  const sanitizeFileSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "ai-export";
  const toExportLines = (input: {
    question: string;
    generatedAt: string;
    site: { products: number; industries: number; subscribers: number; events: number };
    suggestions: string[];
  }) => [
    `Question: ${input.question}`,
    `Generated at: ${input.generatedAt}`,
    `Total products: ${input.site.products}`,
    `Industries: ${input.site.industries}`,
    `Subscribers: ${input.site.subscribers}`,
    `Analytics events: ${input.site.events}`,
    "",
    "Suggested actions:",
    ...input.suggestions.map((item, idx) => `${idx + 1}. ${item}`)
  ];
  const escapePdfText = (value: string) => value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const buildSimplePdf = (lines: string[]) => {
    const rendered = lines
      .slice(0, 40)
      .map((line, idx) => {
        const y = 780 - idx * 18;
        return `BT /F1 11 Tf 50 ${y} Td (${escapePdfText(line.slice(0, 110))}) Tj ET`;
      })
      .join("\n");
    const stream = `${rendered}\n`;
    const objects = [
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
      `4 0 obj << /Length ${Buffer.byteLength(stream, "utf8")} >> stream\n${stream}endstream endobj`,
      "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj"
    ];
    let body = "";
    const offsets = [0];
    for (const obj of objects) {
      offsets.push(Buffer.byteLength(body, "utf8"));
      body += `${obj}\n`;
    }
    const xrefStart = Buffer.byteLength(body, "utf8");
    const xrefRows = offsets
      .map((offset, idx) => (idx === 0 ? "0000000000 65535 f " : `${String(offset).padStart(10, "0")} 00000 n `))
      .join("\n");
    const pdf = `%PDF-1.4\n${body}xref\n0 ${offsets.length}\n${xrefRows}\ntrailer << /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
    return Buffer.from(pdf, "utf8");
  };
  const buildDocHtml = (title: string, lines: string[]) =>
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><h2>${escapeHtml(
      title
    )}</h2>${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</body></html>`;
  const buildExcelHtml = (title: string, lines: string[]) => {
    const rows = lines.map((line, idx) => `<tr><td>${idx + 1}</td><td>${escapeHtml(line)}</td></tr>`).join("");
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
      title
    )}</title></head><body><table border="1"><thead><tr><th>#</th><th>Content</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  };

  const buildConfirmationLinks = (input: { confirmToken: string; unsubscribeToken: string }) => {
    const confirmUrl = `${API_PUBLIC_BASE_URL}/api/email/confirm?token=${encodeURIComponent(input.confirmToken)}`;
    const unsubscribeUrl = `${API_PUBLIC_BASE_URL}/api/email/unsubscribe?token=${encodeURIComponent(input.unsubscribeToken)}`;
    return { confirmUrl, unsubscribeUrl };
  };

  const deliverConfirmationEmail = async (input: { name: string; email: string; confirmToken: string; unsubscribeToken: string }) => {
    // eslint-disable-next-line no-console
    console.log(`[email] confirmation send requested email=${input.email}`);
    const [template, senderProfile] = await Promise.all([emailStore.getConfirmationTemplate(), emailStore.getSenderProfile()]);
    const { confirmUrl, unsubscribeUrl } = buildConfirmationLinks({
      confirmToken: input.confirmToken,
      unsubscribeToken: input.unsubscribeToken
    });
    const result = await sendConfirmationEmail({
      toEmail: input.email,
      firstName: toFirstName(input.name),
      confirmUrl,
      unsubscribeUrl,
      subject: template.subject,
      previewText: template.previewText,
      bodyMode: template.mode,
      bodyRich: template.bodyRich,
      bodyHtml: template.bodyHtml,
      fromName: senderProfile.fromName,
      fromEmail: senderProfile.fromEmail,
      replyTo: senderProfile.replyTo,
      smtpHost: senderProfile.smtpHost,
      smtpPort: senderProfile.smtpPort,
      smtpUser: senderProfile.smtpUser,
      smtpPass: senderProfile.smtpPass,
      smtpSecure: resolveSmtpSecureForPort(Number(senderProfile.smtpPort), senderProfile.smtpSecure),
      includeUnsubscribeFooter: senderProfile.includeUnsubscribeFooter,
      checks: senderProfile.checks
    });
    // eslint-disable-next-line no-console
    console.log(
      `[email] confirmation send result email=${input.email} delivered=${String(result.delivered)} provider=${result.provider} messageId=${
        result.messageId
      }`
    );
    return result;
  };

  const queueConfirmationDelivery = (input: {
    id: string;
    name: string;
    email: string;
    confirmToken: string;
    unsubscribeToken: string;
    source: "auto_subscription_flow" | "admin_email_analytics";
  }) => {
    void (async () => {
      try {
        const result = await deliverConfirmationEmail({
          name: input.name,
          email: input.email,
          confirmToken: input.confirmToken,
          unsubscribeToken: input.unsubscribeToken
        });
        await emailStore.addEvent({
          eventType: EMAIL_EVENT_TYPES.leadConfirmationResent,
          subscriberId: input.id,
          meta: {
            source: input.source,
            confirmationDispatch: {
              state: "sent",
              messageId: result.messageId,
              accepted: result.accepted,
              rejected: result.rejected,
              at: new Date().toISOString()
            }
          }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown confirmation delivery error.";
        const detailCode =
          error instanceof EmailDeliveryError && typeof error.detailCode === "string" && error.detailCode.trim()
            ? error.detailCode.trim()
            : "UNKNOWN";
        await emailStore.addEvent({
          eventType: EMAIL_EVENT_TYPES.leadConfirmationResent,
          subscriberId: input.id,
          meta: {
            source: input.source,
            confirmationDispatch: {
              state: "failed",
              errorCode: detailCode,
              errorMessage: message,
              at: new Date().toISOString()
            }
          }
        });
        // eslint-disable-next-line no-console
        console.error(
          `[email] confirmation async send failed source=${input.source} email=${input.email} code=${detailCode} message=${message}`
        );
      }
    })();
  };

  app.get("/api/health", (_req, res) => {
    const payload: Record<string, unknown> = {
      ok: true,
      service: "autohub-backend",
      timestamp: new Date().toISOString(),
      uptimeSec: Math.floor(process.uptime())
    };
    if (!isProduction || process.env.HEALTH_INCLUDE_DETAILS === "true") {
      payload.env = {
        persistenceMode: PERSISTENCE_MODE,
        port: PORT,
        corsOrigins: CORS_ORIGINS,
        dbUrlProvided: Boolean(DB_URL),
        mediaDir: MEDIA_DIR
      };
    }
    res.status(200).json(payload);
  });

  app.get("/api/auth/status", async (_req, res) => {
    const status = await authStore.getStatus();
    res.status(200).json(status);
  });

  app.post("/api/auth/login/start", authIpLimiter, async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const trustDevice = req.body?.trustDevice === true;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }
    if (email.length > LOGIN_EMAIL_MAX_CHARS) {
      res.status(400).json({ error: `Email is too long (max ${LOGIN_EMAIL_MAX_CHARS} chars).` });
      return;
    }
    if (password.length > LOGIN_PASSWORD_MAX_CHARS) {
      res.status(400).json({ error: `Password is too long (max ${LOGIN_PASSWORD_MAX_CHARS} chars).` });
      return;
    }
    try {
      let trustedDeviceToken = "";
      let trustedDeviceTokenHash = "";
      if (trustDevice) {
        trustedDeviceToken = `${randomUUID()}-${randomUUID()}`;
        trustedDeviceTokenHash = hashTrustedDeviceToken(trustedDeviceToken);
        await authStore.registerTrustedDevice(trustedDeviceTokenHash, TRUSTED_DEVICE_TTL_MS);
      } else {
        const existingTrustedDeviceHash = getTrustedDeviceTokenHash(req);
        if (existingTrustedDeviceHash && (await authStore.hasTrustedDevice(existingTrustedDeviceHash))) {
          trustedDeviceTokenHash = existingTrustedDeviceHash;
          await authStore.touchTrustedDevice(existingTrustedDeviceHash);
        }
      }
      const session = await authStore.startLogin(email, password, {
        trustedDeviceTokenHash: trustedDeviceTokenHash || undefined
      });
      setAuthCookie(res, session.token, session.expiresAt);
      if (trustedDeviceToken) {
        setTrustedDeviceCookie(res, trustedDeviceToken, Date.now() + TRUSTED_DEVICE_TTL_MS);
      }
      res.status(200).json({
        ok: true,
        requiresOtp: false,
        trustedDevice: Boolean(trustedDeviceTokenHash),
        authToken: session.token
      });
    } catch (error) {
      sendAuthError(res, error, "Failed to start login.");
    }
  });

  app.get("/api/auth/session", async (req, res) => {
    let { token, source } = getAuthContext(req);
    let trustedDeviceTokenHash = source === "cookie" ? getTrustedDeviceTokenHash(req) : "";
    let valid =
      source === "cookie"
        ? await authStore.verifySessionForDevice(token, trustedDeviceTokenHash)
        : await authStore.verifySession(token);
    if (!valid && source === "cookie") {
      const bearerToken = getBearerToken(req);
      if (bearerToken && (await authStore.verifySession(bearerToken))) {
        token = bearerToken;
        source = "bearer";
        trustedDeviceTokenHash = "";
        valid = true;
      }
    }
    if (!valid) {
      clearAuthCookie(res);
    } else if (trustedDeviceTokenHash) {
      await authStore.touchTrustedDevice(trustedDeviceTokenHash);
    }
    if (valid && source === "cookie") attachCsrfHeaderFromRequest(req, res);
    res.status(200).json({ valid });
  });

  app.post("/api/auth/logout", authSensitiveIpLimiter, requireCsrfForCookieAuth, async (req, res) => {
    const token = getAuthToken(req);
    if (token) {
      await authStore.logout(token);
    }
    clearAuthCookie(res);
    res.status(200).json({ ok: true });
  });

  app.post(
    "/api/auth/logout-all",
    requireAdminAuth,
    authSensitiveIpLimiter,
    requireCsrfForCookieAuth,
    auditAdminAction("auth.logout_all"),
    async (req, res) => {
    const token = getAuthToken(req);
    const keepCurrent = Boolean(req.body?.keepCurrent);
    await authStore.logoutAll(keepCurrent ? token : undefined);
    if (!keepCurrent) clearAuthCookie(res);
    res.status(200).json({ ok: true, keepCurrent });
    }
  );

  app.get("/api/auth/account", requireAdminAuth, async (_req, res) => {
    try {
      const account = await authStore.getAccountSettings();
      res.status(200).json(account);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to load account settings." });
    }
  });

  app.put(
    "/api/auth/account",
    requireAdminAuth,
    authSensitiveIpLimiter,
    requireCsrfForCookieAuth,
    auditAdminAction("auth.update_account"),
    async (req, res) => {
    try {
      const fullName = typeof req.body?.fullName === "string" ? req.body.fullName : "";
      const timezone = typeof req.body?.timezone === "string" ? req.body.timezone : "UTC";
      const account = await authStore.updateAccountSettings({ fullName, timezone });
      res.status(200).json(account);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to save account settings." });
    }
    }
  );

  app.put(
    "/api/auth/password",
    requireAdminAuth,
    authSensitiveIpLimiter,
    requireCsrfForCookieAuth,
    auditAdminAction("auth.change_password"),
    async (req, res) => {
    try {
      const token = getAuthToken(req);
      const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
      const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
      if (currentPassword.length > LOGIN_PASSWORD_MAX_CHARS || newPassword.length > LOGIN_PASSWORD_MAX_CHARS) {
        res.status(400).json({ error: `Password is too long (max ${LOGIN_PASSWORD_MAX_CHARS} chars).` });
        return;
      }
      const session = await authStore.changePassword(currentPassword, newPassword, token);
      await authStore.clearTrustedDevices();
      setAuthCookie(res, session.token, session.expiresAt);
      clearTrustedDeviceCookie(res);
      res.status(200).json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update password." });
    }
    }
  );

  app.get("/api/media", requireAdminAuth, async (_req, res) => {
    const items = await mediaStore.list();
    res.status(200).json({ items });
  });

  app.post(
    "/api/media",
    requireAdminAuth,
    mediaUploadIpLimiter,
    requireCsrfForCookieAuth,
    auditAdminAction("media.upload"),
    upload.array("files", maxUploadFiles),
    async (req, res) => {
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (!files.length) {
      res.status(400).json({ error: "No files uploaded. Use form-data field 'files'." });
      return;
    }

    const created = [];
    for (const file of files) {
      const url = `${API_PUBLIC_BASE_URL}/uploads/${file.filename}`;
      const item = await mediaStore.add({
        name: file.originalname,
        fileName: file.filename,
        url,
        mime: file.mimetype,
        sizeBytes: file.size
      });
      created.push(item);
    }

    res.status(201).json({ items: created });
    }
  );

  app.delete("/api/media/:id", requireAdminAuth, requireCsrfForCookieAuth, auditAdminAction("media.delete"), async (req, res) => {
    const mediaId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const removed = await mediaStore.remove(mediaId);
    if (!removed) {
      res.status(404).json({ error: "Media item not found." });
      return;
    }
    res.status(200).json({ ok: true, removedId: removed.id });
  });

  app.get("/api/site/published", async (_req, res) => {
    const content = await siteStore.getPublished();
    res.status(200).json({ content });
  });

  app.get("/api/site/draft", requireAdminAuth, async (_req, res) => {
    const content = await siteStore.getDraft();
    res.status(200).json({ content });
  });

  app.get("/api/site/meta", async (_req, res) => {
    const meta = await siteStore.getMeta();
    res.status(200).json(meta);
  });

  app.put(
    "/api/site/draft",
    requireAdminAuth,
    adminMutationIpLimiter,
    requireCsrfForCookieAuth,
    auditAdminAction("site.save_draft"),
    async (req, res) => {
    const payload = req.body?.content as SiteContent | undefined;
    if (!payload || typeof payload !== "object") {
      res.status(400).json({ error: "content payload is required." });
      return;
    }
    try {
      const content = await siteStore.saveDraft(payload);
      res.status(200).json({ content });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid content payload." });
    }
    }
  );

  app.post(
    "/api/site/publish",
    requireAdminAuth,
    adminMutationIpLimiter,
    requireCsrfForCookieAuth,
    auditAdminAction("site.publish"),
    async (req, res) => {
    const payload = req.body?.content as SiteContent | undefined;
    try {
      const content = await siteStore.publish(payload);
      res.status(200).json({ content });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid content payload." });
    }
    }
  );

  app.post(
    "/api/site/reset",
    requireAdminAuth,
    adminMutationIpLimiter,
    requireCsrfForCookieAuth,
    auditAdminAction("site.reset"),
    async (_req, res) => {
    const next = await siteStore.reset();
    res.status(200).json({ published: next.published, draft: next.draft });
    }
  );

  const normalizeForCompare = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
  const hasHealthRiskClaims = (value: string) => /(cure|guaranteed|100%|no risk|instant results|instant)/i.test(value);
  const hasAffiliateDisclosureSignal = (warnings: string[], shortDescription: string, longDescription: string) => {
    const merged = [...warnings, shortDescription, longDescription].join(" ");
    return /(affiliate|commission|disclosure)/i.test(merged);
  };

  const getSectionDuplicateReasons = (
    published: SiteContent,
    section: "forex" | "betting" | "software" | "social" | "gadgets" | "supplements" | "upcoming",
    candidate: { title: string; checkoutLink: string; imageUrl: string }
  ) => {
    const titleKey = normalizeForCompare(candidate.title);
    const linkKey = normalizeForCompare(candidate.checkoutLink);
    const imageKey = normalizeForCompare(candidate.imageUrl);
    const reasons: string[] = [];

    if (section === "upcoming") {
      const items = published.healthPage?.upcoming.items ?? [];
      const titleDuplicate = items.some((item) => normalizeForCompare(item.title) === titleKey);
      const imageDuplicate = imageKey ? items.some((item) => normalizeForCompare(item.imageUrl ?? "") === imageKey) : false;
      if (titleDuplicate) reasons.push("Duplicate title exists in upcoming.");
      if (imageDuplicate) reasons.push("Duplicate image exists in upcoming.");
      return reasons;
    }

    const items =
      section === "gadgets" || section === "supplements"
        ? published.healthPage?.products[section] ?? []
        : published.products[section];
    const titleDuplicate = items.some((item) => normalizeForCompare(item.title) === titleKey);
    const linkDuplicate = linkKey ? items.some((item) => normalizeForCompare(item.checkoutLink ?? "") === linkKey) : false;
    const imageDuplicate = imageKey ? items.some((item) => normalizeForCompare(item.imageUrl ?? "") === imageKey) : false;
    if (titleDuplicate) reasons.push("Duplicate title exists in target section.");
    if (linkDuplicate) reasons.push("Duplicate checkout link exists in target section.");
    if (imageDuplicate) reasons.push("Duplicate image exists in target section.");
    return reasons;
  };

  const callSuperModeChat = async (input: {
    message: string;
    imageUrl?: string;
    context: {
      siteUpdatedAt: string;
      totalProducts: number;
      subscribers: number;
      analyticsEvents: number;
      hasDraft: boolean;
    };
  }) => {
    const runtime = await aiControlStore.getRuntimeSettings();
    if (runtime.mode !== "super" || !runtime.superMode) return null;

    const endpoint = `${runtime.superMode.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const systemPrompt =
      "You are an admin AI copilot for a content + affiliate website. Respond in concise markdown with sections, bullets, and practical actions. Avoid unsafe or misleading claims.";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${runtime.superMode.apiKey}`
      },
      body: JSON.stringify({
        model: runtime.superMode.model,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: input.imageUrl
              ? [
                  {
                    type: "text",
                    text: [
                      `User request: ${input.message}`,
                      "Current snapshot:",
                      `- Site updated at: ${input.context.siteUpdatedAt}`,
                      `- Total products: ${input.context.totalProducts}`,
                      `- Subscribers: ${input.context.subscribers}`,
                      `- Analytics events: ${input.context.analyticsEvents}`,
                      `- Has draft: ${String(input.context.hasDraft)}`
                    ].join("\n")
                  },
                  {
                    type: "image_url",
                    image_url: { url: input.imageUrl }
                  }
                ]
              : [
                  `User request: ${input.message}`,
                  "Current snapshot:",
                  `- Site updated at: ${input.context.siteUpdatedAt}`,
                  `- Total products: ${input.context.totalProducts}`,
                  `- Subscribers: ${input.context.subscribers}`,
                  `- Analytics events: ${input.context.analyticsEvents}`,
                  `- Has draft: ${String(input.context.hasDraft)}`
                ].join("\n")
          }
        ]
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Super mode provider error (${response.status}): ${message.slice(0, 240)}`);
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim() ?? "";
    if (!content) {
      throw new Error("Super mode provider returned an empty response.");
    }
    return {
      provider: runtime.superMode.provider,
      model: runtime.superMode.model,
      answer: content
    };
  };

  app.get("/api/ai/control/context", requireAdminAuth, requireAiCapability("ai.chat.ask"), async (req, res) => {
    try {
      const [siteMeta, published, emailSummary, analyticsSummary, latestTrafficPlan] = await Promise.all([
        siteStore.getMeta(),
        siteStore.getPublished(),
        emailStore.getAnalyticsSummary(),
        analyticsStore.summary(),
        trafficAiStore.getLatestPlan()
      ]);

      const sectionCounts = {
        forex: published.products.forex.length,
        betting: published.products.betting.length,
        software: published.products.software.length,
        social: published.products.social.length,
        healthGadgets: published.healthPage?.products.gadgets.length ?? 0,
        healthSupplements: published.healthPage?.products.supplements.length ?? 0,
        healthUpcoming: published.healthPage?.upcoming.items.length ?? 0
      };
      const totalProducts = Object.values(sectionCounts).reduce((acc, value) => acc + value, 0);

      res.status(200).json({
        snapshotAt: new Date().toISOString(),
        site: {
          updatedAt: siteMeta.updatedAt,
          hasDraft: siteMeta.hasDraft,
          industries: published.industries.length,
          testimonials: published.testimonials.length,
          sectionCounts,
          totalProducts
        },
        email: emailSummary.totals,
        analytics: {
          totalEvents: analyticsSummary.totalEvents,
          topEvents: Object.entries(analyticsSummary.byEvent)
            .map(([eventName, count]) => ({ eventName, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
        },
        trafficAi: latestTrafficPlan
          ? {
              latestPlanAt: latestTrafficPlan.createdAt,
              opportunities: latestTrafficPlan.summary.opportunities,
              avgScore: latestTrafficPlan.summary.avgCompositeScore
            }
          : null,
        role:
          ((req as express.Request & { adminRole?: "viewer" | "editor" | "publisher" | "owner" }).adminRole ?? "viewer") as
            | "viewer"
            | "editor"
            | "publisher"
            | "owner",
        capabilities: listCapabilitiesForRole(
          (((req as express.Request & { adminRole?: "viewer" | "editor" | "publisher" | "owner" }).adminRole ??
            "viewer") as "viewer" | "editor" | "publisher" | "owner")
        )
      });
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to build AI control context.") });
    }
  });

  app.get("/api/ai/control/safety-summary", requireAdminAuth, requireAiCapability("ai.chat.ask"), async (_req, res) => {
    try {
      const summary = await aiControlStore.getSafetySummary();
      res.status(200).json(summary);
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to load AI safety summary.") });
    }
  });

  app.get("/api/ai/control/settings", requireAdminAuth, requireAiCapability("ai.chat.ask"), async (_req, res) => {
    try {
      const settings = await aiControlStore.getSettings();
      res.status(200).json(settings);
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to load AI settings.") });
    }
  });

  app.put(
    "/api/ai/control/settings/mode",
    requireAdminAuth,
    requireAiCapability("ai.action.prepare"),
    requireCsrfForCookieAuth,
    auditAdminAction("ai_control.settings_mode"),
    async (req, res) => {
      const mode = req.body?.mode === "super" ? "super" : "current";
      try {
        const next = await aiControlStore.setMode(mode);
        res.status(200).json(next);
      } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update AI mode." });
      }
    }
  );

  app.put(
    "/api/ai/control/settings/super",
    requireAdminAuth,
    requireAiCapability("ai.action.prepare"),
    requireCsrfForCookieAuth,
    auditAdminAction("ai_control.settings_super"),
    async (req, res) => {
      const payload = typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};
      const apiKey = typeof payload.apiKey === "string" ? payload.apiKey : "";
      const baseUrl = typeof payload.baseUrl === "string" ? payload.baseUrl : undefined;
      const model = typeof payload.model === "string" ? payload.model : undefined;
      const provider = typeof payload.provider === "string" ? payload.provider : undefined;
      try {
        const next = await aiControlStore.upsertSuperMode({ apiKey, baseUrl, model, provider });
        res.status(200).json(next);
      } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : "Failed to save super mode settings." });
      }
    }
  );

  app.delete(
    "/api/ai/control/settings/super",
    requireAdminAuth,
    requireAiCapability("ai.action.prepare"),
    requireCsrfForCookieAuth,
    auditAdminAction("ai_control.settings_super_clear"),
    async (_req, res) => {
      try {
        const next = await aiControlStore.clearSuperMode();
        res.status(200).json(next);
      } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : "Failed to clear super mode settings." });
      }
    }
  );

  app.post(
    "/api/ai/control/chat",
    requireAdminAuth,
    aiChatIpLimiter,
    requireAiCapability("ai.chat.ask"),
    requireCsrfForCookieAuth,
    auditAdminAction("ai_control.chat"),
    async (req, res) => {
    const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
    const rawMessage = typeof req.body?.rawMessage === "string" ? req.body.rawMessage.trim() : "";
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const imageUrl = typeof req.body?.imageUrl === "string" ? req.body.imageUrl.trim() : "";
    const formattingMarkdown = req.body?.formatting?.markdown === true;
    type HistoryMessage = { role: "user" | "assistant"; content: string };
    if (sessionId.length > AI_CHAT_MAX_SESSION_ID_CHARS) {
      res.status(400).json({ error: `sessionId is too long (max ${AI_CHAT_MAX_SESSION_ID_CHARS} chars).` });
      return;
    }
    if (rawMessage.length > AI_CHAT_MAX_MESSAGE_CHARS || message.length > AI_CHAT_MAX_MESSAGE_CHARS) {
      res.status(400).json({ error: `message is too long (max ${AI_CHAT_MAX_MESSAGE_CHARS} chars).` });
      return;
    }

    const incomingMessages: unknown[] = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const historyMessages = incomingMessages
      .slice(-AI_CHAT_MAX_HISTORY_ITEMS)
      .map((item: unknown) => {
        const asRecord = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
        const role = typeof asRecord.role === "string" ? asRecord.role.toLowerCase() : "";
        const contentRaw = typeof asRecord.content === "string" ? asRecord.content.trim() : "";
        const content = contentRaw.slice(0, AI_CHAT_MAX_HISTORY_ITEM_CHARS);
        if (!content || (role !== "user" && role !== "assistant")) return null;
        return { role: role as "user" | "assistant", content } satisfies HistoryMessage;
      })
      .filter((item: HistoryMessage | null): item is HistoryMessage => Boolean(item));
    const totalHistoryChars = historyMessages.reduce((sum, item) => sum + item.content.length, 0);
    if (totalHistoryChars > AI_CHAT_MAX_HISTORY_TOTAL_CHARS) {
      res.status(400).json({ error: `messages payload is too large (max ${AI_CHAT_MAX_HISTORY_TOTAL_CHARS} chars).` });
      return;
    }
    const clientContextPayload = typeof req.body?.clientContext === "object" && req.body.clientContext !== null
      ? (req.body.clientContext as Record<string, unknown>)
      : {};
    const clientContext = {
      currentMode:
        clientContextPayload.currentMode === "super" || clientContextPayload.currentMode === "current"
          ? clientContextPayload.currentMode
          : "current",
      productsCount:
        typeof clientContextPayload.productsCount === "number" && Number.isFinite(clientContextPayload.productsCount)
          ? clientContextPayload.productsCount
          : 0,
      subscribersCount:
        typeof clientContextPayload.subscribersCount === "number" && Number.isFinite(clientContextPayload.subscribersCount)
          ? clientContextPayload.subscribersCount
          : 0,
      eventsCount:
        typeof clientContextPayload.eventsCount === "number" && Number.isFinite(clientContextPayload.eventsCount)
          ? clientContextPayload.eventsCount
          : 0,
      snapshotTime: typeof clientContextPayload.snapshotTime === "string" ? clientContextPayload.snapshotTime : "",
      activeSection: typeof clientContextPayload.activeSection === "string" ? clientContextPayload.activeSection : "marketing"
    };
    const sessionContextPayload =
      typeof req.body?.sessionContext === "object" && req.body.sessionContext !== null
        ? (req.body.sessionContext as Record<string, unknown>)
        : {};
    const sessionContext = {
      category: typeof sessionContextPayload.category === "string" ? sessionContextPayload.category : "health",
      platform: typeof sessionContextPayload.platform === "string" ? sessionContextPayload.platform : "web",
      tone: typeof sessionContextPayload.tone === "string" ? sessionContextPayload.tone : "professional"
    };
    const autoRewrite = req.body?.autoRewrite !== false;
    type NormalizedUserMessage = {
      cleaned: string;
      intentHint: string | null;
      entities: {
        category?: "forex" | "betting" | "social" | "software" | "other";
        platform?: "facebook" | "x" | "tiktok" | "youtube" | "website";
        goal?: "fix" | "research" | "write" | "plan" | "summarize";
      };
      isVague: boolean;
      clarifyingQuestion?: string;
      options?: string[];
    };
    const normalizeUserMessage = (rawInput: string, sessionCtx: typeof sessionContext): NormalizedUserMessage => {
      const protectedParts: string[] = [];
      let working = rawInput || "";
      const protect = (pattern: RegExp) => {
        working = working.replace(pattern, (segment) => {
          const token = `__PROTECTED_${protectedParts.length}__`;
          protectedParts.push(segment);
          return token;
        });
      };
      protect(/```[\s\S]*?```/g);
      protect(/`[^`\n]+`/g);
      protect(/https?:\/\/\S+/g);
      protect(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi);

      working = working.trim().replace(/\s+/g, " ").replace(/([!?.,])\1{1,}/g, "$1").replace(/([a-zA-Z])\1{2,}/g, "$1$1");
      const wordFixes: Record<string, string> = {
        lenguage: "language",
        reorganise: "reorganize",
        syetem: "system",
        frinedly: "friendly",
        wheather: "whether",
        visiblity: "visibility",
        appering: "appearing",
        clinet: "client",
        adimin: "admin"
      };
      working = working.replace(/\b[a-zA-Z]{3,}\b/g, (word) => {
        const lower = word.toLowerCase();
        if (!wordFixes[lower]) return word;
        if (word === lower) return wordFixes[lower];
        if (/^[A-Z]/.test(word)) return `${wordFixes[lower].charAt(0).toUpperCase()}${wordFixes[lower].slice(1)}`;
        return wordFixes[lower];
      });
      for (let index = 0; index < protectedParts.length; index += 1) {
        working = working.replace(`__PROTECTED_${index}__`, protectedParts[index]);
      }
      const cleaned = working;
      const lower = cleaned.toLowerCase();
      const entities: NormalizedUserMessage["entities"] = {};
      if (/\bforex\b/.test(lower)) entities.category = "forex";
      else if (/\bbetting\b/.test(lower)) entities.category = "betting";
      else if (/\bsocial\b/.test(lower)) entities.category = "social";
      else if (/\bsoftware\b/.test(lower)) entities.category = "software";
      else if (/\b(gadget|supplement|health|upcoming)\b/.test(lower)) entities.category = "other";
      if (/\bfacebook\b/.test(lower)) entities.platform = "facebook";
      else if (/\bx\b|\btwitter\b/.test(lower)) entities.platform = "x";
      else if (/\btiktok\b/.test(lower)) entities.platform = "tiktok";
      else if (/\byoutube\b/.test(lower)) entities.platform = "youtube";
      else if (/\bweb(site)?\b/.test(lower)) entities.platform = "website";
      if (/\bfix|bug|issue|error|overflow|layout|scroll|visible|button|ui\b/.test(lower)) entities.goal = "fix";
      else if (/\bresearch|find|latest|rules|pricing|keyword|rank|google\b/.test(lower)) entities.goal = "research";
      else if (/\bwrite|generate|create|draft|copy|headline|cta\b/.test(lower)) entities.goal = "write";
      else if (/\bplan|roadmap|steps|checklist\b/.test(lower)) entities.goal = "plan";
      else if (/\bsummarize|summary|overview|insights\b/.test(lower)) entities.goal = "summarize";

      let intentHint: string | null = null;
      if (/\boverflow|visible|scroll|button|layout|ui\b/.test(lower)) intentHint = "UI bug";
      else if (/\bheadline|hook|cta|copy|emojis?|ad\b/.test(lower)) intentHint = "ad copy";
      else if (/\bkeywords?|rank|google|content|seo\b/.test(lower)) intentHint = "SEO";

      const words = cleaned.split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      const vaguePhrases = /^(help me|help|fix this|what now|make it better|do it|improve|traffic overview|status)$/i;
      const hasQuestionShape =
        /\?$/.test(cleaned) ||
        /\b(what|why|how|when|where|who|which|can|could|should|is|are|do|does|tell me|explain)\b/.test(lower);
      const followUpCue = /\b(step\s*\d+|more detail|more detailed|expand|continue|next|follow up|that|those|it|same|previous|above|earlier)\b/.test(
        lower
      );
      const hasSignal = Boolean(entities.goal || entities.category || entities.platform || intentHint);
      const tooShort = wordCount < 2;
      const missingSignals = !hasSignal && !hasQuestionShape && wordCount < 5;
      const isVague = vaguePhrases.test(lower) || tooShort || (missingSignals && !followUpCue);
      if (!isVague) return { cleaned, intentHint, entities, isVague: false };

      const clarifyingQuestion = intentHint === "SEO"
        ? "Quick question: should I focus on keyword research, ranking fixes, or content structure first?"
        : intentHint === "ad copy"
          ? "Quick question: is this for product ads, social captions, or email campaign copy?"
          : entities.goal === "fix"
            ? "Quick question: is this a UI layout issue, button behavior issue, or scroll/visibility issue?"
            : `Quick question: should I focus on ${sessionCtx.category} on ${sessionCtx.platform}, or another category/platform?`;
      const options =
        intentHint === "SEO"
          ? ["Keyword clusters", "Ranking quick wins", "Content rewrite", "Technical SEO checks"]
          : intentHint === "ad copy"
            ? ["5 ad headlines", "Short social captions", "Email ad copy", "CTA options"]
            : entities.goal === "fix"
              ? ["Fix overflow/layout", "Fix button visibility", "Fix scroll behavior", "Audit mobile UI"]
              : ["Status summary", "Traffic opportunities", "Compliance check", "Action plan"];
      return { cleaned, intentHint, entities, isVague: true, clarifyingQuestion, options };
    };
    const normalizedApiBase = normalizePublicBaseUrl(API_PUBLIC_BASE_URL);
    const isUploadsImageUrl =
      !imageUrl ||
      imageUrl.startsWith("/uploads/") ||
      (normalizedApiBase && imageUrl.startsWith(`${normalizedApiBase}/uploads/`));
    if (!isUploadsImageUrl) {
      res.status(400).json({ error: "For AI image analysis, image must come from uploads path only." });
      return;
    }
    const userMessage = rawMessage || message;
    const providerMessage = message || userMessage;
    const understanding = normalizeUserMessage(userMessage, sessionContext);
    const normalizedUserMessage = autoRewrite ? understanding.cleaned : userMessage;
    if (!userMessage) {
      res.status(400).json({ error: "message is required." });
      return;
    }
    try {
      const [siteMeta, published, emailSummary, analyticsSummary, latestTrafficPlan] = await Promise.all([
        siteStore.getMeta(),
        siteStore.getPublished(),
        emailStore.getAnalyticsSummary(),
        analyticsStore.summary(),
        trafficAiStore.getLatestPlan()
      ]);
      const lower = normalizedUserMessage.toLowerCase();
      const productTotal =
        published.products.forex.length +
        published.products.betting.length +
        published.products.software.length +
        published.products.social.length +
        (published.healthPage?.products.gadgets.length ?? 0) +
        (published.healthPage?.products.supplements.length ?? 0);
      const effectiveProducts = clientContext.productsCount > 0 ? clientContext.productsCount : productTotal;
      const effectiveSubscribers =
        clientContext.subscribersCount > 0 ? clientContext.subscribersCount : emailSummary.totals.subscribers;
      const effectiveEvents = clientContext.eventsCount > 0 ? clientContext.eventsCount : analyticsSummary.totalEvents;
      const compactContext = {
        sessionId: sessionId || "unknown",
        mode: clientContext.currentMode,
        activeSection: clientContext.activeSection || "marketing",
        products: effectiveProducts,
        subscribers: effectiveSubscribers,
        events: effectiveEvents,
        snapshotTime: clientContext.snapshotTime || new Date().toISOString(),
        siteUpdatedAt: siteMeta.updatedAt,
        hasDraft: siteMeta.hasDraft
      };
      const conversationHistoryBlock = historyMessages
        .map((item: HistoryMessage) => `${item.role.toUpperCase()}: ${item.content}`)
        .join("\n");
      const superSystemPrompt = [
        "You are the Admin assistant for this product website.",
        "Always answer specifically using the provided context and conversation history.",
        formattingMarkdown
          ? "Return markdown with clear headings, bullet points, and practical next steps."
          : "Return concise clear text with practical next steps."
      ].join(" ");
      const providerPrompt = [
        superSystemPrompt,
        "",
        `ClientContext: ${JSON.stringify(compactContext)}`,
        conversationHistoryBlock ? `ConversationHistory:\n${conversationHistoryBlock}` : "ConversationHistory: (none)",
        `CurrentUserMessage: ${autoRewrite ? normalizedUserMessage : providerMessage}`
      ].join("\n");

      try {
        const superReply = await callSuperModeChat({
          message: providerPrompt,
          imageUrl: imageUrl || undefined,
          context: {
            siteUpdatedAt: siteMeta.updatedAt,
            totalProducts: productTotal,
            subscribers: emailSummary.totals.subscribers,
            analyticsEvents: analyticsSummary.totalEvents,
            hasDraft: siteMeta.hasDraft
          }
        });
        if (superReply) {
          res.status(200).json({
            mode: "super",
            answer: superReply.answer,
            suggestions: [
              "Ask: convert this into a weekly action checklist",
              "Ask: search online sources to verify this plan"
            ],
            sources: []
          });
          return;
        }
      } catch (superError) {
        await aiControlStore.logAudit({
          action: "ai.super_mode_fallback",
          status: "denied",
          role: ((req as express.Request & { adminRole?: string }).adminRole ?? "unknown").toString(),
          authSource: (res.locals.authSource ?? "none").toString(),
          path: req.originalUrl,
          ip: req.ip ?? "",
          metadata: { reason: superError instanceof Error ? superError.message : "super mode failed" }
        });
      }

      let answer = "";
      const suggestions: string[] = [];
      let sources: Array<{ title: string; url: string; snippet: string; source: string }> = [];
      const isGreeting =
        /^(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(lower) ||
        /\bhow are you\b/i.test(lower) ||
        /\bwho are you\b/i.test(lower);
      const isEmailGenerationRequest =
        /\b(html email|email html|email template|generate email|campaign email|newsletter)\b/i.test(lower);
      const isCodeRequest =
        /\b(code|snippet|example code|write code|function|script|typescript|javascript|python|sql|css|html)\b/i.test(lower);
      const isClientEditRequest =
        /\b(add|edit|update|create|insert)\b.*\b(item|product|section|card|slider|client side|client page)\b/i.test(lower) ||
        /\b(client side)\b.*\b(add|edit|update)\b/i.test(lower);
      const isSearchPrompt =
        lower.includes("search online") || lower.includes("find online") || lower.includes("where to find") || lower.startsWith("search ");
      const isImageAdRequest =
        Boolean(imageUrl) &&
        (/\b(ad|advert|campaign|copy|message|caption|headline|cta|analy|analyze|analyse)\b/i.test(lower) || !userMessage.trim());
      const previousUserMessage =
        [...historyMessages]
          .reverse()
          .find((item) => item.role === "user" && item.content.toLowerCase() !== normalizedUserMessage.toLowerCase())?.content ?? "";
      const followsPreviousContext = /\b(that|those|it|same|previous|above|earlier|q1|follow up|step\s*\d+|now make|expand)\b/i.test(lower);
      if (understanding.isVague && !isGreeting && !followsPreviousContext) {
        const followUpQuestion =
          understanding.clarifyingQuestion ??
          "Quick question: should I focus on SEO opportunities, compliance, ad copy, or dashboard insights first?";
        res.status(200).json({
          mode: "read-only",
          answer: [
            "## Clarify First",
            `I understood you might mean: ${understanding.cleaned}`,
            "",
            followUpQuestion,
            "",
            `Current context: section=${clientContext.activeSection || "marketing"}, products=${effectiveProducts}, subscribers=${effectiveSubscribers}, events=${effectiveEvents}.`
          ].join("\n"),
          suggestions: (understanding.options ?? ["SEO for health supplements", "Paid traffic for betting section", "Quick wins for forex this week"]).slice(0, 5),
          sources: []
        });
        return;
      }

      const effectiveUserMessage =
        followsPreviousContext && previousUserMessage
          ? `${previousUserMessage}\nFollow-up instruction: ${normalizedUserMessage}`
          : normalizedUserMessage;

      type ChatIntent =
        | "CODING_HELP"
        | "AD_COPY"
        | "SEO_RESEARCH"
        | "COMPLIANCE"
        | "DASHBOARD_INSIGHTS"
        | "PRODUCT_POSITIONING"
        | "GENERAL_QA";
      const classifyIntent = (input: string): ChatIntent => {
        if (understanding.intentHint === "UI bug") return "CODING_HELP";
        if (understanding.intentHint === "ad copy") return "AD_COPY";
        if (understanding.intentHint === "SEO") return "SEO_RESEARCH";
        const text = input.toLowerCase();
        if (/\b(code|typescript|javascript|python|sql|bug|refactor|api route|function|compile|build|fix error)\b/.test(text)) return "CODING_HELP";
        if (/\b(ad copy|headline|cta|caption|campaign copy|creative|advert)\b/.test(text)) return "AD_COPY";
        if (/\b(seo|keyword|ranking|serp|search traffic|backlink|internal link)\b/.test(text)) return "SEO_RESEARCH";
        if (/\b(compliance|policy|affiliate|disclosure|rule|regulation|legal)\b/.test(text)) return "COMPLIANCE";
        if (/\b(status|dashboard|kpi|insight|what changed|summary|analytics|subscribers|events)\b/.test(text)) return "DASHBOARD_INSIGHTS";
        if (/\b(positioning|value proposition|persona|offer|differentiat|feature benefit|product angle)\b/.test(text)) return "PRODUCT_POSITIONING";
        return "GENERAL_QA";
      };
      const intent = classifyIntent(effectiveUserMessage);
      const followUpStepMatch = effectiveUserMessage.match(/\bstep\s*(\d+)\b/i);
      const followUpStep = followUpStepMatch ? Number.parseInt(followUpStepMatch[1] ?? "", 10) : Number.NaN;
      const isDetailedFollowUpRequest =
        followsPreviousContext &&
        /\b(more detail|more detailed|expand|break down|elaborate|deepen)\b/i.test(effectiveUserMessage);
      const adminRole = ((req as express.Request & { adminRole?: string }).adminRole ?? "viewer").toString();
      const roleCapabilities = listCapabilitiesForRole(
        (adminRole as "viewer" | "editor" | "publisher" | "owner") === "viewer" ||
          (adminRole as "viewer" | "editor" | "publisher" | "owner") === "editor" ||
          (adminRole as "viewer" | "editor" | "publisher" | "owner") === "publisher" ||
          (adminRole as "viewer" | "editor" | "publisher" | "owner") === "owner"
          ? (adminRole as "viewer" | "editor" | "publisher" | "owner")
          : "viewer"
      );
      const asksCurrentInfo = /\b(latest|most recent|today|rules|regulations?|pricing|price|updated|current)\b/i.test(
        effectiveUserMessage
      );
      const codingNeedsCurrentLibrary = /\b(latest|current|new|recent)\b.*\b(version|library|framework|package)\b/i.test(
        effectiveUserMessage
      );
      const shouldUseWebSearch =
        ((intent === "SEO_RESEARCH" || intent === "COMPLIANCE") && asksCurrentInfo) ||
        (asksCurrentInfo && intent !== "CODING_HELP") ||
        (intent === "CODING_HELP" && codingNeedsCurrentLibrary);
      const buildCuratedFallbackSources = (
        activeIntent: ChatIntent
      ): Array<{ title: string; url: string; snippet: string; source: string }> => {
        if (activeIntent === "COMPLIANCE") {
          return [
            {
              title: "FTC Endorsement Guides",
              url: "https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides",
              snippet: "Primary U.S. guidance for endorsements, testimonials, and material connection disclosures.",
              source: "curated-fallback"
            },
            {
              title: "FTC Advertising and Marketing Basics",
              url: "https://www.ftc.gov/business-guidance/advertising-marketing",
              snippet: "Core truth-in-advertising expectations and compliance references for marketers.",
              source: "curated-fallback"
            },
            {
              title: "FDA Dietary Supplements",
              url: "https://www.fda.gov/food/dietary-supplements",
              snippet: "Regulatory overview for supplements and health-claim boundaries in the U.S.",
              source: "curated-fallback"
            }
          ];
        }
        if (activeIntent === "SEO_RESEARCH") {
          return [
            {
              title: "Google Search Essentials",
              url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
              snippet: "Google guidance on helpful content and sustainable search visibility.",
              source: "curated-fallback"
            },
            {
              title: "Google SEO Starter Guide",
              url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
              snippet: "Baseline technical and content SEO practices from Google.",
              source: "curated-fallback"
            },
            {
              title: "Google Search Ranking Systems Guide",
              url: "https://developers.google.com/search/docs/appearance/ranking-systems-guide",
              snippet: "High-level overview of ranking systems to align SEO strategy with quality signals.",
              source: "curated-fallback"
            }
          ];
        }
        return [];
      };
      const collectedSources: Array<{ title: string; url: string; snippet: string; source: string }> = [];
      if (shouldUseWebSearch) {
        try {
          const results = await searchWeb(effectiveUserMessage);
          collectedSources.push(...results.slice(0, 5));
        } catch {
          // Keep response resilient; fallback to local context without failing chat.
        }
        if (collectedSources.length === 0) {
          collectedSources.push(...buildCuratedFallbackSources(intent).slice(0, 5));
        }
      }
      const sourceLines =
        collectedSources.length > 0
          ? ["", "### Sources", ...collectedSources.map((item, index) => `${index + 1}. ${item.title} - ${item.url}`)]
          : [];
      const ownerRules = [
        "## Owner Assistant",
        `- Role: ${adminRole}`,
        `- Mode: ${clientContext.currentMode}`,
        `- Session focus: ${sessionContext.category}/${sessionContext.platform} (${sessionContext.tone})`,
        `- Context counts: products ${effectiveProducts}, subscribers ${effectiveSubscribers}, events ${effectiveEvents}`
      ];
      const addAffiliateDisclaimer = /\b(ad|affiliate|campaign|offer|cta|promotion)\b/i.test(effectiveUserMessage);
      let routedAnswer = "";
      const routedSuggestions: string[] = [];

      switch (intent) {
        case "CODING_HELP":
          routedAnswer = [
            ...ownerRules,
            "",
            "### Action Plan",
            "- Identify the exact component/route to change.",
            "- Add minimal typed payload validation first.",
            "- Implement and run build/tests before deploy.",
            "",
            "### Recommended Next Step",
            "- Share the exact failing snippet or error line so I can provide a targeted patch."
          ].join("\n");
          routedSuggestions.push("Provide exact error and file path", "Refactor payload validator", "Generate patch for chat route");
          break;
        case "AD_COPY":
          routedAnswer = [
            ...ownerRules,
            "",
            "### Ad Copy Direction",
            `- Category: ${sessionContext.category}`,
            `- Platform: ${sessionContext.platform}`,
            `- Tone: ${sessionContext.tone}`,
            "- Lead with one clear user benefit and one proof point.",
            "- Use one CTA only to reduce friction."
          ].join("\n");
          routedSuggestions.push("Generate 5 headlines", "Generate 3 CTA variants", "Create short social caption set");
          break;
        case "SEO_RESEARCH":
          routedAnswer = [
            ...ownerRules,
            "",
            "### SEO Research",
            "- Prioritize high-intent transactional terms by section.",
            "- Expand weakest-content sections first.",
            "- Improve internal linking from strong pages to weak pages.",
            ...(collectedSources.length === 0 && asksCurrentInfo
              ? ["", "- Note: no live sources found now; retry with narrower query."]
              : [])
          ].join("\n");
          routedSuggestions.push("Cluster keywords by section", "Top 10 quick SEO wins", "Internal link map");
          break;
        case "COMPLIANCE":
          routedAnswer = [
            ...ownerRules,
            "",
            "### Compliance Review",
            "- Validate affiliate disclosure placement near CTA.",
            "- Remove absolute/guaranteed claims.",
            "- Keep substantiation-ready language for sensitive categories.",
            ...(collectedSources.length === 0 && asksCurrentInfo
              ? ["", "- Note: live rules lookup returned no sources; narrow by country + category."]
              : [])
          ].join("\n");
          routedSuggestions.push("Draft compliant disclosure", "Audit risky claims", "Check latest policy updates");
          break;
        case "DASHBOARD_INSIGHTS":
          routedAnswer = [
            ...ownerRules,
            "",
            "### Dashboard Insights",
            "- Identify lowest-performing section by product count.",
            "- Compare subscriber trend with recent campaign output.",
            "- Focus next actions on one section for measurable gains."
          ].join("\n");
          routedSuggestions.push("Weakest section breakdown", "7-day priority plan", "Traffic opportunity summary");
          break;
        case "PRODUCT_POSITIONING":
          routedAnswer = [
            ...ownerRules,
            "",
            "### Product Positioning",
            `- Position around ${sessionContext.category} buyer intent.`,
            "- Translate features into outcomes and proof.",
            "- Differentiate against generic alternatives with one strong angle."
          ].join("\n");
          routedSuggestions.push("Value proposition draft", "Persona-fit messaging", "Feature-to-benefit rewrite");
          break;
        default:
          if (isDetailedFollowUpRequest) {
            const stepLabel = Number.isFinite(followUpStep) ? `Step ${followUpStep}` : "the requested step";
            routedAnswer = [
              ...ownerRules,
              "",
              "### Follow-up Expansion",
              `- Expanding ${stepLabel} for ${sessionContext.category} on ${sessionContext.platform}.`,
              "- Objective: turn this step into a measurable execution block this week.",
              "",
              "#### Execution Breakdown",
              "1. Define one target metric and baseline (for example CTR, CVR, or sign-up rate).",
              "2. Build 2 focused variants (headline/CTA/layout) and keep one variable per variant.",
              "3. Run a short test window and collect enough signal before deciding a winner.",
              "4. Roll out winner and document learnings for the next iteration.",
              "",
              "#### Owner Checklist",
              "- Assign owner + deadline for each task.",
              "- Add pass/fail threshold before launch.",
              "- Schedule a quick review after initial results."
            ].join("\n");
            routedSuggestions.push("Turn this into a 7-day task list", "Add KPI targets per task", "Draft implementation brief for editor");
          } else {
            routedAnswer = [
              ...ownerRules,
              "",
              "### Direct Answer",
              "- I can provide a concise, actionable plan based on your current context.",
              "- If you want deeper output, specify section + platform + target outcome."
            ].join("\n");
            routedSuggestions.push("Summarize next actions", "Focus on one section", "Ask for checklist output");
          }
          break;
      }

      if (addAffiliateDisclaimer) {
        routedAnswer = `${routedAnswer}\n\n### Compliance Disclaimer\nAffiliate disclosure: we may earn a commission from qualifying purchases.`;
      }
      if (sourceLines.length > 0) {
        routedAnswer = `${routedAnswer}\n${sourceLines.join("\n")}`;
      }
      res.status(200).json({
        mode: "read-only",
        intent,
        answer: routedAnswer,
        suggestions: routedSuggestions.slice(0, 4),
        sources: collectedSources,
        capabilities: roleCapabilities
      });
      return;
      if (isGreeting) {
        answer = [
          "## Hello",
          "I am your admin AI copilot for this website.",
          "",
          `Current snapshot: products ${effectiveProducts}, subscribers ${effectiveSubscribers}, events ${effectiveEvents}.`,
          `Active section focus: ${clientContext.activeSection || "marketing"}.`,
          "",
          "If you want, ask me one of these now:",
          "1. What changed on my site today?",
          "2. Give me top 5 SEO opportunities this week",
          "3. Check compliance risks on health products",
          "4. Build a step-by-step growth action plan"
        ].join("\n");
        suggestions.push("Ask: what changed on my site today?");
        suggestions.push("Ask: top 5 SEO opportunities this week");
      } else if (isImageAdRequest) {
        const imageHint = decodeURIComponent(imageUrl.split("/").pop() ?? "uploaded-image")
          .replace(/\.[a-z0-9]+$/i, "")
          .replace(/[-_]+/g, " ")
          .trim();
        answer = [
          "## Image-Based Ad Copy Pack",
          `Image reference: ${imageHint || "uploaded visual asset"}`,
          "",
          "### Primary angle",
          `Position this visual as a high-impact solution focused on clarity, trust, and a direct user benefit.`,
          "",
          "### Headlines",
          `- Discover the smarter way with ${imageHint || "this featured product"}`,
          "- Built for performance, designed for confidence",
          "- Upgrade your results with one clear next step",
          "",
          "### Body copy",
          `This visual supports a premium campaign message: highlight the core benefit, show social proof, and keep one clear CTA. Use concise value language and avoid unverified claims.`,
          "",
          "### CTA options",
          "- Get Started",
          "- See How It Works",
          "- Claim Your Offer",
          "",
          "### Compliance line",
          "Affiliate disclosure: we may earn a commission from qualifying purchases."
        ].join("\n");
        suggestions.push("Ask: generate 5 short social captions from this image");
        suggestions.push("Ask: generate HTML ad email from this image");
      } else if (isEmailGenerationRequest) {
        const objective = userMessage.replace(/\b(generate|create|make)\b/gi, "").trim() || "promote featured products";
        const emailHtml = [
          "<!doctype html>",
          '<html lang="en">',
          "  <head>",
          '    <meta charset="utf-8" />',
          '    <meta name="viewport" content="width=device-width,initial-scale=1" />',
          "    <title>Campaign Email</title>",
          "  </head>",
          '  <body style="margin:0;padding:0;background:#0f172a;color:#e2e8f0;font-family:Arial,sans-serif;">',
          '    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:24px 0;">',
          "      <tr>",
          '        <td align="center">',
          '          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#111827;border:1px solid #334155;border-radius:14px;overflow:hidden;">',
          "            <tr>",
          '              <td style="padding:24px;">',
          '                <h1 style="margin:0 0 12px;font-size:24px;color:#ffffff;">New Highlights This Week</h1>',
          `                <p style="margin:0 0 16px;line-height:1.6;color:#cbd5e1;">${objective}</p>`,
          '                <p style="margin:0 0 16px;line-height:1.6;color:#cbd5e1;">Explore our latest picks curated for performance and value.</p>',
          '                <a href="https://bahema.github.io/wokerman/" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;">View Picks</a>',
          '                <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;">Affiliate disclosure: we may earn a commission from qualifying purchases.</p>',
          "              </td>",
          "            </tr>",
          "          </table>",
          "        </td>",
          "      </tr>",
          "    </table>",
          "  </body>",
          "</html>"
        ].join("\n");
        answer = [
          "## HTML Email Draft",
          "Generated a reusable campaign HTML draft below.",
          "",
          "```html",
          emailHtml,
          "```"
        ].join("\n");
        suggestions.push("Ask: generate a plain-text version");
        suggestions.push("Ask: rewrite with urgent tone");
      } else if (isCodeRequest) {
        answer = [
          "## Code Example",
          "Here is a practical TypeScript helper you can reuse for product add/update flows:",
          "",
          "```ts",
          "type ProductInput = { title: string; shortDescription: string; checkoutLink: string; imageUrl?: string };",
          "type Product = ProductInput & { id: string; updatedAt: string };",
          "",
          "export const upsertProduct = (items: Product[], input: ProductInput): Product[] => {",
          "  const normalizedTitle = input.title.trim().toLowerCase();",
          "  const nowIso = new Date().toISOString();",
          "  const existing = items.find((item) => item.title.trim().toLowerCase() === normalizedTitle);",
          "  if (existing) {",
          "    return items.map((item) =>",
          "      item.id === existing.id ? { ...item, ...input, updatedAt: nowIso } : item",
          "    );",
          "  }",
          "  const next: Product = { id: `p-${Date.now()}`, updatedAt: nowIso, ...input };",
          "  return [next, ...items];",
          "};",
          "```"
        ].join("\n");
        suggestions.push("Ask: convert this to backend route code");
        suggestions.push("Ask: add validation and duplicate checks");
      } else if (isClientEditRequest) {
        answer = [
          "## Client-Side Edit/Add Plan",
          "I can guide and prepare these actions safely:",
          "",
          "1. Identify target section (forex, betting, software, social, gadgets, supplements, upcoming).",
          "2. Prepare item payload (title, descriptions, image, link, compliance warning).",
          "3. Run duplicate checks (title/link/image) before insert.",
          "4. Save draft, then publish after review.",
          "",
          "Use the **Ads/Product Tool** in AI panel to prepare and execute the item safely with approval phrase."
        ].join("\n");
        suggestions.push("Ask: prepare add product to gadgets");
        suggestions.push("Ask: prepare edit item in supplements");
      } else if (isSearchPrompt) {
        const query = effectiveUserMessage
          .replace(/search online/gi, "")
          .replace(/find online/gi, "")
          .replace(/where to find/gi, "")
          .replace(/^search\s+/i, "")
          .trim();
        if (!query) {
          answer = "Provide a search query, for example: search online affiliate disclosure rules for supplements.";
        } else {
          try {
            const results = await searchWeb(query);
            if (!results.length) {
              answer = `No online results found for "${query}". Try a broader phrase.`;
            } else {
              const lines = results.slice(0, 5).map((item, index) => `${index + 1}. ${item.title} - ${item.url}`);
              sources = results.slice(0, 5);
              answer = `I found these online sources for "${query}":\n${lines.join("\n")}`;
              suggestions.push("Ask: summarize result 1");
              suggestions.push("Ask: prepare action plan from these links");
            }
          } catch (error) {
            const errorMessage = (error as { message?: string } | null)?.message ?? "Unknown error.";
            answer = `Online search failed for "${query}". ${errorMessage}`;
          }
        }
      } else if (/\b(qa audit|content audit|compliance audit|policy audit|affiliate audit)\b/i.test(lower)) {
        const sections = [
          ...published.products.forex,
          ...published.products.betting,
          ...published.products.software,
          ...published.products.social,
          ...(published.healthPage?.products.gadgets ?? []),
          ...(published.healthPage?.products.supplements ?? [])
        ];
        const missingDisclosure = sections.filter(
          (item) => {
            const maybeWarnings = (item as unknown as { complianceWarnings?: string[] }).complianceWarnings ?? [];
            return !hasAffiliateDisclosureSignal(maybeWarnings, item.shortDescription ?? "", item.longDescription ?? "");
          }
        );
        const riskyClaims = sections.filter((item) =>
          hasHealthRiskClaims(`${item.title} ${item.shortDescription ?? ""} ${item.longDescription ?? ""}`)
        );
        const duplicateTitleCount =
          sections.length -
          new Set(sections.map((item) => normalizeForCompare(item.title ?? ""))).size;

        answer = [
          "## QA / Compliance Audit",
          `- Total products scanned: ${sections.length}`,
          `- Missing affiliate disclosure signals: ${missingDisclosure.length}`,
          `- Risky claim signals: ${riskyClaims.length}`,
          `- Possible duplicate titles: ${duplicateTitleCount}`,
          "",
          "### Priority actions",
          "1. Add explicit affiliate disclosure text to missing products.",
          "2. Remove or rewrite risky health/guarantee language.",
          "3. Resolve duplicate titles to avoid confusion and SEO overlap."
        ].join("\n");
        suggestions.push("Ask: list top 10 products missing disclosure");
        suggestions.push("Ask: generate safe rewrite for risky products");
      } else if (/\b(seo audit|seo report|keyword audit|ranking|internal links|schema)\b/i.test(lower)) {
        const bySection = {
          forex: published.products.forex.length,
          betting: published.products.betting.length,
          software: published.products.software.length,
          social: published.products.social.length,
          gadgets: published.healthPage?.products.gadgets.length ?? 0,
          supplements: published.healthPage?.products.supplements.length ?? 0,
          upcoming: published.healthPage?.upcoming.items.length ?? 0
        };
        const weakSections = Object.entries(bySection)
          .sort((a, b) => a[1] - b[1])
          .slice(0, 3)
          .map(([name, count]) => `${name} (${count})`);
        answer = [
          "## SEO Audit",
          `- Products indexed in content model: ${Object.values(bySection).reduce((a, b) => a + b, 0)}`,
          `- Lowest-content sections: ${weakSections.join(", ")}`,
          latestTrafficPlan
            ? `- Latest traffic plan: ${latestTrafficPlan.summary.opportunities} opportunities (avg score ${latestTrafficPlan.summary.avgCompositeScore})`
            : "- Latest traffic plan: not generated yet",
          "",
          "### Recommended SEO actions",
          "1. Expand weak sections with 3-5 high-intent product pages each.",
          "2. Strengthen internal linking between related sections.",
          "3. Improve title/meta uniqueness and affiliate disclosure consistency."
        ].join("\n");
        suggestions.push("Ask: generate 7-day SEO action checklist");
        suggestions.push("Ask: build internal-link plan by section");
      } else if (/\b(playbook|execution plan|weekly plan|action plan)\b/i.test(lower)) {
        const weakestSections = Object.entries({
          forex: published.products.forex.length,
          betting: published.products.betting.length,
          software: published.products.software.length,
          social: published.products.social.length,
          gadgets: published.healthPage?.products.gadgets.length ?? 0,
          supplements: published.healthPage?.products.supplements.length ?? 0
        })
          .sort((a, b) => a[1] - b[1])
          .slice(0, 2)
          .map(([name]) => name);
        answer = [
          "## 7-Day Growth Playbook",
          "### Day 1",
          "- Run QA/compliance audit and fix high-risk claims.",
          "### Day 2",
          `- Add 2 products to weakest sections: ${weakestSections.join(", ")}.`,
          "### Day 3",
          "- Publish one SEO-focused comparison article with affiliate disclosure.",
          "### Day 4",
          "- Generate and schedule one HTML campaign per top section.",
          "### Day 5",
          "- Review analytics events and optimize lowest-performing CTA.",
          "### Day 6",
          "- Expand internal linking across top 3 converting pages.",
          "### Day 7",
          "- Generate weekly report and lock next-week priorities."
        ].join("\n");
        suggestions.push("Ask: generate day-by-day task checklist");
        suggestions.push("Ask: prepare products for day 2");
      } else if (lower.includes("what happened") || lower.includes("status") || lower.includes("summary")) {
        answer = `Site updated at ${siteMeta.updatedAt}. Total products: ${effectiveProducts}. Subscribers: ${effectiveSubscribers} (confirmed ${emailSummary.totals.confirmed}). Total analytics events: ${effectiveEvents}. Active section: ${clientContext.activeSection || "marketing"}.`;
        suggestions.push("Ask: show weakest section by product count");
        suggestions.push("Ask: traffic opportunities overview");
      } else if (lower.includes("expire") || lower.includes("expir")) {
        const staleCampaigns = emailSummary.recentCampaigns.filter((item) => {
          const updatedMs = Date.parse(item.updatedAt);
          if (!Number.isFinite(updatedMs)) return false;
          return Date.now() - updatedMs > 14 * 24 * 60 * 60 * 1000;
        }).length;
        answer = `No hard expiry registry exists yet. Current proxy signals: stale campaigns older than 14 days = ${staleCampaigns}.`;
        suggestions.push("Next step: add explicit expiry fields for products and links");
      } else if (lower.includes("traffic") || lower.includes("seo")) {
        if (latestTrafficPlan) {
          answer = `Latest local Traffic AI plan generated at ${latestTrafficPlan.createdAt} with ${latestTrafficPlan.summary.opportunities} opportunities (avg score ${latestTrafficPlan.summary.avgCompositeScore}).`;
          suggestions.push("Ask: show top 3 transactional opportunities");
        } else {
          answer = "No traffic plan generated yet. Open Traffic AI page and click Generate Weekly Plan.";
        }
      } else if (lower.includes("add product") || lower.includes("send email") || lower.includes("publish")) {
        answer =
          "Action execution is disabled in Phase 1 (read-only). I can prepare recommended steps, but I will not write/publish/send automatically yet.";
        suggestions.push("Ask: prepare add-product checklist");
        suggestions.push("Ask: prepare email campaign draft plan");
      } else if (/^(what is|who is|how to|why|when|where)\b/i.test(lower) || lower.endsWith("?")) {
        try {
          const results = await searchWeb(effectiveUserMessage);
          if (results.length > 0) {
            sources = results.slice(0, 5);
            const top = sources.slice(0, 3);
            answer = [
              "## Global Answer",
              top[0]?.snippet || `Here is what I found about "${effectiveUserMessage}":`,
              "",
              "### Quick points",
              ...top.map((item, index) => `- ${index + 1}. ${item.title}`),
              "",
              "### Sources",
              ...sources.map((item, index) => `${index + 1}. ${item.title} - ${item.url}`)
            ].join("\n");
            suggestions.push("Ask: explain this in simple terms");
            suggestions.push("Ask: compare the top 2 sources");
          } else {
            answer = `I could not find strong web sources for "${effectiveUserMessage}" right now. Try rephrasing with more detail.`;
            suggestions.push("Ask: search online <topic> latest");
          }
        } catch (error) {
          const errorMessage = (error as { message?: string } | null)?.message ?? "Unknown error.";
          answer = `I could not fetch global sources right now. ${errorMessage}`;
          suggestions.push("Ask: try again with a shorter question");
        }
      } else {
        try {
          const results = await searchWeb(effectiveUserMessage);
          if (results.length > 0) {
            sources = results.slice(0, 5);
            const top = sources.slice(0, 3);
            answer = [
              "## Detailed Answer",
              top[0]?.snippet || `Here is what I found for "${effectiveUserMessage}":`,
              "",
              "### Key points",
              ...top.map((item, index) => `- ${index + 1}. ${item.title}`),
              "",
              "### Sources",
              ...sources.map((item, index) => `${index + 1}. ${item.title} - ${item.url}`)
            ].join("\n");
            suggestions.push("Ask: explain this in simple words");
            suggestions.push("Ask: compare source 1 and source 2");
          } else {
            answer = [
              "I could not find enough external sources for that exact prompt yet.",
              "Try rephrasing with more context, for example:",
              `- "Explain ${effectiveUserMessage} with examples"`,
              `- "Latest best practices for ${effectiveUserMessage}"`
            ].join("\n");
            suggestions.push("Ask: explain with examples");
            suggestions.push("Ask: latest best practices");
          }
        } catch (error) {
          const errorMessage = (error as { message?: string } | null)?.message ?? "Unknown error.";
          answer = `I could not fetch external sources right now. ${errorMessage}`;
          suggestions.push("Ask: try again");
          suggestions.push("Ask: summarize from local context");
        }
      }

      res.status(200).json({
        mode: "read-only",
        answer,
        suggestions,
        sources
      });
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to process AI chat request.") });
    }
    }
  );

  app.post(
    "/api/ai/control/web-search",
    requireAdminAuth,
    aiWebSearchIpLimiter,
    requireAiCapability("ai.web.search"),
    requireCsrfForCookieAuth,
    auditAdminAction("ai_control.web_search"),
    async (req, res) => {
    const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
    if (!query) {
      res.status(400).json({ error: "query is required." });
      return;
    }
    if (query.length > AI_WEB_SEARCH_MAX_QUERY_CHARS) {
      res.status(400).json({ error: `query is too long (max ${AI_WEB_SEARCH_MAX_QUERY_CHARS} chars).` });
      return;
    }
    try {
      const results = await searchWeb(query);
      res.status(200).json({ query, results });
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Web search failed.") });
    }
    }
  );

  app.post(
    "/api/ai/control/email/generate",
    requireAdminAuth,
    requireAiCapability("ai.action.prepare"),
    requireCsrfForCookieAuth,
    auditAdminAction("ai_control.email_generate"),
    async (req, res) => {
      const payload = typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};
      const objective = typeof payload.objective === "string" ? payload.objective.trim() : "";
      const sectionRaw = typeof payload.section === "string" ? payload.section.trim().toLowerCase() : "health";
      const language = normalizeLanguage(typeof payload.language === "string" ? payload.language : "en");
      const tone = toneLabel(typeof payload.tone === "string" ? payload.tone : "professional");
      const includeEmojis = payload.includeEmojis === true;
      const saveDraft = payload.saveDraft !== false;

      if (!objective) {
        res.status(400).json({ error: "objective is required." });
        return;
      }

      try {
        const published = await siteStore.getPublished();
        const sectionMap: Record<string, { title: string; products: Array<{ title: string; shortDescription: string; checkoutLink: string }> }> = {
          forex: { title: "Forex", products: published.products.forex },
          betting: { title: "Betting", products: published.products.betting },
          software: { title: "Software", products: published.products.software },
          social: { title: "Social", products: published.products.social },
          gadgets: { title: "Health Gadgets", products: published.healthPage?.products.gadgets ?? [] },
          supplements: { title: "Health Supplements", products: published.healthPage?.products.supplements ?? [] },
          health: {
            title: "Health",
            products: [...(published.healthPage?.products.gadgets ?? []), ...(published.healthPage?.products.supplements ?? [])]
          },
          upcoming: {
            title: "Upcoming",
            products: (published.healthPage?.upcoming.items ?? []).map((item) => ({
              title: item.title,
              shortDescription: item.shortDescription,
              checkoutLink: "#"
            }))
          }
        };
        const selectedSection = sectionMap[sectionRaw] ? sectionRaw : "health";
        const selected = sectionMap[selectedSection];
        const featured = selected.products.slice(0, 3);
        const bullets =
          featured.length > 0
            ? featured.map((item) => `${item.title}: ${item.shortDescription}`)
            : [`New curated ${selected.title.toLowerCase()} offers are now available.`];
        const firstLink = featured.find((item) => /^https?:\/\//i.test(item.checkoutLink))?.checkoutLink ?? "https://example.com";
        const affiliateDisclosure =
          published.homeUi?.productCardAffiliateDisclosure?.trim() ||
          "Affiliate disclosure: we may earn a commission if you buy through our links.";

        const emoji = includeEmojis ? `${toEmoji(selectedSection)} ` : "";
        const subject = `${emoji}[${selected.title}] ${objective.slice(0, 70)}`;
        const previewText = `${languageLabel(language)} ${tone} update: ${objective.slice(0, 110)}`;
        const headline = `${emoji}${selected.title} Picks: ${objective}`;
        const intro = `This is a ${tone} ${languageLabel(language).toLowerCase()} campaign draft prepared by AI for ${selected.title}.`;
        const ctaLabel = selectedSection === "upcoming" ? "Notify Me" : "Explore Offers";
        const emojiBullets = includeEmojis ? bullets.map((item) => `${toEmoji(selectedSection)} ${item}`) : bullets;
        const bodyHtml = buildAiEmailHtml({
          headline,
          intro,
          ctaLabel,
          ctaUrl: firstLink,
          productBullets: emojiBullets,
          disclaimer: affiliateDisclosure,
          language
        });
        const bodyRich = buildAiEmailRich({
          headline,
          intro,
          ctaLabel,
          ctaUrl: firstLink,
          productBullets: emojiBullets,
          disclaimer: affiliateDisclosure
        });

        let campaign: Awaited<ReturnType<typeof emailStore.saveCampaign>> | null = null;
        if (saveDraft) {
          campaign = await emailStore.saveCampaign({
            name: `AI ${selected.title} ${new Date().toISOString().slice(0, 10)}`,
            subject,
            previewText,
            bodyMode: EMAIL_CAMPAIGN_BODY_MODE.html,
            bodyRich,
            bodyHtml,
            audienceMode: EMAIL_CAMPAIGN_AUDIENCE_MODE.all,
            segments: [],
            exclusions: [],
            sendMode: EMAIL_CAMPAIGN_SEND_MODE.now,
            scheduleAt: null,
            timezone: "UTC",
            status: EMAIL_CAMPAIGN_STATUS.draft,
            estimatedRecipients: 0
          });
          await emailStore.addEvent({
            eventType: EMAIL_EVENT_TYPES.campaignSaved,
            campaignId: campaign.id,
            meta: { source: "ai_control.email_generate", section: selectedSection, language, tone, objective, includeEmojis }
          });
        }

        res.status(200).json({
          ok: true,
          mode: "email_generate",
          language,
          tone,
          includeEmojis,
          section: selectedSection,
          campaignId: campaign?.id ?? null,
          draftSaved: Boolean(campaign),
          email: {
            subject,
            previewText,
            bodyHtml,
            bodyRich
          }
        });
      } catch (error) {
        res.status(500).json({ error: safeServerErrorMessage(error, "Failed to generate AI email draft.") });
      }
    }
  );

  app.post(
    "/api/ai/control/export",
    requireAdminAuth,
    requireAiCapability("ai.action.prepare"),
    requireCsrfForCookieAuth,
    auditAdminAction("ai_control.export_generate"),
    async (req, res) => {
      const payload = typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};
      const question = typeof payload.question === "string" ? payload.question.trim() : "";
      const formatRaw = typeof payload.format === "string" ? payload.format.trim().toLowerCase() : "pdf";
      const format = formatRaw === "doc" || formatRaw === "excel" || formatRaw === "pdf" ? formatRaw : "pdf";
      if (!question) {
        res.status(400).json({ error: "question is required." });
        return;
      }

      try {
        const [published, emailSummary, analyticsSummary] = await Promise.all([
          siteStore.getPublished(),
          emailStore.getAnalyticsSummary(),
          analyticsStore.summary()
        ]);
        const lines = toExportLines({
          question,
          generatedAt: new Date().toISOString(),
          site: {
            products:
              published.products.forex.length +
              published.products.betting.length +
              published.products.software.length +
              published.products.social.length +
              (published.healthPage?.products.gadgets.length ?? 0) +
              (published.healthPage?.products.supplements.length ?? 0),
            industries: published.industries.length,
            subscribers: emailSummary.totals.subscribers,
            events: analyticsSummary.totalEvents
          },
          suggestions: [
            "Prioritize sections with low product count but high intent.",
            "Keep affiliate disclosures visible near CTA buttons.",
            "Run weekly email campaigns with localized offers.",
            "Track click outcomes and rotate low-performing creatives."
          ]
        });

        const slug = sanitizeFileSlug(question);
        const baseName = `${Date.now()}-${slug}`;
        let buffer: Buffer;
        let ext = "";
        let mime = "";
        if (format === "pdf") {
          buffer = buildSimplePdf(lines);
          ext = ".pdf";
          mime = "application/pdf";
        } else if (format === "doc") {
          buffer = Buffer.from(buildDocHtml("AI Export Report", lines), "utf8");
          ext = ".doc";
          mime = "application/msword";
        } else {
          buffer = Buffer.from(buildExcelHtml("AI Export Report", lines), "utf8");
          ext = ".xls";
          mime = "application/vnd.ms-excel";
        }

        const fileName = `${baseName}${ext}`;
        const fullPath = path.join(mediaStore.uploadsDir, fileName);
        await fs.writeFile(fullPath, buffer);
        const url = `${API_PUBLIC_BASE_URL}/uploads/${fileName}`;
        await mediaStore.add({
          name: `AI Export ${format.toUpperCase()} - ${question.slice(0, 80)}`,
          fileName,
          url,
          mime,
          sizeBytes: buffer.byteLength
        });

        res.status(200).json({
          ok: true,
          mode: "export_generate",
          format,
          fileName,
          url,
          sizeBytes: buffer.byteLength
        });
      } catch (error) {
        res.status(500).json({ error: safeServerErrorMessage(error, "Failed to generate export file.") });
      }
    }
  );

  app.post(
    "/api/ai/control/prepare-action",
    requireAdminAuth,
    adminMutationIpLimiter,
    requireAiCapability("ai.action.prepare"),
    requireCsrfForCookieAuth,
    auditAdminAction("ai_control.prepare_action"),
    async (req, res) => {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const imageUrlRaw = typeof req.body?.imageUrl === "string" ? req.body.imageUrl.trim() : "";
    if (!message) {
      res.status(400).json({ error: "message is required." });
      return;
    }

    const lower = message.toLowerCase();
    const section =
      lower.includes("upcoming")
        ? "upcoming"
        : lower.includes("supplement")
          ? "supplements"
          : lower.includes("gadget")
            ? "gadgets"
            : lower.includes("forex")
              ? "forex"
              : lower.includes("betting")
                ? "betting"
                : lower.includes("software")
                  ? "software"
                  : lower.includes("social")
                    ? "social"
                    : "gadgets";
    const targetPath =
      section === "supplements" || section === "gadgets" || section === "upcoming"
        ? "/health"
        : `/${section}`;

    const safeImageUrl =
      imageUrlRaw && imageUrlRaw.includes("/uploads/") && imageUrlRaw.startsWith("http") ? imageUrlRaw : "";
    const titleBase =
      section === "upcoming"
        ? "Upcoming Health Product"
        : section === "supplements"
        ? "Smart Wellness Supplement"
        : section === "gadgets"
          ? "Smart Health Gadget"
          : section === "forex"
            ? "Forex Strategy Toolkit"
            : section === "betting"
              ? "Betting Insight Engine"
              : section === "software"
                ? "Workflow Automation Suite"
                : "Social Growth Automation";

    const suggestedTitle = `${titleBase} Pro`;
    const productDraft = {
      title: suggestedTitle,
      shortDescription: `AI-prepared draft for ${section} section based on your command.`,
      longDescription:
        "This draft is generated in prepare-only mode. Review product claims, add clear affiliate disclosure, and verify all benefits before publishing.",
      features: ["Clear value proposition", "Compliance-ready copy scaffold", "Conversion-focused CTA placeholder"],
      rating: 4.6,
      isNew: true,
      imageUrl: safeImageUrl,
      checkoutLink: "https://example.com/product-link",
      complianceWarnings: [
        "Add visible affiliate disclosure near CTA.",
        "Avoid guaranteed outcomes/earnings or unverified health claims.",
        "Confirm product source and pricing before publish."
      ]
    };

    const approval = await aiControlStore.createApproval({
      actionType: "add_product",
      targetSection: section,
      payloadHash: hashAiPayload({ target: { section, path: targetPath }, productDraft })
    });
    await aiControlStore.logAudit({
      action: "ai.action.prepare",
      status: "allowed",
      role: ((req as express.Request & { adminRole?: string }).adminRole ?? "viewer") as string,
      authSource: ((req as express.Request & { authSource?: string }).authSource ?? "unknown") as string,
      path: req.originalUrl,
      ip: resolveRequestIp(req),
      metadata: { section, approvalId: approval.id }
    });

    res.status(200).json({
      mode: "preview-only",
      actionType: "add_product",
      executeAvailable: true,
      confirmationRequired: true,
      target: { section, path: targetPath },
      productDraft,
      approval: {
        id: approval.id,
        confirmPhrase: approval.confirmPhrase,
        expiresAt: approval.expiresAt
      },
      nextStep:
        "Draft prepared. You can execute this target section by using exact approval phrase before expiry."
    });
    }
  );

  app.post(
    "/api/ai/control/execute-action",
    requireAdminAuth,
    adminMutationIpLimiter,
    requireAiCapability("ai.action.execute"),
    requireCsrfForCookieAuth,
    auditAdminAction("ai_control.execute_add_product"),
    async (req, res) => {
      const payload = typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};
      const confirmText = typeof payload.confirmText === "string" ? payload.confirmText.trim() : "";
      const approvalId = typeof payload.approvalId === "string" ? payload.approvalId.trim() : "";
      const target = typeof payload.target === "object" && payload.target !== null ? (payload.target as Record<string, unknown>) : {};
      const draft =
        typeof payload.productDraft === "object" && payload.productDraft !== null
          ? (payload.productDraft as Record<string, unknown>)
          : {};

      const section = typeof target.section === "string" ? target.section.trim().toLowerCase() : "";
      const allowedSections = new Set(["forex", "betting", "software", "social", "gadgets", "supplements", "upcoming"]);
      if (!allowedSections.has(section)) {
        res.status(400).json({ error: "Invalid target section." });
        return;
      }

      const title = typeof draft.title === "string" ? draft.title.trim() : "";
      const shortDescription = typeof draft.shortDescription === "string" ? draft.shortDescription.trim() : "";
      const longDescription = typeof draft.longDescription === "string" ? draft.longDescription.trim() : "";
      const imageUrl = typeof draft.imageUrl === "string" ? draft.imageUrl.trim() : "";
      const checkoutLink = typeof draft.checkoutLink === "string" ? draft.checkoutLink.trim() : "";
      const features =
        Array.isArray(draft.features) && draft.features.length
          ? draft.features.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
          : [];
      const ratingRaw = Number(draft.rating ?? 4.6);
      const rating = Number.isFinite(ratingRaw) ? Math.min(5, Math.max(1, ratingRaw)) : 4.6;
      const isNew = draft.isNew !== false;
      const complianceWarnings =
        Array.isArray(draft.complianceWarnings) && draft.complianceWarnings.length
          ? draft.complianceWarnings.map((item) => String(item).trim()).filter(Boolean)
          : [];

      if (!title || !shortDescription || !longDescription) {
        res.status(400).json({ error: "title, shortDescription, and longDescription are required." });
        return;
      }
      if (!checkoutLink || !/^https?:\/\//i.test(checkoutLink)) {
        res.status(400).json({ error: "checkoutLink must be a valid http(s) URL." });
        return;
      }
      if (section !== "upcoming" && !features.length) {
        res.status(400).json({ error: "At least one feature is required." });
        return;
      }
      if (imageUrl && !imageUrl.includes("/uploads/")) {
        res.status(400).json({ error: "For now, imageUrl must come from uploads path." });
        return;
      }

      const preparedPayloadHash = hashAiPayload({
        target: { section, path: typeof target.path === "string" ? target.path : "" },
        productDraft: {
          title,
          shortDescription,
          longDescription,
          features,
          rating,
          isNew,
          imageUrl,
          checkoutLink,
          complianceWarnings
        }
      });
      const approvalCheck = await aiControlStore.verifyAndConsumeApproval({
        approvalId,
        confirmText,
        payloadHash: preparedPayloadHash
      });
      if (!approvalCheck.ok) {
        await aiControlStore.logAudit({
          action: "ai.action.execute",
          status: "denied",
          role: ((req as express.Request & { adminRole?: string }).adminRole ?? "viewer") as string,
          authSource: ((req as express.Request & { authSource?: string }).authSource ?? "unknown") as string,
          path: req.originalUrl,
          ip: resolveRequestIp(req),
          metadata: { reason: approvalCheck.error, approvalId }
        });
        res.status(400).json({ error: approvalCheck.error });
        return;
      }

      try {
        const published = await siteStore.getPublished();
        const globalDisclosure = (published.homeUi?.productCardAffiliateDisclosure ?? "").trim();
        if (!globalDisclosure) {
          res.status(400).json({
            error: "Global affiliate disclosure is missing. Set Home UI productCardAffiliateDisclosure before AI execute."
          });
          return;
        }
        if (!hasAffiliateDisclosureSignal(complianceWarnings, shortDescription, longDescription)) {
          res.status(400).json({
            error:
              "Compliance warning must include affiliate disclosure signal (affiliate/commission/disclosure) in copy or warnings."
          });
          return;
        }
        if ((section === "gadgets" || section === "supplements" || section === "upcoming") && hasHealthRiskClaims(`${shortDescription} ${longDescription}`)) {
          res.status(400).json({
            error: "Health category copy contains restricted claims (e.g., guaranteed/cure/instant). Revise copy first."
          });
          return;
        }
        const duplicateReasons = getSectionDuplicateReasons(published, section as "forex" | "betting" | "software" | "social" | "gadgets" | "supplements" | "upcoming", {
          title,
          checkoutLink,
          imageUrl
        });
        if (duplicateReasons.length) {
          await aiControlStore.logAudit({
            action: "ai.action.execute",
            status: "denied",
            role: ((req as express.Request & { adminRole?: string }).adminRole ?? "viewer") as string,
            authSource: ((req as express.Request & { authSource?: string }).authSource ?? "unknown") as string,
            path: req.originalUrl,
            ip: resolveRequestIp(req),
            metadata: { reason: "duplicate_detected", duplicateReasons, section, title }
          });
          res.status(409).json({ error: "Duplicate detected in target section.", duplicateReasons });
          return;
        }
        const rollback = await aiControlStore.captureRollbackSnapshot({
          reason: "ai_execute_add_product",
          role: ((req as express.Request & { adminRole?: string }).adminRole ?? "viewer") as string,
          authSource: ((req as express.Request & { authSource?: string }).authSource ?? "unknown") as string,
          content: published
        });
        const healthFallback: NonNullable<SiteContent["healthPage"]> = {
          hero2: {
            eyebrow: "Health",
            headline: "Health Picks",
            subtext: "Curated gadgets and supplements",
            ctaPrimary: { label: "Explore", target: "/health" },
            ctaSecondary: { label: "Learn more", target: "/health" },
            imageUrl: "",
            imageAlt: "Health section image",
            imageLink: ""
          },
          sections: {
            gadgets: { title: "Healthy Gadgets", description: "Top device picks for wellness routines." },
            supplements: { title: "Healthy Supplements", description: "Top supplement picks for daily support." }
          },
          products: {
            gadgets: [],
            supplements: []
          },
          upcoming: {
            title: "Upcoming",
            subtitle: "Upcoming health drops",
            items: []
          }
        };
        const currentHealth = published.healthPage ?? defaultPublishedContent.healthPage ?? healthFallback;
        const healthPage: NonNullable<SiteContent["healthPage"]> = {
          ...currentHealth,
          products: {
            gadgets: [...currentHealth.products.gadgets],
            supplements: [...currentHealth.products.supplements]
          }
        };

        let insertedSection = section;
        let productsInSection = 0;
        let nextContent: SiteContent = published;
        if (section === "gadgets" || section === "supplements") {
          const nextPosition = healthPage.products[section].length + 1;
          const category = section === "gadgets" ? "Gadgets" : "Supplements";
          healthPage.products[section].push({
            id: `health-${section}-${randomUUID().slice(0, 8)}`,
            position: nextPosition,
            title,
            shortDescription,
            longDescription,
            features,
            rating,
            isNew,
            category,
            imageUrl,
            checkoutLink
          });
          productsInSection = healthPage.products[section].length;
          nextContent = {
            ...published,
            healthPage
          };
        } else if (section === "upcoming") {
          const nextPosition = healthPage.upcoming.items.length + 1;
          healthPage.upcoming.items.push({
            id: `health-upcoming-${randomUUID().slice(0, 8)}`,
            position: nextPosition,
            title,
            shortDescription,
            imageUrl,
            active: true,
            notifyLabel: "Notify me"
          });
          productsInSection = healthPage.upcoming.items.length;
          nextContent = {
            ...published,
            healthPage
          };
        } else {
          const categoryMap = {
            forex: "Forex",
            betting: "Betting",
            software: "Software",
            social: "Social"
          } as const;
          const nextPosition = published.products[section as "forex" | "betting" | "software" | "social"].length + 1;
          const nextProduct = {
            id: `${section}-${randomUUID().slice(0, 8)}`,
            position: nextPosition,
            title,
            shortDescription,
            longDescription,
            features,
            rating,
            isNew,
            category: categoryMap[section as "forex" | "betting" | "software" | "social"],
            imageUrl,
            checkoutLink
          };
          const nextSectionProducts = [...published.products[section as "forex" | "betting" | "software" | "social"], nextProduct];
          productsInSection = nextSectionProducts.length;
          nextContent = {
            ...published,
            products: {
              ...published.products,
              [section]: nextSectionProducts
            }
          };
        }

        await siteStore.saveDraft(nextContent);
        const content = await siteStore.publish(nextContent);
        await aiControlStore.logAudit({
          action: "ai.action.execute",
          status: "executed",
          role: ((req as express.Request & { adminRole?: string }).adminRole ?? "viewer") as string,
          authSource: ((req as express.Request & { authSource?: string }).authSource ?? "unknown") as string,
          path: req.originalUrl,
          ip: resolveRequestIp(req),
          metadata: { section: insertedSection, insertedTitle: title, rollbackId: rollback.id }
        });
        const sectionCounts: Record<string, number> = {
          forex: content.products.forex.length,
          betting: content.products.betting.length,
          software: content.products.software.length,
          social: content.products.social.length,
          gadgets: content.healthPage?.products.gadgets.length ?? 0,
          supplements: content.healthPage?.products.supplements.length ?? 0,
          upcoming: content.healthPage?.upcoming.items.length ?? 0
        };
        res.status(200).json({
          ok: true,
          mode: "execute",
          section: insertedSection,
          insertedTitle: title,
          productsInSection: sectionCounts[insertedSection] ?? productsInSection,
          rollbackId: rollback.id
        });
      } catch (error) {
        res.status(500).json({ error: safeServerErrorMessage(error, "Failed to execute add product action.") });
      }
    }
  );

  app.get("/api/traffic-ai/plan/latest", requireAdminAuth, async (_req, res) => {
    try {
      const latest = await trafficAiStore.getLatestPlan();
      res.status(200).json({ plan: latest });
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to load traffic AI plan.") });
    }
  });

  app.get("/api/traffic-ai/plans", requireAdminAuth, async (_req, res) => {
    try {
      const plans = await trafficAiStore.listPlans();
      res.status(200).json({ items: plans, total: plans.length });
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to load traffic AI plan history.") });
    }
  });

  app.post(
    "/api/traffic-ai/plan/generate",
    requireAdminAuth,
    requireCsrfForCookieAuth,
    auditAdminAction("traffic_ai.generate_plan"),
    async (_req, res) => {
      try {
        const [publishedContent, emailSummary] = await Promise.all([
          siteStore.getPublished(),
          emailStore.getAnalyticsSummary()
        ]);
        const nextPlan = generateTrafficAiPlan({
          content: publishedContent,
          emailSummary
        });
        const saved = await trafficAiStore.addPlan(nextPlan);
        res.status(201).json({ plan: saved });
      } catch (error) {
        res.status(500).json({ error: safeServerErrorMessage(error, "Failed to generate traffic AI plan.") });
      }
    }
  );

  app.post("/api/analytics/events", async (req, res) => {
    const eventName = typeof req.body?.eventName === "string" ? req.body.eventName.trim() : "";
    const payload = typeof req.body?.payload === "object" && req.body.payload !== null ? (req.body.payload as Record<string, unknown>) : {};

    if (!eventName) {
      res.status(400).json({ error: "eventName is required." });
      return;
    }

    const created = await analyticsStore.add(eventName, payload);
    res.status(201).json({ item: created });
  });

  app.post("/api/cookies/consent", async (req, res) => {
    const payload = typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};
    const consentId = typeof payload.consentId === "string" ? payload.consentId.trim().toLowerCase() : "";
    const versionRaw = typeof payload.version === "number" ? payload.version : Number(payload.version ?? 1);
    const version = Number.isFinite(versionRaw) ? Math.max(1, Math.floor(versionRaw)) : 1;
    const source = typeof payload.source === "string" && payload.source.trim() ? payload.source.trim() : "web";
    if (!consentId || consentId.length < 10 || consentId.length > 120) {
      res.status(400).json({ error: "A valid consentId is required." });
      return;
    }
    try {
      const saved = await cookieConsentStore.upsertConsent({
        consentId,
        version,
        analytics: payload.analytics === true,
        marketing: payload.marketing === true,
        preferences: payload.preferences === true,
        source,
        ipHash: hashValue(getClientIp(req)),
        userAgent: (req.header("user-agent") ?? "").slice(0, 320)
      });
      res.status(200).json({
        ok: true,
        consent: {
          id: saved.id,
          version: saved.version,
          essential: true,
          analytics: saved.analytics,
          marketing: saved.marketing,
          preferences: saved.preferences,
          updatedAt: saved.updatedAt
        }
      });
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to save cookie consent.") });
    }
  });

  app.get("/api/cookies/consent/:id", async (req, res) => {
    const consentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!consentId?.trim()) {
      res.status(400).json({ error: "consent id is required." });
      return;
    }
    try {
      const consent = await cookieConsentStore.getById(consentId);
      if (!consent) {
        res.status(404).json({ error: "Consent record not found." });
        return;
      }
      res.status(200).json({
        consent: {
          id: consent.id,
          version: consent.version,
          essential: true,
          analytics: consent.analytics,
          marketing: consent.marketing,
          preferences: consent.preferences,
          updatedAt: consent.updatedAt
        }
      });
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to read cookie consent.") });
    }
  });

  app.use("/api/email", (_req, res, next) => {
    // Email dashboards should reflect new subscriptions immediately.
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });

  app.post("/api/email/subscribe", subscribeIpLimiter, async (req, res) => {
    if (!EMAIL_SUBSCRIPTIONS_ENABLED) {
      res.status(503).json({
        error: "SUBSCRIPTIONS_DISABLED",
        message: "Subscriptions are temporarily disabled."
      });
      return;
    }

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";

    if (!name) {
      res.status(400).json({ error: "name is required." });
      return;
    }
    if (!email) {
      res.status(400).json({ error: "email is required." });
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      res.status(400).json({ error: "email must be valid." });
      return;
    }

    try {
      const senderProfile = await emailStore.getSenderProfile();
      const missingFields: string[] = [];
      if (!EMAIL_PATTERN.test(senderProfile.fromEmail)) {
        missingFields.push("fromEmail");
      }
      if (!senderProfile.smtpHost.trim()) {
        missingFields.push("smtpHost");
      }
      if (!Number.isFinite(Number(senderProfile.smtpPort)) || Number(senderProfile.smtpPort) < 1 || Number(senderProfile.smtpPort) > 65535) {
        missingFields.push("smtpPort");
      }
      if (!senderProfile.smtpUser.trim()) {
        missingFields.push("smtpUser");
      }
      if (!senderProfile.smtpPass.trim()) {
        missingFields.push("smtpPass");
      }
      if (missingFields.length) {
        res.status(400).json({
          error: "SMTP_SETTINGS_REQUIRED",
          message: "Email sender profile is incomplete. Configure SMTP settings before accepting subscriptions.",
          missingFields
        });
        return;
      }

      const existing = await emailStore.getSubscriberByEmail(email);
      if (existing) {
        res.status(409).json({
          error: "ALREADY_SUBSCRIBED",
          message: "This email already exists in the subscriber list.",
          status: existing.status
        });
        return;
      }

      const subscriber = await emailStore.upsertPendingSubscriber({ name, email, phone });
      await emailStore.addEvent({
        eventType: EMAIL_EVENT_TYPES.leadSubscribed,
        subscriberId: subscriber.id,
        meta: {
          source: "quick_grabs",
          confirmationDispatch: {
            state: EMAIL_CONFIRM_MODE === "sync" ? "sending" : "queued",
            at: new Date().toISOString()
          }
        }
      });
      if (EMAIL_CONFIRM_MODE === "sync") {
        const confirmationResult = await deliverConfirmationEmail({
          name: subscriber.name,
          email: subscriber.email,
          confirmToken: subscriber.confirmToken,
          unsubscribeToken: subscriber.unsubscribeToken
        });
        await emailStore.addEvent({
          eventType: EMAIL_EVENT_TYPES.leadConfirmationResent,
          subscriberId: subscriber.id,
          meta: {
            source: "auto_subscription_flow_sync",
            confirmationDispatch: {
              state: "sent",
              messageId: confirmationResult.messageId,
              accepted: confirmationResult.accepted,
              rejected: confirmationResult.rejected,
              at: new Date().toISOString()
            }
          }
        });
        const links = buildConfirmationLinks({
          confirmToken: subscriber.confirmToken,
          unsubscribeToken: subscriber.unsubscribeToken
        });
        res.status(201).json({
          ok: true,
          subscriberId: subscriber.id,
          status: subscriber.status,
          delivery: "sent",
          messageId: confirmationResult.messageId,
          accepted: confirmationResult.accepted,
          rejected: confirmationResult.rejected,
          confirmUrl: links.confirmUrl,
          unsubscribeUrl: links.unsubscribeUrl
        });
        return;
      } else {
        // Send confirmation in the background so client subscribe calls stay responsive.
        queueConfirmationDelivery({
          id: subscriber.id,
          name: subscriber.name,
          email: subscriber.email,
          confirmToken: subscriber.confirmToken,
          unsubscribeToken: subscriber.unsubscribeToken,
          source: "auto_subscription_flow"
        });
      }
      res.status(201).json({
        ok: true,
        subscriberId: subscriber.id,
        status: subscriber.status,
        delivery: "queued"
      });
    } catch (error) {
      if (error instanceof EmailDeliveryError) {
        res.status(502).json({
          error: "CONFIRMATION_SEND_FAILED",
          message: error.message,
          detailCode: error.detailCode ?? error.code
        });
        return;
      }
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to subscribe.") });
    }
  });

  app.post("/api/email/subscribers/:id/resend-confirmation", requireAdminAuth, requireCsrfForCookieAuth, auditAdminAction("email.resend_confirmation"), async (req, res) => {
    const subscriberId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      const subscriber = await emailStore.getSubscriberById(subscriberId);
      if (!subscriber) {
        res.status(404).json({ error: "Subscriber not found." });
        return;
      }
      const canResendConfirmation =
        subscriber.status === EMAIL_SUBSCRIBER_STATUS.pending ||
        subscriber.status === EMAIL_SUBSCRIBER_STATUS.unsubscribed;
      if (!canResendConfirmation) {
        res.status(400).json({ error: "Only pending or unsubscribed subscribers can receive confirmation resend." });
        return;
      }
      if (EMAIL_CONFIRM_MODE === "sync") {
        const confirmationResult = await deliverConfirmationEmail({
          name: subscriber.name,
          email: subscriber.email,
          confirmToken: subscriber.confirmToken,
          unsubscribeToken: subscriber.unsubscribeToken
        });
        await emailStore.addEvent({
          eventType: EMAIL_EVENT_TYPES.leadConfirmationResent,
          subscriberId: subscriber.id,
          meta: {
            source: "admin_email_analytics_sync",
            confirmationDispatch: {
              state: "sent",
              messageId: confirmationResult.messageId,
              accepted: confirmationResult.accepted,
              rejected: confirmationResult.rejected,
              at: new Date().toISOString()
            }
          }
        });
        res.status(200).json({ ok: true, delivery: "sent", subscriberId: subscriber.id, messageId: confirmationResult.messageId });
        return;
      }

      queueConfirmationDelivery({
        id: subscriber.id,
        name: subscriber.name,
        email: subscriber.email,
        confirmToken: subscriber.confirmToken,
        unsubscribeToken: subscriber.unsubscribeToken,
        source: "admin_email_analytics"
      });
      await emailStore.addEvent({
        eventType: EMAIL_EVENT_TYPES.leadConfirmationResent,
        subscriberId: subscriber.id,
        meta: {
          source: "admin_email_analytics",
          confirmationDispatch: {
            state: "queued",
            at: new Date().toISOString()
          }
        }
      });
      res.status(200).json({ ok: true, delivery: "queued", subscriberId: subscriber.id });
    } catch (error) {
      if (error instanceof EmailDeliveryError) {
        res.status(502).json({
          error: "CONFIRMATION_SEND_FAILED",
          message: error.message,
          detailCode: error.detailCode ?? error.code
        });
        return;
      }
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to resend confirmation email.") });
    }
  });

  app.delete("/api/email/subscribers/:id", requireAdminAuth, requireCsrfForCookieAuth, auditAdminAction("email.delete_subscriber"), async (req, res) => {
    const subscriberId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      const deleted = await emailStore.deleteSubscriberById(subscriberId);
      if (!deleted) {
        res.status(404).json({ error: "Subscriber not found." });
        return;
      }
      await emailStore.addEvent({
        eventType: EMAIL_EVENT_TYPES.leadDeleted,
        subscriberId: deleted.id,
        meta: { source: "admin_email_analytics", emailHash: hashEmailForAudit(deleted.email) }
      });
      res.status(200).json({ ok: true, deletedId: deleted.id });
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to delete subscriber.") });
    }
  });

  app.get("/api/email/confirm", async (req, res) => {
    const redirectToConfirm = (status: "success" | "error", reason?: "invalid" | "failed") => {
      const query = new URLSearchParams({ status });
      if (reason) query.set("reason", reason);
      return `${CLIENT_PUBLIC_BASE_URL}/confirm?${query.toString()}`;
    };

    const token = typeof req.query?.token === "string" ? req.query.token : "";
    if (!token.trim()) {
      res.redirect(303, redirectToConfirm("error", "invalid"));
      return;
    }
    try {
      const subscriber = await emailStore.confirmSubscriberByToken(token);
      if (!subscriber) {
        res.redirect(303, redirectToConfirm("error", "invalid"));
        return;
      }
      await emailStore.addEvent({
        eventType: EMAIL_EVENT_TYPES.leadConfirmed,
        subscriberId: subscriber.id,
        meta: { source: "quick_grabs" }
      });
      res.redirect(303, redirectToConfirm("success"));
    } catch (error) {
      res.redirect(303, redirectToConfirm("error", "failed"));
    }
  });

  app.get("/api/email/unsubscribe", async (req, res) => {
    const redirectToUnsubscribe = (status: "success" | "error", reason?: "invalid" | "failed") => {
      const query = new URLSearchParams({ status });
      if (reason) query.set("reason", reason);
      return `${CLIENT_PUBLIC_BASE_URL}/unsubscribe?${query.toString()}`;
    };

    const token = typeof req.query?.token === "string" ? req.query.token : "";
    if (!token.trim()) {
      res.redirect(303, redirectToUnsubscribe("error", "invalid"));
      return;
    }
    try {
      const subscriberBeforeUnsubscribe = await emailStore.getSubscriberByUnsubscribeToken(token);
      if (!subscriberBeforeUnsubscribe) {
        res.redirect(303, redirectToUnsubscribe("error", "invalid"));
        return;
      }
      const subscriberEvents = await emailStore.listEventsBySubscriberId(subscriberBeforeUnsubscribe.id, 200);
      const lastUnsubscribeEvent = subscriberEvents.find((item) => item.eventType === EMAIL_EVENT_TYPES.leadUnsubscribed);
      const previousUnsubscribeCount = subscriberEvents.filter((item) => item.eventType === EMAIL_EVENT_TYPES.leadUnsubscribed).length;
      const unsubscribeCount = previousUnsubscribeCount + 1;
      const lastUnsubscribedAt = lastUnsubscribeEvent?.createdAt ?? "";
      const hadResendAfterLastUnsubscribe = Boolean(lastUnsubscribedAt) &&
        subscriberEvents.some(
          (item) =>
            item.eventType === EMAIL_EVENT_TYPES.leadConfirmationResent &&
            item.createdAt > lastUnsubscribedAt
        );
      const notificationAt = new Date().toISOString();

      const subscriber = await emailStore.unsubscribeSubscriberByToken(token);
      if (!subscriber) {
        res.redirect(303, redirectToUnsubscribe("error", "invalid"));
        return;
      }
      await emailStore.addEvent({
        eventType: EMAIL_EVENT_TYPES.leadUnsubscribed,
        subscriberId: subscriber.id,
        meta: {
          source: "quick_grabs",
          repeatAfterResend: hadResendAfterLastUnsubscribe,
          unsubscribeCount,
          at: notificationAt
        }
      });

      let deletedAfterRepeatUnsubscribe = false;
      if (hadResendAfterLastUnsubscribe) {
        const deleted = await emailStore.deleteSubscriberById(subscriber.id);
        if (deleted) {
          deletedAfterRepeatUnsubscribe = true;
          await emailStore.addEvent({
            eventType: EMAIL_EVENT_TYPES.leadDeleted,
            subscriberId: deleted.id,
            meta: {
              source: "auto_unsubscribe_repeat",
              reason: "repeat_unsubscribe_after_resend",
              emailHash: hashEmailForAudit(deleted.email),
              unsubscribeCount,
              at: notificationAt
            }
          });
        }
      }

      await analyticsStore.add("email.unsubscribe_notification", {
        subscriberId: subscriber.id,
        emailHash: hashEmailForAudit(subscriber.email),
        source: "quick_grabs",
        unsubscribeCount,
        repeatAfterResend: hadResendAfterLastUnsubscribe,
        deletedAfterRepeatUnsubscribe,
        at: notificationAt
      });
      const senderProfile = await emailStore.getSenderProfile();
      const adminAlertRecipient = (ADMIN_UNSUBSCRIBE_ALERT_EMAIL || senderProfile.replyTo || senderProfile.fromEmail).trim().toLowerCase();
      if (EMAIL_PATTERN.test(adminAlertRecipient)) {
        const subject = deletedAfterRepeatUnsubscribe
          ? `AutoHub alert: subscriber auto-deleted after repeated unsubscribe (${subscriber.email})`
          : `AutoHub alert: subscriber unsubscribed (${subscriber.email})`;
        const text = [
          `Subscriber: ${subscriber.email}`,
          `Subscriber ID: ${subscriber.id}`,
          `Unsubscribe count: ${String(unsubscribeCount)}`,
          `Deleted after repeat unsubscribe: ${deletedAfterRepeatUnsubscribe ? "yes" : "no"}`,
          `Repeat unsubscribe after resend: ${hadResendAfterLastUnsubscribe ? "yes" : "no"}`,
          `Timestamp: ${notificationAt}`,
          "Campaign: n/a (unsubscribe link flow)"
        ].join("\n");
        try {
          await sendAdminAlertEmail({
            toEmail: adminAlertRecipient,
            subject,
            text,
            html: `<pre style="font-family:ui-monospace,Consolas,monospace;white-space:pre-wrap">${text}</pre>`,
            fromName: senderProfile.fromName,
            fromEmail: senderProfile.fromEmail,
            replyTo: senderProfile.replyTo,
            smtpHost: senderProfile.smtpHost,
            smtpPort: senderProfile.smtpPort,
            smtpUser: senderProfile.smtpUser,
            smtpPass: senderProfile.smtpPass,
            smtpSecure: resolveSmtpSecureForPort(Number(senderProfile.smtpPort), senderProfile.smtpSecure)
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(
            `[email] admin unsubscribe alert failed recipient=${adminAlertRecipient} message=${
              error instanceof Error ? error.message : "Unknown admin alert error."
            }`
          );
        }
      }
      res.redirect(303, redirectToUnsubscribe("success"));
    } catch (error) {
      res.redirect(303, redirectToUnsubscribe("error", "failed"));
    }
  });

  app.post("/api/email/test-smtp", requireAdminAuth, requireCsrfForCookieAuth, auditAdminAction("email.test_smtp"), async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      res.status(404).json({ error: "Not found." });
      return;
    }

    const toEmail = typeof req.body?.to === "string" ? req.body.to.trim().toLowerCase() : "";
    if (!EMAIL_PATTERN.test(toEmail)) {
      res.status(400).json({ error: "A valid recipient email is required in field 'to'." });
      return;
    }

    try {
      const senderProfile = await emailStore.getSenderProfile();
      const result = await sendSmtpTestEmail({
        toEmail,
        fromName: senderProfile.fromName,
        fromEmail: senderProfile.fromEmail,
        replyTo: senderProfile.replyTo,
        smtpHost: senderProfile.smtpHost,
        smtpPort: senderProfile.smtpPort,
        smtpUser: senderProfile.smtpUser,
        smtpPass: senderProfile.smtpPass,
        smtpSecure: resolveSmtpSecureForPort(Number(senderProfile.smtpPort), senderProfile.smtpSecure)
      });
      res.status(200).json({
        ok: true,
        delivery: "sent",
        provider: result.provider,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected
      });
    } catch (error) {
      if (error instanceof EmailDeliveryError) {
        res.status(502).json({
          error: "SMTP_TEST_FAILED",
          message: error.message,
          detailCode: error.detailCode ?? error.code
        });
        return;
      }
      res.status(500).json({ error: "SMTP_TEST_FAILED", message: error instanceof Error ? error.message : "SMTP test failed." });
    }
  });

  app.get("/api/email/subscribers", requireAdminAuth, async (req, res) => {
    const statusRaw = typeof req.query?.status === "string" ? req.query.status.trim().toLowerCase() : "";
    const status =
      statusRaw === EMAIL_SUBSCRIBER_STATUS.pending ||
      statusRaw === EMAIL_SUBSCRIBER_STATUS.confirmed ||
      statusRaw === EMAIL_SUBSCRIBER_STATUS.unsubscribed
        ? statusRaw
        : undefined;

    if (statusRaw && !status) {
      res.status(400).json({ error: "status must be one of: pending, confirmed, unsubscribed." });
      return;
    }

    const q = typeof req.query?.q === "string" ? req.query.q : "";
    const pageRaw = typeof req.query?.page === "string" ? Number(req.query.page) : undefined;
    const pageSizeRaw = typeof req.query?.pageSize === "string" ? Number(req.query.pageSize) : undefined;
    const page = Number.isFinite(pageRaw) ? Number(pageRaw) : 1;
    const pageSize = Number.isFinite(pageSizeRaw) ? Number(pageSizeRaw) : 25;

    try {
      const result = await emailStore.listSubscribers({ status, q, page, pageSize });
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to list subscribers.") });
    }
  });

  app.get("/api/email/campaigns", requireAdminAuth, async (req, res) => {
    const pageRaw = typeof req.query?.page === "string" ? Number(req.query.page) : undefined;
    const pageSizeRaw = typeof req.query?.pageSize === "string" ? Number(req.query.pageSize) : undefined;
    const page = Number.isFinite(pageRaw) ? Number(pageRaw) : 1;
    const pageSize = Number.isFinite(pageSizeRaw) ? Number(pageSizeRaw) : 25;

    try {
      const result = await emailStore.listCampaigns({ page, pageSize });
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to list campaigns.") });
    }
  });

  app.post(
    "/api/email/campaigns/draft",
    requireAdminAuth,
    adminMutationIpLimiter,
    requireCsrfForCookieAuth,
    auditAdminAction("email.save_campaign_draft"),
    async (req, res) => {
    const input = parseCampaignInput(req.body);
    if (!input.name) {
      res.status(400).json({ error: "name is required." });
      return;
    }
    if (!input.subject) {
      res.status(400).json({ error: "subject is required." });
      return;
    }
    if (!input.bodyRich.includes("{{unsubscribe_link}}") && !input.bodyHtml.includes("{{unsubscribe_link}}")) {
      res.status(400).json({ error: "unsubscribe link token is required in email content." });
      return;
    }

    try {
      const campaign = await emailStore.saveCampaign({
        ...input,
        status: EMAIL_CAMPAIGN_STATUS.draft
      });
      await emailStore.addEvent({
        eventType: EMAIL_EVENT_TYPES.campaignSaved,
        campaignId: campaign.id,
        meta: { status: campaign.status, subject: campaign.subject }
      });
      res.status(200).json({ ok: true, campaign });
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to save draft campaign.") });
    }
    }
  );

  app.post(
    "/api/email/campaigns/test",
    requireAdminAuth,
    adminMutationIpLimiter,
    requireCsrfForCookieAuth,
    auditAdminAction("email.send_test"),
    async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const subject = typeof req.body?.subject === "string" ? req.body.subject.trim() : "";
    const bodyMode =
      req.body?.bodyMode === EMAIL_CAMPAIGN_BODY_MODE.html || req.body?.bodyMode === EMAIL_CAMPAIGN_BODY_MODE.rich
        ? req.body.bodyMode
        : EMAIL_CAMPAIGN_BODY_MODE.rich;
    const bodyRich = typeof req.body?.bodyRich === "string" ? req.body.bodyRich : "";
    const bodyHtml = typeof req.body?.bodyHtml === "string" ? req.body.bodyHtml : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Valid email is required." });
      return;
    }
    if (!subject) {
      res.status(400).json({ error: "subject is required." });
      return;
    }
    if (!bodyRich.trim() && !bodyHtml.trim()) {
      res.status(400).json({ error: "bodyRich or bodyHtml is required." });
      return;
    }
    if (!bodyRich.includes("{{unsubscribe_link}}") && !bodyHtml.includes("{{unsubscribe_link}}")) {
      res.status(400).json({ error: "unsubscribe link token is required in email content." });
      return;
    }

    try {
      await emailStore.addEvent({
        eventType: EMAIL_EVENT_TYPES.campaignTestSent,
        meta: { to: email, subject, bodyMode }
      });
      res.status(200).json({ ok: true, queuedTo: email });
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to queue test email.") });
    }
    }
  );

  app.post(
    "/api/email/campaigns/schedule",
    requireAdminAuth,
    adminMutationIpLimiter,
    requireCsrfForCookieAuth,
    auditAdminAction("email.schedule_campaign"),
    async (req, res) => {
    const input = parseCampaignInput(req.body);
    if (!input.name) {
      res.status(400).json({ error: "name is required." });
      return;
    }
    if (!input.subject) {
      res.status(400).json({ error: "subject is required." });
      return;
    }
    if (!input.scheduleAt) {
      res.status(400).json({ error: "scheduleAt is required for scheduled campaigns." });
      return;
    }
    const scheduleMs = Date.parse(input.scheduleAt);
    if (!Number.isFinite(scheduleMs)) {
      res.status(400).json({ error: "scheduleAt must be a valid ISO datetime." });
      return;
    }
    if (scheduleMs <= Date.now()) {
      res.status(400).json({ error: "scheduleAt must be in the future." });
      return;
    }
    if (!input.bodyRich.includes("{{unsubscribe_link}}") && !input.bodyHtml.includes("{{unsubscribe_link}}")) {
      res.status(400).json({ error: "unsubscribe link token is required in email content." });
      return;
    }

    try {
      const campaign = await emailStore.saveCampaign({
        ...input,
        sendMode: EMAIL_CAMPAIGN_SEND_MODE.schedule,
        status: EMAIL_CAMPAIGN_STATUS.scheduled
      });
      await emailStore.addEvent({
        eventType: EMAIL_EVENT_TYPES.campaignScheduled,
        campaignId: campaign.id,
        meta: { status: campaign.status, scheduleAt: campaign.scheduleAt, subject: campaign.subject }
      });
      res.status(200).json({ ok: true, campaign });
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to schedule campaign.") });
    }
    }
  );

  app.post(
    "/api/email/campaigns/send",
    requireAdminAuth,
    adminMutationIpLimiter,
    requireCsrfForCookieAuth,
    auditAdminAction("email.send_campaign"),
    async (req, res) => {
    const input = parseCampaignInput(req.body);
    if (!input.name) {
      res.status(400).json({ error: "name is required." });
      return;
    }
    if (!input.subject) {
      res.status(400).json({ error: "subject is required." });
      return;
    }
    if (!input.bodyRich.includes("{{unsubscribe_link}}") && !input.bodyHtml.includes("{{unsubscribe_link}}")) {
      res.status(400).json({ error: "unsubscribe link token is required in email content." });
      return;
    }
    if (input.estimatedRecipients <= 0) {
      res.status(400).json({ error: "No confirmed recipients available for this campaign." });
      return;
    }

    try {
      const senderProfile = await emailStore.getSenderProfile();
      const recipientsRaw = await emailStore.listCampaignRecipients();
      const exclusionSet = new Set(input.exclusions.map((item) => item.trim().toLowerCase()).filter(Boolean));
      const recipients = recipientsRaw.filter((item) => !exclusionSet.has(item.email.toLowerCase()));
      if (!recipients.length) {
        res.status(400).json({ error: "No confirmed recipients available for this campaign after exclusions." });
        return;
      }

      const delivery = await sendCampaignEmails({
        recipients,
        subject: input.subject,
        previewText: input.previewText,
        bodyMode: input.bodyMode,
        bodyRich: input.bodyRich,
        bodyHtml: input.bodyHtml,
        fromName: senderProfile.fromName,
        fromEmail: senderProfile.fromEmail,
        replyTo: senderProfile.replyTo,
        smtpHost: senderProfile.smtpHost,
        smtpPort: senderProfile.smtpPort,
        smtpUser: senderProfile.smtpUser,
        smtpPass: senderProfile.smtpPass,
        smtpSecure: resolveSmtpSecureForPort(Number(senderProfile.smtpPort), senderProfile.smtpSecure),
        apiPublicBaseUrl: API_PUBLIC_BASE_URL,
        includeUnsubscribeFooter: senderProfile.includeUnsubscribeFooter,
        checks: senderProfile.checks
      });

      const campaign = await emailStore.saveCampaign({
        ...input,
        estimatedRecipients: delivery.delivered,
        sendMode: EMAIL_CAMPAIGN_SEND_MODE.now,
        scheduleAt: null,
        status: EMAIL_CAMPAIGN_STATUS.sent
      });
      await emailStore.addEvent({
        eventType: EMAIL_EVENT_TYPES.campaignSent,
        campaignId: campaign.id,
        meta: {
          status: campaign.status,
          subject: campaign.subject,
          recipients: campaign.estimatedRecipients,
          attempted: delivery.attempted,
          delivered: delivery.delivered,
          failed: delivery.failed
        }
      });
      res.status(200).json({
        ok: true,
        campaign,
        delivery: {
          attempted: delivery.attempted,
          delivered: delivery.delivered,
          failed: delivery.failed
        }
      });
    } catch (error) {
      if (error instanceof CampaignDeliveryError) {
        res.status(500).json({ error: error.code, message: error.message });
        return;
      }
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to send campaign.") });
    }
  });

  app.get("/api/email/templates/confirmation", requireAdminAuth, async (_req, res) => {
    try {
      const template = await emailStore.getConfirmationTemplate();
      res.status(200).json({ template });
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to load confirmation template.") });
    }
  });

  app.put("/api/email/templates/confirmation", requireAdminAuth, requireCsrfForCookieAuth, auditAdminAction("email.update_confirmation_template"), async (req, res) => {
    const payload = typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};
    const mode =
      payload.mode === EMAIL_CAMPAIGN_BODY_MODE.rich || payload.mode === EMAIL_CAMPAIGN_BODY_MODE.html
        ? payload.mode
        : EMAIL_CAMPAIGN_BODY_MODE.rich;
    const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
    const previewText = typeof payload.previewText === "string" ? payload.previewText : "";
    const bodyRich = typeof payload.bodyRich === "string" ? payload.bodyRich : "";
    const bodyHtml = typeof payload.bodyHtml === "string" ? payload.bodyHtml : "";

    if (!subject) {
      res.status(400).json({ error: "subject is required." });
      return;
    }
    if (!bodyRich.trim() && !bodyHtml.trim()) {
      res.status(400).json({ error: "bodyRich or bodyHtml is required." });
      return;
    }
    if (!bodyRich.includes("{{unsubscribe_link}}") && !bodyHtml.includes("{{unsubscribe_link}}")) {
      res.status(400).json({ error: "unsubscribe link token is required in confirmation template." });
      return;
    }

    try {
      const template = await emailStore.saveConfirmationTemplate({
        mode,
        subject,
        previewText,
        bodyRich,
        bodyHtml
      });
      res.status(200).json({ template });
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to save confirmation template.") });
    }
  });

  app.get("/api/email/settings/sender-profile", requireAdminAuth, async (_req, res) => {
    try {
      const profile = await emailStore.getSenderProfile();
      res.status(200).json({ profile: toPublicSenderProfile(profile) });
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to load sender profile.") });
    }
  });

  app.put("/api/email/settings/sender-profile", requireAdminAuth, requireCsrfForCookieAuth, auditAdminAction("email.update_sender_profile"), async (req, res) => {
    const payload = typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};
    const fromName = typeof payload.fromName === "string" ? payload.fromName.trim() : "";
    const fromEmail = typeof payload.fromEmail === "string" ? payload.fromEmail.trim().toLowerCase() : "";
    const replyTo = typeof payload.replyTo === "string" ? payload.replyTo.trim().toLowerCase() : "";
    const smtpHost = typeof payload.smtpHost === "string" ? payload.smtpHost.trim() : "";
    const smtpPortRaw = typeof payload.smtpPort === "number" ? payload.smtpPort : Number(payload.smtpPort ?? 0);
    const smtpPort = Number.isFinite(smtpPortRaw) ? Math.floor(smtpPortRaw) : 0;
    const smtpUser = typeof payload.smtpUser === "string" ? payload.smtpUser.trim() : "";
    const smtpPass = typeof payload.smtpPass === "string" ? payload.smtpPass : "";
    const smtpSecure = payload.smtpSecure === true;
    const includeUnsubscribeFooter = payload.includeUnsubscribeFooter !== false;
    const checksRaw = typeof payload.checks === "object" && payload.checks !== null ? (payload.checks as Record<string, unknown>) : {};
    const checks = {
      subjectSafe: checksRaw.subjectSafe !== false,
      addressIncluded: Boolean(checksRaw.addressIncluded),
      unsubscribeLink: checksRaw.unsubscribeLink !== false
    };

    if (!fromName) {
      res.status(400).json({ error: "fromName is required." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
      res.status(400).json({ error: "fromEmail must be valid." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) {
      res.status(400).json({ error: "replyTo must be valid." });
      return;
    }
    if (!smtpHost) {
      res.status(400).json({ error: "smtpHost is required." });
      return;
    }
    if (smtpPort < 1 || smtpPort > 65535) {
      res.status(400).json({ error: "smtpPort must be between 1 and 65535." });
      return;
    }
    if (!smtpUser) {
      res.status(400).json({ error: "smtpUser is required." });
      return;
    }
    try {
      const existing = await emailStore.getSenderProfile();
      const effectiveSmtpPass = smtpPass.trim() ? smtpPass : existing.smtpPass;
      if (!effectiveSmtpPass.trim()) {
        res.status(400).json({ error: "smtpPass is required." });
        return;
      }
      const normalizedSmtpSecure = resolveSmtpSecureForPort(smtpPort, smtpSecure);
      const profile = await emailStore.saveSenderProfile({
        fromName,
        fromEmail,
        replyTo,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass: effectiveSmtpPass,
        smtpSecure: normalizedSmtpSecure,
        includeUnsubscribeFooter,
        checks
      });
      res.status(200).json({ profile: toPublicSenderProfile(profile) });
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to save sender profile.") });
    }
  });

  app.get("/api/email/analytics/summary", requireAdminAuth, async (_req, res) => {
    try {
      const summary = await emailStore.getAnalyticsSummary();
      res.status(200).json(summary);
    } catch (error) {
      res.status(500).json({ error: safeServerErrorMessage(error, "Failed to load email analytics summary.") });
    }
  });

  app.get("/api/analytics/summary", requireAdminAuth, async (_req, res) => {
    const summary = await analyticsStore.summary();
    res.status(200).json(summary);
    }
  );

  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: `File too large. Max size is ${Math.floor(maxUploadFileBytes / (1024 * 1024))}MB.` });
        return;
      }
      if (error.code === "LIMIT_FILE_COUNT") {
        res.status(400).json({ error: `Too many files. Max files per request is ${maxUploadFiles}.` });
        return;
      }
      res.status(400).json({ error: error.message || "Invalid upload payload." });
      return;
    }
    if (error instanceof Error && /Unsupported file type/i.test(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  });

  const startupSenderProfile = await emailStore.getSenderProfile();
  const startupMissingFields: string[] = [];
  if (!EMAIL_PATTERN.test(startupSenderProfile.fromEmail)) startupMissingFields.push("fromEmail");
  if (!startupSenderProfile.smtpHost.trim()) startupMissingFields.push("smtpHost");
  if (
    !Number.isFinite(Number(startupSenderProfile.smtpPort)) ||
    Number(startupSenderProfile.smtpPort) < 1 ||
    Number(startupSenderProfile.smtpPort) > 65535
  ) {
    startupMissingFields.push("smtpPort");
  }
  if (!startupSenderProfile.smtpUser.trim()) startupMissingFields.push("smtpUser");
  if (!startupSenderProfile.smtpPass.trim()) startupMissingFields.push("smtpPass");
  const startupSmtpReady = startupMissingFields.length === 0;
  const startupEffectiveSecure = resolveSmtpSecureForPort(Number(startupSenderProfile.smtpPort), startupSenderProfile.smtpSecure);

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API running on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(
      `[email] subscriptionsEnabled=${String(EMAIL_SUBSCRIPTIONS_ENABLED)} confirmationSendMode=${EMAIL_CONFIRM_MODE} smtp startup ready=${String(startupSmtpReady)} host=${startupSenderProfile.smtpHost || "(empty)"} port=${String(
        startupSenderProfile.smtpPort
      )} secure=${String(startupSenderProfile.smtpSecure)} effectiveSecure=${String(startupEffectiveSecure)} userSet=${String(
        Boolean(startupSenderProfile.smtpUser.trim())
      )} tlsRejectUnauthorized=${String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false")} authCookieSameSite=${authCookieSameSite} authCookieSecure=${String(authCookieSecure)} fromEmail=${
        startupSenderProfile.fromEmail || "(empty)"
      } missing=${startupMissingFields.length ? startupMissingFields.join(",") : "none"}`
    );
  });
};

void bootstrap();

