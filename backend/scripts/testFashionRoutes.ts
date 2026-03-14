/* eslint-disable no-console */
import { access, copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const HOST = "127.0.0.1";
const PORT = 4121;
const BASE = `http://${HOST}:${PORT}`;
const OWNER_EMAIL = "owner@example.com";
const OWNER_PASSWORD = "BossAdmin123!";
const CSRF_COOKIE_NAME = "autohub_admin_csrf";

type JsonRecord = Record<string, unknown>;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const assertCondition = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const readJson = async (response: Response) => {
  const text = await response.text();
  if (!text) return {} as JsonRecord;
  try {
    return JSON.parse(text) as JsonRecord;
  } catch {
    throw new Error(`Expected JSON response but got: ${text.slice(0, 200)}`);
  }
};

class CookieSessionClient {
  private readonly cookies = new Map<string, string>();

  private readSetCookieHeaders(response: Response) {
    const withGetSetCookie = response.headers as Headers & { getSetCookie?: () => string[] };
    if (typeof withGetSetCookie.getSetCookie === "function") return withGetSetCookie.getSetCookie();
    const single = response.headers.get("set-cookie");
    return single ? [single] : [];
  }

  private storeResponseCookies(response: Response) {
    const headers = this.readSetCookieHeaders(response);
    for (const header of headers) {
      const firstPart = header.split(";")[0]?.trim();
      if (!firstPart) continue;
      const eqIndex = firstPart.indexOf("=");
      if (eqIndex <= 0) continue;
      this.cookies.set(firstPart.slice(0, eqIndex).trim(), firstPart.slice(eqIndex + 1));
    }
  }

  private cookieHeader() {
    if (this.cookies.size === 0) return "";
    return Array.from(this.cookies.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
  }

  csrfToken() {
    return this.cookies.get(CSRF_COOKIE_NAME) ?? "";
  }

  async request(
    pathName: string,
    options?: {
      method?: "GET" | "POST" | "PUT";
      body?: unknown;
      includeCsrf?: boolean;
      expectedStatus?: number;
    }
  ) {
    const method = options?.method ?? "GET";
    const headers: Record<string, string> = {};
    const cookie = this.cookieHeader();
    if (cookie) headers.Cookie = cookie;
    if (options?.includeCsrf) {
      const csrf = this.csrfToken();
      if (csrf) headers["x-csrf-token"] = csrf;
    }

    let body: string | undefined;
    if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const response = await fetch(`${BASE}${pathName}`, { method, headers, body });
    this.storeResponseCookies(response);
    const payload = await readJson(response);

    if (options?.expectedStatus !== undefined) {
      if (response.status !== options.expectedStatus) {
        throw new Error(`${method} ${pathName} expected ${options.expectedStatus}, got ${response.status}: ${JSON.stringify(payload)}`);
      }
    } else if (!response.ok) {
      throw new Error(`${method} ${pathName} failed (${response.status}): ${JSON.stringify(payload)}`);
    }

    return payload;
  }
}

const waitForHealth = async () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return;
    } catch {
      // wait and retry
    }
    await delay(250);
  }
  throw new Error("Backend did not become healthy in time.");
};

const resolveBackendEntry = async () => {
  const root = path.resolve(process.cwd());
  const candidates = [
    path.join(root, "backend", "dist", "backend", "src", "index.js"),
    path.join(root, "backend", "dist", "src", "index.js"),
    path.join(root, "dist", "backend", "src", "index.js")
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }
  return candidates[0];
};

const startBackend = async (mediaDir: string): Promise<ChildProcess> => {
  const entry = await resolveBackendEntry();
  const child = spawn(process.execPath, [entry], {
    cwd: path.resolve(process.cwd()),
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(PORT),
      CORS_ORIGIN: "http://localhost:5173",
      MEDIA_DIR: mediaDir,
      API_PUBLIC_BASE_URL: BASE
    }
  });

  child.stdout?.on("data", (chunk) => process.stdout.write(String(chunk)));
  child.stderr?.on("data", (chunk) => process.stderr.write(String(chunk)));

  await waitForHealth();
  return child;
};

const stopBackend = async (child: ChildProcess) => {
  if (child.killed) return;
  child.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      if (!child.killed) child.kill("SIGKILL");
      resolve();
    }, 2000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
};

const run = async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "autohub-fashion-routes-test-"));
  const mediaDir = path.join(tempDir, "storage");
  let child: ChildProcess | null = null;

  try {
    await mkdir(path.join(mediaDir, "auth"), { recursive: true });
    await copyFile(path.resolve(process.cwd(), "storage", "auth", "state.json"), path.join(mediaDir, "auth", "state.json"));
    child = await startBackend(mediaDir);
    const client = new CookieSessionClient();

    const publicPublished = await client.request("/api/fashion/published");
    assertCondition(Boolean(publicPublished.content), "Expected published fashion content.");

    const publicMeta = await client.request("/api/fashion/meta");
    assertCondition(typeof publicMeta.updatedAt === "string", "Expected fashion meta updatedAt.");

    await client.request("/api/fashion/draft", { expectedStatus: 401 });

    const authStatus = await client.request("/api/auth/status");
    assertCondition(authStatus.hasOwner === true, "Expected owner account to exist before fashion route tests.");

    const loginStart = await client.request("/api/auth/login/start", {
      method: "POST",
      body: { email: OWNER_EMAIL, password: OWNER_PASSWORD }
    });

    if (loginStart.requiresOtp === true) {
      const devOtp = typeof loginStart.devOtp === "string" ? loginStart.devOtp : "";
      assertCondition(devOtp.length > 0, "Expected dev OTP for login verification.");
      await client.request("/api/auth/login/verify", {
        method: "POST",
        body: { email: OWNER_EMAIL, otp: devOtp }
      });
    }

    const session = await client.request("/api/auth/session");
    assertCondition(session.valid === true, "Expected cookie session after fashion login.");

    const whatsAppSettings = await client.request("/api/fashion/whatsapp/settings");
    assertCondition(typeof whatsAppSettings.settings === "object", "Expected WhatsApp settings payload.");

    const savedWhatsAppSettings = await client.request("/api/fashion/whatsapp/settings", {
      method: "PUT",
      includeCsrf: true,
      body: {
        settings: {
          enabled: false,
          apiBaseUrl: "https://graph.facebook.com",
          apiVersion: "v23.0",
          accessToken: "",
          phoneNumberId: "",
          recipientPhoneNumber: ""
        }
      }
    });
    assertCondition(savedWhatsAppSettings.settings?.enabled === false, "Expected WhatsApp settings save response.");

    const initialDraft = await client.request("/api/fashion/draft");
    const draftContent = initialDraft.content as JsonRecord | null;
    const publishedContent = publicPublished.content as JsonRecord;
    assertCondition(draftContent === null || typeof draftContent === "object", "Expected null or object fashion draft.");

    const nextContent = structuredClone((draftContent ?? publishedContent) as JsonRecord);
    const homepage = nextContent.homepage as JsonRecord;
    homepage.heroHeadline = "Backend route publish test headline";

    const savedDraft = await client.request("/api/fashion/draft", {
      method: "PUT",
      includeCsrf: true,
      body: { content: nextContent }
    });
    assertCondition((savedDraft.content as JsonRecord)?.homepage, "Expected saved fashion draft payload.");

    const savedMeta = await client.request("/api/fashion/meta");
    assertCondition(savedMeta.hasDraft === true, "Expected draft to exist after save.");

    const publishedResponse = await client.request("/api/fashion/publish", {
      method: "POST",
      includeCsrf: true
    });
    const publishedHomepage = ((publishedResponse.content as JsonRecord)?.homepage ?? {}) as JsonRecord;
    assertCondition(publishedHomepage.heroHeadline === "Backend route publish test headline", "Expected publish to promote saved draft.");

    const resetResponse = await client.request("/api/fashion/reset", {
      method: "POST",
      includeCsrf: true
    });
    const resetPublished = (resetResponse.published as JsonRecord)?.homepage as JsonRecord;
    assertCondition(resetPublished.heroHeadline !== "Backend route publish test headline", "Expected reset to restore default fashion content.");

    const richInquiryResponse = await client.request("/api/fashion/whatsapp/inquiries", {
      method: "POST",
      body: {
        type: "product",
        source: "fashion-routes-test",
        message: "Hello, I want this product.",
        products: [{ id: "fashion-001", name: "Urban Utility Set" }],
        customerMeta: {
          phoneNumber: "+250788000000",
          countryCode: "RW"
        },
        consent: {
          accepted: true,
          text: "Testing consent"
        }
      }
    });
    assertCondition(typeof richInquiryResponse.inquiryId === "string", "Expected inquiry ID from rich inquiry endpoint.");

    const inquiryListResponse = await client.request("/api/fashion/whatsapp/inquiries?limit=10");
    const records = Array.isArray(inquiryListResponse.records) ? inquiryListResponse.records : [];
    assertCondition(records.length > 0, "Expected at least one inquiry record.");
    assertCondition(records.some((record) => record?.id === richInquiryResponse.inquiryId), "Expected created inquiry in inquiry list.");

    const checkoutResponse = await client.request("/api/fashion/whatsapp/checkout", {
      method: "POST",
      expectedStatus: 503,
      body: {
        message: "Quick checkout fallback test"
      }
    });
    assertCondition(checkoutResponse.delivery === "disabled", "Expected disabled delivery when WhatsApp API is not configured.");

    console.log("Fashion route tests passed.");
  } finally {
    if (child) await stopBackend(child);
    await rm(tempDir, { recursive: true, force: true });
  }
};

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
