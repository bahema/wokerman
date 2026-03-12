/* eslint-disable no-console */
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const HOST = "127.0.0.1";
const PORT = 4122;
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
      method?: "GET" | "POST" | "PUT" | "DELETE";
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
  const tempDir = await mkdtemp(path.join(tmpdir(), "autohub-fashion-video-routes-test-"));
  const mediaDir = path.join(tempDir, "storage");
  let child: ChildProcess | null = null;

  try {
    await mkdir(path.join(mediaDir, "auth"), { recursive: true });
    await copyFile(path.resolve(process.cwd(), "storage", "auth", "state.json"), path.join(mediaDir, "auth", "state.json"));
    child = await startBackend(mediaDir);
    const client = new CookieSessionClient();

    const publicPublished = await client.request("/api/fashion-videos/published");
    const publishedContent = publicPublished.content as { videos?: Array<Record<string, unknown>> };
    assertCondition(Array.isArray(publishedContent?.videos), "Expected published fashion video content.");
    assertCondition(Array.isArray(publishedContent?.videos), "Expected fashion video list in published response.");

    const publicMeta = await client.request("/api/fashion-videos/meta");
    assertCondition(typeof publicMeta.updatedAt === "string", "Expected fashion video meta updatedAt.");

    await client.request("/api/fashion-videos/draft", { expectedStatus: 401 });

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
    assertCondition(session.valid === true, "Expected cookie session after fashion video login.");

    const initialDraft = await client.request("/api/fashion-videos/draft");
    assertCondition(initialDraft.content === null || typeof initialDraft.content === "object", "Expected null or object fashion video draft.");

    const nextContent = structuredClone((initialDraft.content ?? publicPublished.content) as { videos: Array<Record<string, unknown>> });
    nextContent.videos[0].title = "Backend video route publish test title";
    nextContent.videos[0].status = "draft";

    const savedDraft = await client.request("/api/fashion-videos/draft", {
      method: "PUT",
      includeCsrf: true,
      body: { content: nextContent }
    });
    assertCondition(savedDraft.content?.videos?.[0]?.title === "Backend video route publish test title", "Expected saved fashion video draft payload.");

    const savedMeta = await client.request("/api/fashion-videos/meta");
    assertCondition(savedMeta.hasDraft === true, "Expected fashion video draft to exist after save.");

    const publishedResponse = await client.request("/api/fashion-videos/publish", {
      method: "POST",
      includeCsrf: true
    });
    assertCondition(
      publishedResponse.content?.videos?.[0]?.title === "Backend video route publish test title",
      "Expected video publish to promote saved draft."
    );

    const summary = await client.request("/api/fashion-videos/engagement/summary", {
      method: "POST",
      body: {
        clientId: "video-routes-test-client",
        videos: [
          {
            id: "video-card-1",
            seedViews: 10,
            seedLikes: 2,
            seedDislikes: 1,
            seedComments: []
          }
        ]
      }
    });
    assertCondition(typeof summary.views?.["video-card-1"] === "number", "Expected engagement summary views.");

    const viewResult = await client.request("/api/fashion-videos/engagement/view", {
      method: "POST",
      body: {
        clientId: "video-routes-test-client",
        videoId: "video-card-1",
        seedViews: 10
      }
    });
    assertCondition(typeof viewResult.views === "number" && viewResult.views >= 11, "Expected recorded video view.");

    const reactResult = await client.request("/api/fashion-videos/engagement/react", {
      method: "POST",
      body: {
        clientId: "video-routes-test-client",
        videoId: "video-card-1",
        reaction: "like",
        seedLikes: 2,
        seedDislikes: 1
      }
    });
    assertCondition(reactResult.reaction === "like", "Expected stored video reaction.");

    const commentResult = await client.request("/api/fashion-videos/comments", {
      method: "POST",
      body: {
        clientId: "video-routes-test-client",
        videoId: "video-card-1",
        name: "Routes Tester",
        text: "New test comment"
      }
    });
    const commentId = typeof commentResult.comment?.id === "string" ? commentResult.comment.id : "";
    assertCondition(Boolean(commentId), "Expected created fashion video comment.");

    const adminEngagement = await client.request("/api/fashion-videos/engagement/admin");
    const byVideo = Array.isArray(adminEngagement.byVideo) ? adminEngagement.byVideo : [];
    const firstVideoSummary = byVideo.find((item) => item?.videoId === "video-card-1");
    assertCondition(Boolean(firstVideoSummary), "Expected admin engagement summary for first video.");

    const moderated = await client.request("/api/fashion-videos/comments/moderate", {
      method: "POST",
      includeCsrf: true,
      body: {
        videoId: "video-card-1",
        commentId,
        status: "hidden"
      }
    });
    assertCondition(moderated.comment?.status === "hidden", "Expected moderated fashion video comment status.");

    const analytics = await client.request("/api/fashion-videos/analytics/summary");
    assertCondition(typeof analytics.totals?.totalVideos === "number", "Expected fashion video analytics totals.");

    const promoted = await client.request("/api/fashion-videos/promote", {
      method: "POST",
      includeCsrf: true,
      body: { videoId: "video-card-4" }
    });
    const promotedVideo = Array.isArray(promoted.content?.videos)
      ? promoted.content.videos.find((video: Record<string, unknown>) => video.id === "video-card-4")
      : null;
    assertCondition(promotedVideo?.isPromoted === true, "Expected promote endpoint to toggle promotion on.");

    const placed = await client.request("/api/fashion-videos/placement", {
      method: "POST",
      includeCsrf: true,
      body: { videoId: "video-card-5", placement: "series" }
    });
    const placedVideo = Array.isArray(placed.content?.videos)
      ? placed.content.videos.find((video: Record<string, unknown>) => video.id === "video-card-5")
      : null;
    assertCondition(placedVideo?.placement === "series", "Expected placement endpoint to update placement.");

    const reorderBefore = (placed.content?.videos as Array<Record<string, unknown>>).find((video) => video.id === "video-card-6");
    const reordered = await client.request("/api/fashion-videos/reorder", {
      method: "POST",
      includeCsrf: true,
      body: { videoId: "video-card-6", direction: "up" }
    });
    const reorderAfter = Array.isArray(reordered.content?.videos)
      ? reordered.content.videos.find((video: Record<string, unknown>) => video.id === "video-card-6")
      : null;
    assertCondition(
      typeof reorderBefore?.sortOrder === "number" &&
        typeof reorderAfter?.sortOrder === "number" &&
        reorderAfter.sortOrder < reorderBefore.sortOrder,
      "Expected reorder endpoint to move video upward."
    );

    const deleted = await client.request("/api/fashion-videos/video-card-12", {
      method: "DELETE",
      includeCsrf: true
    });
    const deletedExists = Array.isArray(deleted.content?.videos)
      ? deleted.content.videos.some((video: Record<string, unknown>) => video.id === "video-card-12")
      : false;
    assertCondition(!deletedExists, "Expected delete endpoint to remove video.");

    const resetResponse = await client.request("/api/fashion-videos/reset", {
      method: "POST",
      includeCsrf: true
    });
    const resetVideos = (resetResponse.published as { videos?: Array<Record<string, unknown>> })?.videos ?? [];
    assertCondition(resetVideos.some((video) => video.id === "video-card-12"), "Expected reset to restore default fashion video content.");

    console.log("Fashion video route tests passed.");
  } finally {
    if (child) await stopBackend(child);
    await rm(tempDir, { recursive: true, force: true });
  }
};

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
