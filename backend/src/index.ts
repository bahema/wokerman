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
import { sendOtp } from "./auth/otpSender.js";
import { createEmailStore } from "./email/store.js";
import { createCookieConsentStore } from "./cookies/store.js";
import { EmailDeliveryError, sendAdminAlertEmail, sendConfirmationEmail, sendSmtpTestEmail } from "./email/confirmationSender.js";
import { CampaignDeliveryError, sendCampaignEmails } from "./email/campaignSender.js";
import {
  EMAIL_CAMPAIGN_AUDIENCE_MODE,
  EMAIL_CAMPAIGN_BODY_MODE,
  EMAIL_CAMPAIGN_SEND_MODE,
  EMAIL_CAMPAIGN_STATUS,
  EMAIL_EVENT_TYPES,
  EMAIL_SUBSCRIBER_STATUS
} from "./db/schema.js";

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
const DB_URL = process.env.DB_URL ?? "";
const API_PUBLIC_BASE_URL = process.env.API_PUBLIC_BASE_URL ?? `http://localhost:${PORT}`;
const MEDIA_DIR = process.env.MEDIA_DIR ?? path.resolve(process.cwd(), "storage");
const EMAIL_SUBSCRIPTIONS_ENABLED = process.env.EMAIL_SUBSCRIPTIONS_ENABLED !== "false";
const isProduction = process.env.NODE_ENV === "production";
const ALLOW_DEV_OTP = !isProduction && process.env.ALLOW_DEV_OTP === "true";
const OWNER_BOOTSTRAP_EMAIL = (process.env.OWNER_BOOTSTRAP_EMAIL ?? "").trim().toLowerCase();
const OWNER_BOOTSTRAP_KEY = (process.env.OWNER_BOOTSTRAP_KEY ?? "").trim();
const AUTH_COOKIE_NAME = "autohub_admin_session";
const CSRF_COOKIE_NAME = "autohub_admin_csrf";
const resolveAuthCookieSigningKey = () =>
  (process.env.AUTH_COOKIE_SIGNING_KEY ?? process.env.AUTH_COOKIE_SECRET ?? process.env.SESSION_SECRET ?? "").trim();
const AUTH_COOKIE_SIGNING_KEY = resolveAuthCookieSigningKey();
const AUTH_IP_RATE_WINDOW_MS = Number(process.env.AUTH_IP_RATE_WINDOW_MS ?? 60_000);
const AUTH_IP_RATE_MAX = Number(process.env.AUTH_IP_RATE_MAX ?? 30);
const SUBSCRIBE_IP_RATE_WINDOW_MS = Number(process.env.SUBSCRIBE_IP_RATE_WINDOW_MS ?? 60_000);
const SUBSCRIBE_IP_RATE_MAX = Number(process.env.SUBSCRIBE_IP_RATE_MAX ?? 20);
const RATE_LIMIT_BUCKET_LIMIT = Number(process.env.RATE_LIMIT_BUCKET_LIMIT ?? 10_000);
const ADMIN_UNSUBSCRIBE_ALERT_EMAIL = (process.env.ADMIN_UNSUBSCRIBE_ALERT_EMAIL ?? "").trim().toLowerCase();
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

const CORS_ORIGINS = CORS_ORIGIN_RAW.split(",").map(normalizeOrigin).filter(Boolean);
const CLIENT_PUBLIC_BASE_URL =
  normalizePublicBaseUrl(process.env.CLIENT_PUBLIC_BASE_URL ?? "") ||
  (CORS_ORIGINS.find((origin) => origin && origin !== "*") ?? "http://localhost:5180");
const configuredAuthCookieSameSite = parseAuthCookieSameSite(process.env.AUTH_COOKIE_SAME_SITE ?? "");
const frontendPublicOrigin = parseOrigin(CLIENT_PUBLIC_BASE_URL);
const apiPublicOrigin = parseOrigin(normalizePublicBaseUrl(API_PUBLIC_BASE_URL));
const requiresCrossSiteCookie = isProduction && Boolean(frontendPublicOrigin && apiPublicOrigin && frontendPublicOrigin !== apiPublicOrigin);
const authCookieSameSite: AuthCookieSameSite = configuredAuthCookieSameSite ?? (requiresCrossSiteCookie ? "none" : "strict");
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
  CORS_ORIGINS.includes("*") || CORS_ORIGINS.includes(origin) || (allowDevLoopbackOrigins && isLocalLoopbackOrigin(origin));

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

  if (OWNER_BOOTSTRAP_KEY && OWNER_BOOTSTRAP_KEY.length < 24) {
    throw new Error("Invalid production configuration: OWNER_BOOTSTRAP_KEY must be at least 24 chars.");
  }
};

const bootstrap = async () => {
  assertProductionSecurityConfig();
  if (isProduction && process.env.ALLOW_DEV_OTP === "true") {
    throw new Error("Invalid production configuration: ALLOW_DEV_OTP must be false.");
  }
  const mediaStore = await createMediaStore(MEDIA_DIR);
  const analyticsStore = await createAnalyticsStore(MEDIA_DIR);
  const siteStore = await createSiteStore(MEDIA_DIR);
  const authStore = await createAuthStore(MEDIA_DIR);
  const emailStore = await createEmailStore(MEDIA_DIR);
  const cookieConsentStore = await createCookieConsentStore(MEDIA_DIR);
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
  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }
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
      credentials: true
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

  const getAuthContext = (req: express.Request) => {
    const cookieToken = readSignedAuthToken(getCookieValue(req, AUTH_COOKIE_NAME));
    if (cookieToken) return { token: cookieToken, source: "cookie" as const };
    return { token: "", source: "none" as const };
  };

  const getAuthToken = (req: express.Request) => {
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
    const { token, source } = getAuthContext(req);
    const valid = await authStore.verifySession(token);
    if (!valid) {
      res.status(401).json({ error: "Unauthorized. Login required." });
      return;
    }
    res.locals.authSource = source;
    (req as express.Request & { authSource?: "cookie" | "none" }).authSource = source;
    next();
  };

  const requireCsrfForCookieAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const source = ((req as express.Request & { authSource?: "cookie" | "none" }).authSource ?? res.locals.authSource) as
      | "cookie"
      | "none"
      | undefined;
    if (source !== "cookie") {
      res.status(401).json({ error: "Unauthorized. Login required." });
      return;
    }
    if (!validateCsrfPair(req)) {
      res.status(403).json({ error: "CSRF validation failed." });
      return;
    }
    next();
  };

  const resolveRequestIp = (req: express.Request) => {
    return req.ip || req.socket.remoteAddress || "unknown";
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
  const subscribeIpLimiter = createIpRateLimiter("subscribe", {
    windowMs: Number.isFinite(SUBSCRIBE_IP_RATE_WINDOW_MS) && SUBSCRIBE_IP_RATE_WINDOW_MS > 0 ? SUBSCRIBE_IP_RATE_WINDOW_MS : 60_000,
    max: Number.isFinite(SUBSCRIBE_IP_RATE_MAX) && SUBSCRIBE_IP_RATE_MAX > 0 ? SUBSCRIBE_IP_RATE_MAX : 20
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
          authSource: (req as express.Request & { authSource?: "cookie" | "none" }).authSource ?? "unknown",
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
    res.status(200).json({
      ok: true,
      service: "autohub-backend",
      env: {
        persistenceMode: PERSISTENCE_MODE,
        port: PORT,
        corsOrigins: CORS_ORIGINS,
        dbUrlProvided: Boolean(DB_URL),
        mediaDir: MEDIA_DIR
      },
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/auth/status", async (_req, res) => {
    const status = await authStore.getStatus();
    res.status(200).json(status);
  });

  app.post("/api/auth/signup/start", authIpLimiter, async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    try {
      const status = await authStore.getStatus();
      if (!status.hasOwner && isProduction) {
        const bootstrapKeyHeader = req.header("x-owner-bootstrap-key") ?? "";
        const bootstrapKeyBody = typeof req.body?.bootstrapKey === "string" ? req.body.bootstrapKey : "";
        const bootstrapKey = (bootstrapKeyHeader || bootstrapKeyBody).trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (!OWNER_BOOTSTRAP_EMAIL || !OWNER_BOOTSTRAP_KEY) {
          res.status(503).json({
            error: "OWNER_BOOTSTRAP_LOCKED",
            message: "Owner bootstrap is locked. Configure OWNER_BOOTSTRAP_EMAIL and OWNER_BOOTSTRAP_KEY."
          });
          return;
        }
        if (normalizedEmail !== OWNER_BOOTSTRAP_EMAIL) {
          res.status(403).json({ error: "OWNER_EMAIL_NOT_ALLOWED", message: "This email is not allowed for owner bootstrap." });
          return;
        }
        if (bootstrapKey !== OWNER_BOOTSTRAP_KEY) {
          res.status(403).json({ error: "OWNER_BOOTSTRAP_KEY_INVALID", message: "Invalid bootstrap key." });
          return;
        }
      }

      const otp = await authStore.startSignup(email, password);
      await sendOtp({ email, code: otp, purpose: "signup" });
      res.status(200).json({ ok: true, devOtp: ALLOW_DEV_OTP ? otp : undefined });
    } catch (error) {
      sendAuthError(res, error, "Failed to start signup.");
    }
  });

  app.post("/api/auth/signup/verify", authIpLimiter, async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const otp = typeof req.body?.otp === "string" ? req.body.otp : "";
    try {
      const session = await authStore.verifySignup(email, otp);
      setAuthCookie(res, session.token, session.expiresAt);
      res.status(200).json({ ok: true });
    } catch (error) {
      sendAuthError(res, error, "Failed to verify signup OTP.");
    }
  });

  app.post("/api/auth/login/start", authIpLimiter, async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    try {
      const result = await authStore.startLogin(email, password);
      if (result.requiresOtp) {
        await sendOtp({ email, code: result.otp, purpose: "login" });
        res.status(200).json({
          ok: true,
          requiresOtp: true,
          devOtp: ALLOW_DEV_OTP ? result.otp : undefined
        });
        return;
      }
      setAuthCookie(res, result.session.token, result.session.expiresAt);
      res.status(200).json({ ok: true, requiresOtp: false });
    } catch (error) {
      sendAuthError(res, error, "Failed to start login.");
    }
  });

  app.post("/api/auth/login/verify", authIpLimiter, async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const otp = typeof req.body?.otp === "string" ? req.body.otp : "";
    try {
      const session = await authStore.verifyLogin(email, otp);
      setAuthCookie(res, session.token, session.expiresAt);
      res.status(200).json({ ok: true });
    } catch (error) {
      sendAuthError(res, error, "Failed to verify login OTP.");
    }
  });

  app.get("/api/auth/session", async (req, res) => {
    const token = getAuthToken(req);
    const valid = await authStore.verifySession(token);
    if (!valid) clearAuthCookie(res);
    res.status(200).json({ valid });
  });

  app.post("/api/auth/logout", async (req, res) => {
    const token = getAuthToken(req);
    if (token) {
      await authStore.logout(token);
    }
    clearAuthCookie(res);
    res.status(200).json({ ok: true });
  });

  app.post("/api/auth/logout-all", requireAdminAuth, requireCsrfForCookieAuth, auditAdminAction("auth.logout_all"), async (req, res) => {
    const token = getAuthToken(req);
    const keepCurrent = Boolean(req.body?.keepCurrent);
    await authStore.logoutAll(keepCurrent ? token : undefined);
    if (!keepCurrent) clearAuthCookie(res);
    res.status(200).json({ ok: true, keepCurrent });
  });

  app.get("/api/auth/account", requireAdminAuth, async (_req, res) => {
    try {
      const account = await authStore.getAccountSettings();
      res.status(200).json(account);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to load account settings." });
    }
  });

  app.put("/api/auth/account", requireAdminAuth, requireCsrfForCookieAuth, auditAdminAction("auth.update_account"), async (req, res) => {
    try {
      const fullName = typeof req.body?.fullName === "string" ? req.body.fullName : "";
      const timezone = typeof req.body?.timezone === "string" ? req.body.timezone : "UTC";
      const twoFactorEnabled = Boolean(req.body?.twoFactorEnabled);
      const account = await authStore.updateAccountSettings({ fullName, timezone, twoFactorEnabled });
      res.status(200).json(account);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to save account settings." });
    }
  });

  app.put("/api/auth/password", requireAdminAuth, requireCsrfForCookieAuth, auditAdminAction("auth.change_password"), async (req, res) => {
    try {
      const token = getAuthToken(req);
      const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
      const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
      const session = await authStore.changePassword(currentPassword, newPassword, token);
      setAuthCookie(res, session.token, session.expiresAt);
      res.status(200).json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update password." });
    }
  });

  app.get("/api/media", async (_req, res) => {
    const items = await mediaStore.list();
    res.status(200).json({ items });
  });

  app.post("/api/media", requireAdminAuth, requireCsrfForCookieAuth, auditAdminAction("media.upload"), upload.array("files", 20), async (req, res) => {
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
  });

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

  app.put("/api/site/draft", requireAdminAuth, requireCsrfForCookieAuth, auditAdminAction("site.save_draft"), async (req, res) => {
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
  });

  app.post("/api/site/publish", requireAdminAuth, requireCsrfForCookieAuth, auditAdminAction("site.publish"), async (req, res) => {
    const payload = req.body?.content as SiteContent | undefined;
    try {
      const content = await siteStore.publish(payload);
      res.status(200).json({ content });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid content payload." });
    }
  });

  app.post("/api/site/reset", requireAdminAuth, requireCsrfForCookieAuth, auditAdminAction("site.reset"), async (_req, res) => {
    const next = await siteStore.reset();
    res.status(200).json({ published: next.published, draft: next.draft });
  });

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
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to save cookie consent." });
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
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to read cookie consent." });
    }
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
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to subscribe." });
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
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to resend confirmation email." });
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
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete subscriber." });
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
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list subscribers." });
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
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list campaigns." });
    }
  });

  app.post("/api/email/campaigns/draft", requireAdminAuth, requireCsrfForCookieAuth, auditAdminAction("email.save_campaign_draft"), async (req, res) => {
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
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to save draft campaign." });
    }
  });

  app.post("/api/email/campaigns/test", requireAdminAuth, requireCsrfForCookieAuth, auditAdminAction("email.send_test"), async (req, res) => {
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
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to queue test email." });
    }
  });

  app.post("/api/email/campaigns/schedule", requireAdminAuth, requireCsrfForCookieAuth, auditAdminAction("email.schedule_campaign"), async (req, res) => {
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
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to schedule campaign." });
    }
  });

  app.post("/api/email/campaigns/send", requireAdminAuth, requireCsrfForCookieAuth, auditAdminAction("email.send_campaign"), async (req, res) => {
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
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to send campaign." });
    }
  });

  app.get("/api/email/templates/confirmation", requireAdminAuth, async (_req, res) => {
    try {
      const template = await emailStore.getConfirmationTemplate();
      res.status(200).json({ template });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load confirmation template." });
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
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to save confirmation template." });
    }
  });

  app.get("/api/email/settings/sender-profile", requireAdminAuth, async (_req, res) => {
    try {
      const profile = await emailStore.getSenderProfile();
      res.status(200).json({ profile: toPublicSenderProfile(profile) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load sender profile." });
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
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to save sender profile." });
    }
  });

  app.get("/api/email/analytics/summary", requireAdminAuth, async (_req, res) => {
    try {
      const summary = await emailStore.getAnalyticsSummary();
      res.status(200).json(summary);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load email analytics summary." });
    }
  });

  app.get("/api/analytics/summary", requireAdminAuth, async (_req, res) => {
    const summary = await analyticsStore.summary();
    res.status(200).json(summary);
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
