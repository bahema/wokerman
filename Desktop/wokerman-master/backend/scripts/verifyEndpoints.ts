/* eslint-disable no-console */
import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const OWNER_EMAIL = process.env.VERIFY_OWNER_EMAIL ?? "boss@example.com";
const OWNER_PASSWORD = process.env.VERIFY_OWNER_PASSWORD ?? "BossPass123!";
const AUTH_PASSWORD_PEPPER = (process.env.AUTH_PASSWORD_PEPPER ?? "").trim();
const LOCAL_PORT = Number(process.env.VERIFY_LOCAL_PORT ?? "4140");

const assertOk = async (label: string, response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${label} failed (${response.status}): ${text}`);
  }
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const hashOwnerPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const input = AUTH_PASSWORD_PEPPER ? `${password}:${AUTH_PASSWORD_PEPPER}` : password;
  const passwordHash = scryptSync(input, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 96 * 1024 * 1024
  }).toString("hex");
  return { passwordHash, passwordSalt: salt };
};

const seedOwnerAuthState = async (mediaDir: string) => {
  const authDir = path.join(mediaDir, "auth");
  await mkdir(authDir, { recursive: true });
  const { passwordHash, passwordSalt } = hashOwnerPassword(OWNER_PASSWORD);
  const nowIso = new Date().toISOString();
  const state = {
    owner: {
      email: OWNER_EMAIL.toLowerCase(),
      fullName: "Endpoint Verify Owner",
      role: "Owner",
      timezone: "UTC",
      passwordHash,
      passwordSalt,
      createdAt: nowIso
    },
    sessions: [],
    trustedDevices: [],
    attemptState: {},
    updatedAt: nowIso
  };
  await writeFile(path.join(authDir, "state.json"), JSON.stringify(state, null, 2), "utf-8");
};

const waitForHealth = async (base: string) => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch {
      // retry until service is healthy
    }
    await delay(250);
  }
  throw new Error(`Backend at ${base} did not become healthy in time.`);
};

const startBackend = async (base: string, mediaDir: string): Promise<ChildProcess> => {
  const child = spawn(process.execPath, ["dist/backend/src/index.js"], {
    cwd: path.resolve(process.cwd()),
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(LOCAL_PORT),
      CORS_ORIGIN: "http://localhost:5173",
      MEDIA_DIR: mediaDir,
      API_PUBLIC_BASE_URL: base
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

const runChecks = async (base: string) => {
  console.log(`Checking API at ${base}`);

  let authToken = "";

  const authStatus = await fetch(`${base}/api/auth/status`);
  await assertOk("GET /api/auth/status", authStatus);
  const authBody = (await authStatus.json()) as { hasOwner: boolean };

  if (!authBody.hasOwner) {
    throw new Error("No owner account exists. Create owner credentials first; account signup bootstrap is disabled.");
  }

  const loginStart = await fetch(`${base}/api/auth/login/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD })
  });
  await assertOk("POST /api/auth/login/start", loginStart);
  const loginStartBody = (await loginStart.json()) as {
    requiresOtp?: boolean;
    devOtp?: string;
    authToken?: string;
    session?: { token?: string };
  };
  if (loginStartBody.requiresOtp) {
    if (!loginStartBody.devOtp) {
      throw new Error("Missing devOtp for login verification. Set VERIFY_OWNER_EMAIL and VERIFY_OWNER_PASSWORD to real owner credentials.");
    }
    const loginVerify = await fetch(`${base}/api/auth/login/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: OWNER_EMAIL, otp: loginStartBody.devOtp })
    });
    await assertOk("POST /api/auth/login/verify", loginVerify);
    const loginVerifyBody = (await loginVerify.json()) as { session?: { token?: string } };
    authToken = loginVerifyBody.session?.token ?? "";
  } else {
    authToken = loginStartBody.authToken ?? loginStartBody.session?.token ?? "";
  }

  if (!authToken) throw new Error("Failed to obtain auth token for protected endpoints.");
  const authHeaders = { Authorization: `Bearer ${authToken}` };

  const health = await fetch(`${base}/api/health`);
  await assertOk("GET /api/health", health);

  const published = await fetch(`${base}/api/site/published`);
  await assertOk("GET /api/site/published", published);

  const draftBefore = await fetch(`${base}/api/site/draft`, { headers: { ...authHeaders } });
  await assertOk("GET /api/site/draft", draftBefore);

  const pubBody = (await published.json()) as { content: unknown };
  const draftPut = await fetch(`${base}/api/site/draft`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ content: pubBody.content })
  });
  await assertOk("PUT /api/site/draft", draftPut);

  const publish = await fetch(`${base}/api/site/publish`, { method: "POST", headers: { ...authHeaders } });
  await assertOk("POST /api/site/publish", publish);

  const reset = await fetch(`${base}/api/site/reset`, { method: "POST", headers: { ...authHeaders } });
  await assertOk("POST /api/site/reset", reset);

  const mediaGet = await fetch(`${base}/api/media`);
  await assertOk("GET /api/media", mediaGet);

  const form = new FormData();
  const blob = new Blob(["fake image payload"], { type: "image/png" });
  form.append("files", blob, "check.png");
  const mediaPost = await fetch(`${base}/api/media`, { method: "POST", headers: { ...authHeaders }, body: form });
  await assertOk("POST /api/media", mediaPost);
  const mediaPostBody = (await mediaPost.json()) as { items: Array<{ id: string }> };
  const uploadedId = mediaPostBody.items?.[0]?.id;

  if (uploadedId) {
    const mediaDelete = await fetch(`${base}/api/media/${uploadedId}`, { method: "DELETE", headers: { ...authHeaders } });
    await assertOk("DELETE /api/media/:id", mediaDelete);
  }

  const analyticsPost = await fetch(`${base}/api/analytics/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventName: "product_link_click",
      payload: { productId: "smoke-test-product", source: "verifyEndpoints" }
    })
  });
  await assertOk("POST /api/analytics/events", analyticsPost);

  const analyticsSummary = await fetch(`${base}/api/analytics/summary`, { headers: { ...authHeaders } });
  await assertOk("GET /api/analytics/summary", analyticsSummary);

  console.log("Endpoint verification completed successfully.");
};

const run = async () => {
  const externalBase = process.env.API_BASE_URL?.trim();
  if (externalBase) {
    await runChecks(externalBase);
    return;
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), "autohub-verify-endpoints-"));
  const mediaDir = path.join(tempDir, "storage");
  const base = `http://127.0.0.1:${LOCAL_PORT}`;
  let child: ChildProcess | null = null;

  try {
    await seedOwnerAuthState(mediaDir);
    child = await startBackend(base, mediaDir);
    await runChecks(base);
  } finally {
    if (child) await stopBackend(child);
    await rm(tempDir, { recursive: true, force: true });
  }
};

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
