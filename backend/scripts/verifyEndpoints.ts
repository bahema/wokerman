/* eslint-disable no-console */
import "dotenv/config";

const BASE = process.env.API_BASE_URL ?? "http://localhost:4000";
const OWNER_EMAIL = process.env.VERIFY_OWNER_EMAIL ?? "boss@example.com";
const OWNER_PASSWORD = process.env.VERIFY_OWNER_PASSWORD ?? "BossPass123!";

const assertOk = async (label: string, response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${label} failed (${response.status}): ${text}`);
  }
};

const run = async () => {
  console.log(`Checking API at ${BASE}`);

  let authToken = "";

  const authStatus = await fetch(`${BASE}/api/auth/status`);
  await assertOk("GET /api/auth/status", authStatus);
  const authBody = (await authStatus.json()) as { hasOwner: boolean };

  if (!authBody.hasOwner) {
    const signupStart = await fetch(`${BASE}/api/auth/signup/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD })
    });
    await assertOk("POST /api/auth/signup/start", signupStart);
    const signupStartBody = (await signupStart.json()) as { devOtp?: string };
    if (!signupStartBody.devOtp) throw new Error("Missing devOtp for signup verification.");

    const signupVerify = await fetch(`${BASE}/api/auth/signup/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: OWNER_EMAIL, otp: signupStartBody.devOtp })
    });
    await assertOk("POST /api/auth/signup/verify", signupVerify);
    const signupVerifyBody = (await signupVerify.json()) as { session?: { token?: string } };
    authToken = signupVerifyBody.session?.token ?? "";
  } else {
    const loginStart = await fetch(`${BASE}/api/auth/login/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD })
    });
    await assertOk("POST /api/auth/login/start", loginStart);
    const loginStartBody = (await loginStart.json()) as { requiresOtp?: boolean; devOtp?: string; session?: { token?: string } };
    if (loginStartBody.requiresOtp) {
      if (!loginStartBody.devOtp) {
        throw new Error("Missing devOtp for login verification. Set VERIFY_OWNER_EMAIL and VERIFY_OWNER_PASSWORD to real owner credentials.");
      }
      const loginVerify = await fetch(`${BASE}/api/auth/login/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: OWNER_EMAIL, otp: loginStartBody.devOtp })
      });
      await assertOk("POST /api/auth/login/verify", loginVerify);
      const loginVerifyBody = (await loginVerify.json()) as { session?: { token?: string } };
      authToken = loginVerifyBody.session?.token ?? "";
    } else {
      authToken = loginStartBody.session?.token ?? "";
    }
  }

  if (!authToken) throw new Error("Failed to obtain auth token for protected endpoints.");
  const authHeaders = { Authorization: `Bearer ${authToken}` };

  const health = await fetch(`${BASE}/api/health`);
  await assertOk("GET /api/health", health);

  const published = await fetch(`${BASE}/api/site/published`);
  await assertOk("GET /api/site/published", published);

  const draftBefore = await fetch(`${BASE}/api/site/draft`);
  await assertOk("GET /api/site/draft", draftBefore);

  const pubBody = (await published.json()) as { content: unknown };
  const draftPut = await fetch(`${BASE}/api/site/draft`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ content: pubBody.content })
  });
  await assertOk("PUT /api/site/draft", draftPut);

  const publish = await fetch(`${BASE}/api/site/publish`, { method: "POST", headers: { ...authHeaders } });
  await assertOk("POST /api/site/publish", publish);

  const reset = await fetch(`${BASE}/api/site/reset`, { method: "POST", headers: { ...authHeaders } });
  await assertOk("POST /api/site/reset", reset);

  const mediaGet = await fetch(`${BASE}/api/media`);
  await assertOk("GET /api/media", mediaGet);

  const form = new FormData();
  const blob = new Blob(["fake image payload"], { type: "image/png" });
  form.append("files", blob, "check.png");
  const mediaPost = await fetch(`${BASE}/api/media`, { method: "POST", headers: { ...authHeaders }, body: form });
  await assertOk("POST /api/media", mediaPost);
  const mediaPostBody = (await mediaPost.json()) as { items: Array<{ id: string }> };
  const uploadedId = mediaPostBody.items?.[0]?.id;

  if (uploadedId) {
    const mediaDelete = await fetch(`${BASE}/api/media/${uploadedId}`, { method: "DELETE", headers: { ...authHeaders } });
    await assertOk("DELETE /api/media/:id", mediaDelete);
  }

  const analyticsPost = await fetch(`${BASE}/api/analytics/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventName: "product_link_click",
      payload: { productId: "smoke-test-product", source: "verifyEndpoints" }
    })
  });
  await assertOk("POST /api/analytics/events", analyticsPost);

  const analyticsSummary = await fetch(`${BASE}/api/analytics/summary`, { headers: { ...authHeaders } });
  await assertOk("GET /api/analytics/summary", analyticsSummary);

  console.log("Endpoint verification completed successfully.");
};

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
