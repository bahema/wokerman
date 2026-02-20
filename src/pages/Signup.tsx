import { useEffect, useMemo, useState } from "react";
import { getAuthStatus, startLoginOtp, verifyLoginOtp } from "../utils/authTrust";
import { resolveLoginStart } from "./signupFlow";
import { withBasePath } from "../utils/basePath";

type SignupProps = {
  postLoginPath?: string;
};

const resolvePostLoginPath = (input?: string) => {
  if (!input) return "/admin";
  try {
    const parsed = new URL(input, window.location.origin);
    if (parsed.origin !== window.location.origin) return "/admin";
    if (parsed.pathname === "/admin" || parsed.pathname.startsWith("/boss/")) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return "/admin";
  } catch {
    return "/admin";
  }
};

const Signup = ({ postLoginPath }: SignupProps) => {
  const [hasOwner, setHasOwner] = useState(false);
  const [statusReady, setStatusReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"credentials" | "otp" | "done">("credentials");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const nextPathAfterLogin = resolvePostLoginPath(postLoginPath);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await getAuthStatus();
        if (!cancelled) {
          setHasOwner(status.hasOwner);
        }
      } finally {
        if (!cancelled) setStatusReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const title = useMemo(() => "Boss Login", []);
  const subtitle = useMemo(
    () => "Owner-only access. Client subscriptions work through email forms and do not require account login.",
    []
  );

  const startAuth = async () => {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const response = await startLoginOtp(email.trim().toLowerCase(), password);
      const next = resolveLoginStart({ requiresOtp: response.requiresOtp, devOtp: response.devOtp });
      setInfo(next.info);
      setStep(next.step);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send OTP.";
      if (/invalid credentials/i.test(message) && hasOwner) {
        setError("Invalid credentials. Signup is disabled because an owner account already exists.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await verifyLoginOtp(email.trim().toLowerCase(), otp.trim());
      setStep("done");
      setInfo("Login successful.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify OTP.");
    } finally {
      setBusy(false);
    }
  };

  if (!statusReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
        Loading authentication system...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/40 blur-3xl dark:bg-cyan-900/20" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-blue-300/40 blur-3xl dark:bg-blue-900/20" />

      <div className="mx-auto grid w-full max-w-5xl gap-5 rounded-3xl border border-slate-200/70 bg-white/85 p-3 shadow-soft backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/75 lg:grid-cols-[1.1fr,1fr]">
        <aside className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-6 text-white shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">AutoHub Security</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight">Secure Boss Access</h1>
          <p className="mt-3 text-sm text-slate-200">Single-owner account model with optional OTP verification based on account security settings.</p>

          <div className="mt-8 space-y-3">
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-300">Rule</p>
              <p className="mt-1 text-sm font-medium">Owner login only. No client account registration.</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-300">Rule</p>
              <p className="mt-1 text-sm font-medium">OTP login is controlled from Account Settings.</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-300">Route</p>
              <p className="mt-1 text-sm font-medium">Authenticated user enters `/admin`.</p>
            </div>
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5">
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
          </div>

          {step === "credentials" ? (
            <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/30">
              {hasOwner ? (
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  Signup is disabled after first account creation. Login with the owner account.
                </p>
              ) : (
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  Owner account is not provisioned. Client subscriptions remain available on the public site.
                </p>
              )}
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none ring-blue-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your boss account password"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none ring-blue-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <button
                type="button"
                onClick={() => void startAuth()}
                disabled={busy}
                className="h-11 w-full rounded-xl bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Processing..." : "Continue"}
              </button>
            </div>
          ) : null}

          {step === "otp" ? (
            <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/30">
              <label className="block space-y-1 text-sm">
                <span className="font-medium">OTP Code</span>
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="6-digit code"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none ring-blue-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <button
                type="button"
                onClick={() => void verifyOtp()}
                disabled={busy}
                className="h-11 w-full rounded-xl bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Verifying..." : "Verify OTP & Login"}
              </button>
              <button type="button" onClick={() => setStep("credentials")} className="h-11 w-full rounded-xl border border-slate-300 text-sm dark:border-slate-700">
                Back
              </button>
            </div>
          ) : null}

          {step === "done" ? (
            <div className="space-y-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/20">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">Authenticated successfully.</p>
              <button
                type="button"
                onClick={() => {
                  window.location.assign(withBasePath(nextPathAfterLogin));
                }}
                className="h-11 w-full rounded-xl bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                Go to Admin
              </button>
            </div>
          ) : null}

          {info ? <p className="mt-3 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{info}</p> : null}
          {error ? <p className="mt-3 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-600 dark:bg-rose-950/30 dark:text-rose-300">{error}</p> : null}
        </section>
      </div>
    </div>
  );
};

export default Signup;
