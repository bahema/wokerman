/* eslint-disable no-console */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

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
  base: string,
  pathName: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    expectedStatus?: number;
  }
) => {
  const method = options?.method ?? "GET";
  const headers: Record<string, string> = {};
  let body: string | undefined;
  if (options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${base}${pathName}`, { method, headers, body });
  const payload = await readJson(response);
  if (options?.expectedStatus !== undefined && response.status !== options.expectedStatus) {
    throw new Error(`${method} ${pathName} expected ${options.expectedStatus}, got ${response.status}: ${JSON.stringify(payload)}`);
  }
  return { status: response.status, payload };
};

const waitForHealth = async (base: string) => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch {
      // wait and retry
    }
    await delay(250);
  }
  throw new Error(`Backend at ${base} did not become healthy in time.`);
};

const startBackend = async (opts: {
  port: number;
  mediaDir: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
}): Promise<ChildProcess> => {
  const base = `http://127.0.0.1:${opts.port}`;
  const child = spawn(process.execPath, ["dist/backend/src/index.js"], {
    cwd: path.resolve(process.cwd()),
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(opts.port),
      CORS_ORIGIN: "http://localhost:5173",
      MEDIA_DIR: opts.mediaDir,
      API_PUBLIC_BASE_URL: base,
      SMTP_HOST: opts.smtpHost,
      SMTP_PORT: opts.smtpPort,
      SMTP_USER: opts.smtpUser,
      SMTP_PASS: opts.smtpPass
    }
  });

  child.stdout?.on("data", (chunk) => process.stdout.write(String(chunk)));
  child.stderr?.on("data", (chunk) => process.stderr.write(String(chunk)));

  await waitForHealth(base);
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
  const tempDir = await mkdtemp(path.join(tmpdir(), "autohub-email-subscription-test-"));
  const mediaDirA = path.join(tempDir, "storage-a");
  const mediaDirB = path.join(tempDir, "storage-b");
  const portA = 4123;
  const portB = 4124;
  const baseA = `http://127.0.0.1:${portA}`;
  const baseB = `http://127.0.0.1:${portB}`;
  let childA: ChildProcess | null = null;
  let childB: ChildProcess | null = null;

  try {
    childA = await startBackend({
      port: portA,
      mediaDir: mediaDirA,
      smtpHost: "smtp.gmail.com",
      smtpPort: "587",
      smtpUser: "test-smtp-user@example.com",
      smtpPass: "test-smtp-pass"
    });

    const firstSub = await requestJson(baseA, "/api/email/subscribe", {
      method: "POST",
      body: {
        name: "Email Test User",
        email: "email-subscription-test@example.com",
        phone: "1234567890"
      },
      expectedStatus: 201
    });
    assertCondition(firstSub.payload.ok === true, "Expected successful first subscription.");
    assertCondition(typeof firstSub.payload.subscriberId === "string", "Expected subscriberId in successful subscription.");

    const duplicateSub = await requestJson(baseA, "/api/email/subscribe", {
      method: "POST",
      body: {
        name: "Email Test User Again",
        email: "email-subscription-test@example.com",
        phone: "1234567890"
      },
      expectedStatus: 409
    });
    assertCondition(duplicateSub.payload.error === "ALREADY_SUBSCRIBED", "Expected duplicate rejection error code.");

    childB = await startBackend({
      port: portB,
      mediaDir: mediaDirB,
      smtpHost: "",
      smtpPort: "",
      smtpUser: "",
      smtpPass: ""
    });

    const missingSmtpSub = await requestJson(baseB, "/api/email/subscribe", {
      method: "POST",
      body: {
        name: "Missing SMTP User",
        email: "missing-smtp@example.com",
        phone: ""
      },
      expectedStatus: 400
    });
    assertCondition(missingSmtpSub.payload.error === "SMTP_SETTINGS_REQUIRED", "Expected SMTP_SETTINGS_REQUIRED for missing SMTP config.");
    const missingFields = Array.isArray(missingSmtpSub.payload.missingFields) ? (missingSmtpSub.payload.missingFields as unknown[]) : [];
    assertCondition(missingFields.includes("smtpHost"), "Expected smtpHost in missingFields.");
    assertCondition(missingFields.includes("smtpPort"), "Expected smtpPort in missingFields.");
    assertCondition(missingFields.includes("smtpUser"), "Expected smtpUser in missingFields.");
    assertCondition(missingFields.includes("smtpPass"), "Expected smtpPass in missingFields.");

    console.log("Email subscription tests passed.");
  } finally {
    if (childA) await stopBackend(childA);
    if (childB) await stopBackend(childB);
    await rm(tempDir, { recursive: true, force: true });
  }
};

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
