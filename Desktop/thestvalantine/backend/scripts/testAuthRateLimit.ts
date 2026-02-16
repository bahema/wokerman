/* eslint-disable no-console */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const HOST = "127.0.0.1";
const PORT = 4121;
const BASE = `http://${HOST}:${PORT}`;
const OWNER_EMAIL = "auth-rate-limit@example.com";
const OWNER_PASSWORD = "BossPass123!";

type JsonRecord = Record<string, unknown>;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  return { status: response.status, payload };
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

const assertCondition = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const run = async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "autohub-auth-rate-limit-"));
  const mediaDir = path.join(tempDir, "storage");
  let child: ChildProcess | null = null;

  try {
    child = await startBackend(mediaDir);

    const signupStart = await requestJson("/api/auth/signup/start", {
      method: "POST",
      body: { email: OWNER_EMAIL, password: OWNER_PASSWORD }
    });
    if (signupStart.status !== 200) throw new Error(`Signup start failed: ${JSON.stringify(signupStart.payload)}`);
    const signupOtp = typeof signupStart.payload.devOtp === "string" ? signupStart.payload.devOtp : "";
    assertCondition(signupOtp.length > 0, "Expected dev OTP for signup.");

    const signupVerify = await requestJson("/api/auth/signup/verify", {
      method: "POST",
      body: { email: OWNER_EMAIL, otp: signupOtp }
    });
    if (signupVerify.status !== 200) throw new Error(`Signup verify failed: ${JSON.stringify(signupVerify.payload)}`);
    const token = ((signupVerify.payload.session as JsonRecord | undefined)?.token as string | undefined) ?? "";
    assertCondition(Boolean(token), "Expected auth token after signup.");

    const enable2fa = await requestJson("/api/auth/account", {
      method: "PUT",
      token,
      body: { fullName: "Rate Limit", email: OWNER_EMAIL, role: "Owner", timezone: "UTC", twoFactorEnabled: true }
    });
    if (enable2fa.status !== 200) throw new Error(`Enable 2FA failed: ${JSON.stringify(enable2fa.payload)}`);

    for (let i = 0; i < 5; i += 1) {
      const attempt = await requestJson("/api/auth/login/start", {
        method: "POST",
        body: { email: OWNER_EMAIL, password: "WrongPass999!" }
      });
      assertCondition(attempt.status === 400, `Expected failed login attempt ${i + 1} to return 400.`);
    }
    const blockedLogin = await requestJson("/api/auth/login/start", {
      method: "POST",
      body: { email: OWNER_EMAIL, password: "WrongPass999!" }
    });
    assertCondition(blockedLogin.status === 429, "Expected login/start to be throttled with 429.");
    assertCondition(typeof blockedLogin.payload.retryAfterSec === "number", "Expected retryAfterSec in throttled response.");

    for (let i = 0; i < 5; i += 1) {
      const otpAttempt = await requestJson("/api/auth/login/verify", {
        method: "POST",
        body: { email: OWNER_EMAIL, otp: "000000" }
      });
      assertCondition(otpAttempt.status === 400, `Expected failed otp attempt ${i + 1} to return 400.`);
    }
    const blockedOtp = await requestJson("/api/auth/login/verify", {
      method: "POST",
      body: { email: OWNER_EMAIL, otp: "000000" }
    });
    assertCondition(blockedOtp.status === 429, "Expected login/verify to be throttled with 429.");
    assertCondition(typeof blockedOtp.payload.retryAfterSec === "number", "Expected retryAfterSec in OTP throttled response.");

    console.log("Auth rate-limit tests passed.");
  } finally {
    if (child) await stopBackend(child);
    await rm(tempDir, { recursive: true, force: true });
  }
};

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
