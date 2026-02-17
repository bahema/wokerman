import "dotenv/config";
import cors from "cors";
import express from "express";
import type { SiteContent } from "../../shared/siteTypes";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createMediaStore } from "./media/store.js";
import { createAnalyticsStore } from "./analytics/store.js";
import { createSiteStore } from "./site/store.js";
import { createAuthStore, isAuthRateLimitError } from "./auth/store.js";
import { sendOtp } from "./auth/otpSender.js";

const app = express();
app.disable("x-powered-by");

const PORT = Number(process.env.PORT ?? 4000);
const CORS_ORIGIN_RAW = process.env.CORS_ORIGIN ?? "http://localhost:5173";
const DB_URL = process.env.DB_URL ?? "";
const API_PUBLIC_BASE_URL = process.env.API_PUBLIC_BASE_URL ?? `http://localhost:${PORT}`;
const MEDIA_DIR = process.env.MEDIA_DIR ?? path.resolve(process.cwd(), "storage");
const ALLOW_DEV_OTP = process.env.ALLOW_DEV_OTP === "true";
const _siteContentContract: SiteContent | null = null;

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

const CORS_ORIGINS = CORS_ORIGIN_RAW.split(",").map(normalizeOrigin).filter(Boolean);
const isOriginAllowed = (origin: string) => CORS_ORIGINS.includes("*") || CORS_ORIGINS.includes(origin);

const bootstrap = async () => {
  const mediaStore = await createMediaStore(MEDIA_DIR);
  const analyticsStore = await createAnalyticsStore(MEDIA_DIR);
  const siteStore = await createSiteStore(MEDIA_DIR);
  const authStore = await createAuthStore(MEDIA_DIR);

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

  const getAuthToken = (req: express.Request) => {
    const header = req.header("authorization") ?? "";
    if (!header.toLowerCase().startsWith("bearer ")) return "";
    return header.slice(7).trim();
  };

  const requireAdminAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = getAuthToken(req);
    const valid = await authStore.verifySession(token);
    if (!valid) {
      res.status(401).json({ error: "Unauthorized. Login required." });
      return;
    }
    next();
  };

  const sendAuthError = (res: express.Response, error: unknown, fallbackMessage: string) => {
    if (isAuthRateLimitError(error)) {
      res.status(429).json({ error: error.message, retryAfterSec: error.retryAfterSec });
      return;
    }
    res.status(400).json({ error: error instanceof Error ? error.message : fallbackMessage });
  };

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      service: "autohub-backend",
      env: {
        port: PORT,
        corsOrigins: CORS_ORIGINS,
        dbConfigured: Boolean(DB_URL),
        mediaDir: MEDIA_DIR
      },
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/auth/status", async (_req, res) => {
    const status = await authStore.getStatus();
    res.status(200).json(status);
  });

  app.post("/api/auth/signup/start", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    try {
      const otp = await authStore.startSignup(email, password);
      await sendOtp({ email, code: otp, purpose: "signup" });
      res.status(200).json({ ok: true, devOtp: ALLOW_DEV_OTP ? otp : undefined });
    } catch (error) {
      sendAuthError(res, error, "Failed to start signup.");
    }
  });

  app.post("/api/auth/signup/verify", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const otp = typeof req.body?.otp === "string" ? req.body.otp : "";
    try {
      const session = await authStore.verifySignup(email, otp);
      res.status(200).json({ ok: true, session });
    } catch (error) {
      sendAuthError(res, error, "Failed to verify signup OTP.");
    }
  });

  app.post("/api/auth/login/start", async (req, res) => {
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
      res.status(200).json({ ok: true, requiresOtp: false, session: result.session });
    } catch (error) {
      sendAuthError(res, error, "Failed to start login.");
    }
  });

  app.post("/api/auth/login/verify", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const otp = typeof req.body?.otp === "string" ? req.body.otp : "";
    try {
      const session = await authStore.verifyLogin(email, otp);
      res.status(200).json({ ok: true, session });
    } catch (error) {
      sendAuthError(res, error, "Failed to verify login OTP.");
    }
  });

  app.get("/api/auth/session", async (req, res) => {
    const token = getAuthToken(req);
    const valid = await authStore.verifySession(token);
    res.status(200).json({ valid });
  });

  app.post("/api/auth/logout", async (req, res) => {
    const token = getAuthToken(req);
    if (token) {
      await authStore.logout(token);
    }
    res.status(200).json({ ok: true });
  });

  app.post("/api/auth/logout-all", requireAdminAuth, async (req, res) => {
    const token = getAuthToken(req);
    const keepCurrent = Boolean(req.body?.keepCurrent);
    await authStore.logoutAll(keepCurrent ? token : undefined);
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

  app.put("/api/auth/account", requireAdminAuth, async (req, res) => {
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

  app.put("/api/auth/password", requireAdminAuth, async (req, res) => {
    try {
      const token = getAuthToken(req);
      const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
      const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
      const session = await authStore.changePassword(currentPassword, newPassword, token);
      res.status(200).json({ ok: true, session });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update password." });
    }
  });

  app.get("/api/media", async (_req, res) => {
    const items = await mediaStore.list();
    res.status(200).json({ items });
  });

  app.post("/api/media", requireAdminAuth, upload.array("files", 20), async (req, res) => {
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

  app.delete("/api/media/:id", requireAdminAuth, async (req, res) => {
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

  app.put("/api/site/draft", requireAdminAuth, async (req, res) => {
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

  app.post("/api/site/publish", requireAdminAuth, async (req, res) => {
    const payload = req.body?.content as SiteContent | undefined;
    try {
      const content = await siteStore.publish(payload);
      res.status(200).json({ content });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid content payload." });
    }
  });

  app.post("/api/site/reset", requireAdminAuth, async (_req, res) => {
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

  app.get("/api/analytics/summary", requireAdminAuth, async (_req, res) => {
    const summary = await analyticsStore.summary();
    res.status(200).json(summary);
  });

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API running on http://localhost:${PORT}`);
  });
};

void bootstrap();
