/* eslint-disable no-console */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const HOST = "127.0.0.1";
const PORT = 4119;
const BASE = `http://${HOST}:${PORT}`;
const OWNER_EMAIL = "boss-auth-test@example.com";
const OWNER_PASSWORD = "BossPass123!";
const NEXT_PASSWORD = "BossPass456!";
const ATTEMPTED_NEW_EMAIL = "other-owner@example.com";

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
  const expectedStatus = options?.expectedStatus;
  if (expectedStatus !== undefined) {
    if (response.status !== expectedStatus) {
      const payload = await readJson(response);
      throw new Error(`${method} ${pathName} expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(payload)}`);
    }
  } else if (!response.ok) {
    const payload = await readJson(response);
    throw new Error(`${method} ${pathName} failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return readJson(response);
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
  const tempDir = await mkdtemp(path.join(tmpdir(), "autohub-auth-test-"));
  const mediaDir = path.join(tempDir, "storage");
  let child: ChildProcess | null = null;

  try {
    child = await startBackend(mediaDir);

    const status = await requestJson("/api/auth/status");
    assertCondition(status.hasOwner === false, "Expected no owner before signup.");

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
    const sessionAfterSignup = signupVerify.session as JsonRecord | undefined;
    const tokenSignup = typeof sessionAfterSignup?.token === "string" ? sessionAfterSignup.token : "";
    assertCondition(Boolean(tokenSignup), "Expected session token after signup.");

    const accountInitial = await requestJson("/api/auth/account", { token: tokenSignup });
    assertCondition(accountInitial.twoFactorEnabled === false, "Expected 2FA disabled by default.");

    await requestJson("/api/auth/account", {
      method: "PUT",
      token: tokenSignup,
      body: {
        fullName: "Auth Tester",
        email: OWNER_EMAIL,
        role: "Owner",
        timezone: "UTC",
        twoFactorEnabled: true
      }
    });

    const immutableAccountResponse = await requestJson("/api/auth/account", {
      method: "PUT",
      token: tokenSignup,
      body: {
        fullName: "Auth Tester Locked",
        email: ATTEMPTED_NEW_EMAIL,
        role: "Manager",
        timezone: "UTC",
        twoFactorEnabled: true
      }
    });
    assertCondition(immutableAccountResponse.email === OWNER_EMAIL, "Expected owner email to remain immutable.");
    assertCondition(immutableAccountResponse.role === "Owner", "Expected owner role to remain immutable.");

    await requestJson("/api/auth/logout", { method: "POST", token: tokenSignup });

    const loginStartWith2fa = await requestJson("/api/auth/login/start", {
      method: "POST",
      body: { email: OWNER_EMAIL, password: OWNER_PASSWORD }
    });
    assertCondition(loginStartWith2fa.requiresOtp === true, "Expected OTP requirement when 2FA is enabled.");
    const loginOtp = typeof loginStartWith2fa.devOtp === "string" ? loginStartWith2fa.devOtp : "";
    assertCondition(loginOtp.length > 0, "Expected login OTP when 2FA is enabled.");

    const loginVerifyWith2fa = await requestJson("/api/auth/login/verify", {
      method: "POST",
      body: { email: OWNER_EMAIL, otp: loginOtp }
    });
    const sessionAfter2faLogin = loginVerifyWith2fa.session as JsonRecord | undefined;
    const token2fa = typeof sessionAfter2faLogin?.token === "string" ? sessionAfter2faLogin.token : "";
    assertCondition(Boolean(token2fa), "Expected session token after 2FA login.");

    const rotatedPasswordResponse = await requestJson("/api/auth/password", {
      method: "PUT",
      token: token2fa,
      body: { currentPassword: OWNER_PASSWORD, newPassword: NEXT_PASSWORD }
    });
    const rotatedSession = rotatedPasswordResponse.session as JsonRecord | undefined;
    const rotatedToken = typeof rotatedSession?.token === "string" ? rotatedSession.token : "";
    assertCondition(Boolean(rotatedToken), "Expected rotated session token after password change.");
    const oldTokenStatus = await requestJson("/api/auth/session", { token: token2fa });
    assertCondition(oldTokenStatus.valid === false, "Expected old session token to be invalid after password change.");
    const rotatedTokenStatus = await requestJson("/api/auth/session", { token: rotatedToken });
    assertCondition(rotatedTokenStatus.valid === true, "Expected rotated session token to be valid after password change.");

    await requestJson("/api/auth/login/start", {
      method: "POST",
      body: { email: OWNER_EMAIL, password: OWNER_PASSWORD },
      expectedStatus: 400
    });

    const loginStartAfterPasswordChange = await requestJson("/api/auth/login/start", {
      method: "POST",
      body: { email: OWNER_EMAIL, password: NEXT_PASSWORD }
    });
    assertCondition(loginStartAfterPasswordChange.requiresOtp === true, "Expected OTP still required before disabling 2FA.");
    const loginOtp2 = typeof loginStartAfterPasswordChange.devOtp === "string" ? loginStartAfterPasswordChange.devOtp : "";
    assertCondition(loginOtp2.length > 0, "Expected OTP after password change.");

    const loginVerifyAfterPasswordChange = await requestJson("/api/auth/login/verify", {
      method: "POST",
      body: { email: OWNER_EMAIL, otp: loginOtp2 }
    });
    const sessionAfterPasswordChange = loginVerifyAfterPasswordChange.session as JsonRecord | undefined;
    const tokenAfterPasswordChange = typeof sessionAfterPasswordChange?.token === "string" ? sessionAfterPasswordChange.token : "";
    assertCondition(Boolean(tokenAfterPasswordChange), "Expected token after login with new password.");

    await requestJson("/api/auth/logout-all", {
      method: "POST",
      token: tokenAfterPasswordChange,
      body: { keepCurrent: true }
    });
    const keepCurrentStatus = await requestJson("/api/auth/session", { token: tokenAfterPasswordChange });
    assertCondition(keepCurrentStatus.valid === true, "Expected current session to remain active after logout-all keepCurrent.");

    await requestJson("/api/auth/account", {
      method: "PUT",
      token: tokenAfterPasswordChange,
      body: {
        fullName: "Auth Tester",
        email: OWNER_EMAIL,
        role: "Owner",
        timezone: "UTC",
        twoFactorEnabled: false
      }
    });

    await requestJson("/api/auth/logout", { method: "POST", token: tokenAfterPasswordChange });

    const loginStartWithout2fa = await requestJson("/api/auth/login/start", {
      method: "POST",
      body: { email: OWNER_EMAIL, password: NEXT_PASSWORD }
    });
    assertCondition(loginStartWithout2fa.requiresOtp === false, "Expected no OTP when 2FA is disabled.");
    const sessionWithout2fa = loginStartWithout2fa.session as JsonRecord | undefined;
    const tokenNo2fa = typeof sessionWithout2fa?.token === "string" ? sessionWithout2fa.token : "";
    assertCondition(Boolean(tokenNo2fa), "Expected immediate session token when 2FA is disabled.");

    const sessionCheck = await requestJson("/api/auth/session", { token: tokenNo2fa });
    assertCondition(sessionCheck.valid === true, "Expected active session to validate.");

    await requestJson("/api/auth/logout", { method: "POST", token: tokenNo2fa });
    const sessionCheckAfterLogout = await requestJson("/api/auth/session", { token: tokenNo2fa });
    assertCondition(sessionCheckAfterLogout.valid === false, "Expected session to be invalid after logout.");

    console.log("Auth flow tests passed.");
  } finally {
    if (child) await stopBackend(child);
    await rm(tempDir, { recursive: true, force: true });
  }
};

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
