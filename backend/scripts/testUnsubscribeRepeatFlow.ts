/* eslint-disable no-console */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
  if (options?.expectedStatus !== undefined && response.status !== options?.expectedStatus) {
    throw new Error(`${method} ${pathName} expected ${options.expectedStatus}, got ${response.status}: ${JSON.stringify(payload)}`);
  }
  return { status: response.status, payload };
};

const requestRedirect = async (url: string, expectedStatus = 303) => {
  const response = await fetch(url, { redirect: "manual" });
  if (response.status !== expectedStatus) {
    throw new Error(`Expected redirect status ${expectedStatus}, got ${response.status} for ${url}`);
  }
  return response.headers.get("location") ?? "";
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

const startBackend = async (opts: { port: number; mediaDir: string }): Promise<ChildProcess> => {
  const base = `http://127.0.0.1:${opts.port}`;
  const child = spawn(process.execPath, ["backend/dist/backend/src/index.js"], {
    cwd: path.resolve(process.cwd(), ".."),
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(opts.port),
      CORS_ORIGIN: "http://localhost:5180",
      CLIENT_PUBLIC_BASE_URL: "http://localhost:5180",
      API_PUBLIC_BASE_URL: base,
      MEDIA_DIR: opts.mediaDir,
      SMTP_HOST: "smtp.gmail.com",
      SMTP_PORT: "587",
      SMTP_USER: "test-smtp-user@example.com",
      SMTP_PASS: "test-smtp-pass"
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
  const tempDir = await mkdtemp(path.join(tmpdir(), "autohub-unsubscribe-repeat-test-"));
  const mediaDir = path.join(tempDir, "storage");
  const port = 4132;
  const base = `http://127.0.0.1:${port}`;
  let child: ChildProcess | null = null;

  try {
    child = await startBackend({ port, mediaDir });

    const email = `repeat-flow-${Date.now()}@example.com`;
    const subscribed = await requestJson(base, "/api/email/subscribe", {
      method: "POST",
      body: {
        name: "Repeat Flow User",
        email,
        phone: ""
      },
      expectedStatus: 201
    });

    const subscriberId = typeof subscribed.payload.subscriberId === "string" ? subscribed.payload.subscriberId : "";
    const confirmUrl = typeof subscribed.payload.confirmUrl === "string" ? subscribed.payload.confirmUrl : "";
    const unsubscribeUrl = typeof subscribed.payload.unsubscribeUrl === "string" ? subscribed.payload.unsubscribeUrl : "";
    assertCondition(subscriberId, "Expected subscriberId.");
    assertCondition(confirmUrl, "Expected confirmUrl.");
    assertCondition(unsubscribeUrl, "Expected unsubscribeUrl.");

    const confirmRedirect = await requestRedirect(confirmUrl);
    assertCondition(confirmRedirect.includes("/confirm?status=success"), `Unexpected confirm redirect: ${confirmRedirect}`);

    const firstUnsubscribeRedirect = await requestRedirect(unsubscribeUrl);
    assertCondition(firstUnsubscribeRedirect.includes("/unsubscribe?status=success"), `Unexpected unsubscribe redirect: ${firstUnsubscribeRedirect}`);

    const statePath = path.join(mediaDir, "email", "state.json");
    const firstState = JSON.parse(await readFile(statePath, "utf8")) as {
      subscribers: Array<{ id: string; status: string }>;
      events: Array<{ id: string; eventType: string; subscriberId: string | null; campaignId: string | null; meta: Record<string, unknown>; createdAt: string }>;
    };

    const firstSubscriber = firstState.subscribers.find((item) => item.id === subscriberId);
    assertCondition(firstSubscriber?.status === "unsubscribed", "Expected unsubscribed status after first unsubscribe.");

    // Simulate admin resend event in test storage to trigger second-unsubscribe delete behavior.
    firstState.events.unshift({
      id: `manual-resend-${Date.now()}`,
      eventType: "lead_confirmation_resent",
      subscriberId,
      campaignId: null,
      meta: { source: "manual_test_injection" },
      createdAt: new Date().toISOString()
    });
    await writeFile(statePath, JSON.stringify(firstState, null, 2));

    const secondUnsubscribeRedirect = await requestRedirect(unsubscribeUrl);
    assertCondition(
      secondUnsubscribeRedirect.includes("/unsubscribe?status=success"),
      `Unexpected second unsubscribe redirect: ${secondUnsubscribeRedirect}`
    );

    const finalState = JSON.parse(await readFile(statePath, "utf8")) as {
      subscribers: Array<{ id: string }>;
      events: Array<{ eventType: string; subscriberId: string | null; meta?: Record<string, unknown> }>;
    };

    const stillExists = finalState.subscribers.some((item) => item.id === subscriberId);
    assertCondition(!stillExists, "Expected subscriber to be deleted after second unsubscribe.");

    const deletedEvent = finalState.events.find(
      (item) =>
        item.eventType === "lead_deleted" &&
        item.subscriberId === subscriberId &&
        item.meta &&
        item.meta.reason === "repeat_unsubscribe_after_resend"
    );
    assertCondition(Boolean(deletedEvent), "Expected lead_deleted event with repeat_unsubscribe_after_resend reason.");

    const analyticsPath = path.join(mediaDir, "analytics", "events.json");
    const analyticsRaw = JSON.parse(await readFile(analyticsPath, "utf8")) as JsonRecord | JsonRecord[];
    const analyticsItems = Array.isArray(analyticsRaw)
      ? analyticsRaw
      : (Array.isArray((analyticsRaw as { events?: unknown }).events) ? ((analyticsRaw as { events: JsonRecord[] }).events) : []);
    const matchingNotifications = analyticsItems.filter(
      (item) =>
        item.eventName === "email.unsubscribe_notification" &&
        typeof item.payload === "object" &&
        item.payload !== null &&
        (item.payload as { subscriberId?: string }).subscriberId === subscriberId
    );
    assertCondition(matchingNotifications.length >= 1, "Expected email.unsubscribe_notification analytics event.");

    const repeatNotification = matchingNotifications.find((item) => {
      const payload = item.payload as { unsubscribeCount?: number; deletedAfterRepeatUnsubscribe?: boolean; at?: string };
      return payload.unsubscribeCount === 2 && payload.deletedAfterRepeatUnsubscribe === true && typeof payload.at === "string";
    });
    assertCondition(Boolean(repeatNotification), "Expected repeat unsubscribe notification payload with count=2 and deleted=true.");

    console.log("Unsubscribe repeat-flow tests passed.");
  } finally {
    if (child) await stopBackend(child);
    await rm(tempDir, { recursive: true, force: true });
  }
};

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
