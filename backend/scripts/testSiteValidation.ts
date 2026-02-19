/* eslint-disable no-console */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const HOST = "127.0.0.1";
const PORT = 4120;
const BASE = `http://${HOST}:${PORT}`;
const OWNER_EMAIL = "site-validation-test@example.com";
const OWNER_PASSWORD = "BossPass123!";

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

const requestJson = async (
  pathName: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    token?: string;
    body?: unknown;
    expectedStatus?: number;
  }
) => {
  const method = options?.method ?? "GET";
  const headers: Record<string, string> = {};
  if (options?.token) headers.Authorization = `Bearer ${options.token}`;
  let body: string | undefined;
  if (options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  const response = await fetch(`${BASE}${pathName}`, { method, headers, body });
  const payload = await readJson(response);

  if (options?.expectedStatus !== undefined) {
    if (response.status !== options.expectedStatus) {
      throw new Error(`${method} ${pathName} expected ${options.expectedStatus}, got ${response.status}: ${JSON.stringify(payload)}`);
    }
  } else if (!response.ok) {
    throw new Error(`${method} ${pathName} failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return payload;
};

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

const startBackend = async (mediaDir: string): Promise<ChildProcess> => {
  const child = spawn(process.execPath, ["dist/backend/src/index.js"], {
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
  const tempDir = await mkdtemp(path.join(tmpdir(), "autohub-site-validation-test-"));
  const mediaDir = path.join(tempDir, "storage");
  let child: ChildProcess | null = null;

  try {
    child = await startBackend(mediaDir);

    const signupStart = await requestJson("/api/auth/signup/start", {
      method: "POST",
      body: { email: OWNER_EMAIL, password: OWNER_PASSWORD }
    });
    const signupOtp = typeof signupStart.devOtp === "string" ? signupStart.devOtp : "";
    assertCondition(signupOtp.length > 0, "Expected dev OTP for signup.");

    const signupVerify = await requestJson("/api/auth/signup/verify", {
      method: "POST",
      body: { email: OWNER_EMAIL, otp: signupOtp }
    });
    const session = signupVerify.session as JsonRecord | undefined;
    const token = typeof session?.token === "string" ? session.token : "";
    assertCondition(Boolean(token), "Expected auth token after signup.");

    const published = await requestJson("/api/site/published");
    const publishedContent = published.content as JsonRecord | undefined;
    assertCondition(Boolean(publishedContent), "Expected published content payload.");

    const invalidAdsectionDraft = structuredClone(publishedContent ?? {});
    if (
      typeof invalidAdsectionDraft === "object" &&
      invalidAdsectionDraft &&
      "homeUi" in invalidAdsectionDraft &&
      typeof invalidAdsectionDraft.homeUi === "object" &&
      invalidAdsectionDraft.homeUi &&
      "adsectionMan" in (invalidAdsectionDraft.homeUi as JsonRecord)
    ) {
      const homeUi = invalidAdsectionDraft.homeUi as JsonRecord;
      const adsectionMan = homeUi.adsectionMan as JsonRecord;
      const gadgets = adsectionMan.gadgets as JsonRecord;
      gadgets.buttonTarget = "";
    }

    const invalidAdsectionResponse = await requestJson("/api/site/draft", {
      method: "PUT",
      token,
      body: { content: invalidAdsectionDraft },
      expectedStatus: 400
    });
    const adsectionError = String(invalidAdsectionResponse.error ?? "");
    assertCondition(
      adsectionError.includes("homeUi.adsectionMan.gadgets.buttonTarget"),
      "Expected backend draft validation error for adsectionMan.gadgets.buttonTarget."
    );

    const invalidDraft = structuredClone(publishedContent ?? {});
    if (typeof invalidDraft === "object" && invalidDraft && "socials" in invalidDraft) {
      const socials = invalidDraft.socials as JsonRecord;
      socials.facebookUrl = "invalid-url";
    }

    const invalidDraftResponse = await requestJson("/api/site/draft", {
      method: "PUT",
      token,
      body: { content: invalidDraft },
      expectedStatus: 400
    });
    const draftError = String(invalidDraftResponse.error ?? "");
    assertCondition(draftError.includes("socials.facebookUrl"), "Expected backend draft validation error for invalid social URL.");

    const invalidEventThemeDraft = structuredClone(publishedContent ?? {});
    if (typeof invalidEventThemeDraft === "object" && invalidEventThemeDraft && "branding" in invalidEventThemeDraft) {
      const branding = invalidEventThemeDraft.branding as JsonRecord;
      branding.eventTheme = "halloween";
    }
    const invalidEventThemeResponse = await requestJson("/api/site/draft", {
      method: "PUT",
      token,
      body: { content: invalidEventThemeDraft },
      expectedStatus: 400
    });
    const eventThemeError = String(invalidEventThemeResponse.error ?? "");
    assertCondition(eventThemeError.includes("branding.eventTheme"), "Expected backend draft validation error for invalid event theme.");

    const validDraftResponse = await requestJson("/api/site/draft", {
      method: "PUT",
      token,
      body: { content: publishedContent }
    });
    assertCondition(Boolean(validDraftResponse.content), "Expected valid draft save success.");

    const invalidPublishPayload = structuredClone(publishedContent ?? {});
    if (typeof invalidPublishPayload === "object" && invalidPublishPayload && "products" in invalidPublishPayload) {
      const products = invalidPublishPayload.products as JsonRecord;
      if (Array.isArray(products.forex) && products.forex[0] && typeof products.forex[0] === "object") {
        (products.forex[0] as JsonRecord).title = "";
      } else if (Array.isArray(products.forex)) {
        products.forex.push({
          id: "invalid-1",
          title: "",
          shortDescription: "x",
          longDescription: "x",
          features: ["x"],
          rating: 4.5,
          isNew: false,
          category: "Forex",
          checkoutLink: "https://example.com"
        });
      }
    }

    const invalidPublishResponse = await requestJson("/api/site/publish", {
      method: "POST",
      token,
      body: { content: invalidPublishPayload },
      expectedStatus: 400
    });
    const publishError = String(invalidPublishResponse.error ?? "");
    assertCondition(publishError.toLowerCase().includes("title"), "Expected backend publish validation error for invalid product title.");

    const validPublishResponse = await requestJson("/api/site/publish", {
      method: "POST",
      token,
      body: { content: publishedContent }
    });
    assertCondition(Boolean(validPublishResponse.content), "Expected valid publish success.");

    console.log("Site validation tests passed.");
  } finally {
    if (child) await stopBackend(child);
    await rm(tempDir, { recursive: true, force: true });
  }
};

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
