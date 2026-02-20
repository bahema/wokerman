import { useEffect, useMemo, useState } from "react";
import { getAuthStatus, hasAdminAccess, startLogin, startSignup } from "../utils/authTrust";
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
  const [step, setStep] = useState<"credentials" | "done">("credentials");
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
      if (hasOwner) {
        await startLogin(email.trim().toLowerCase(), password);
      } else {
        await startSignup(email.trim().toLowerCase(), password);
      }
      const sessionValid = await hasAdminAccess();
      if (!sessionValid) {
        throw new Error(
          "Login succeeded, but no session cookie was stored. Enable third-party cookies for this site or deploy frontend/backend on the same domain."
        );
      }
      setInfo(hasOwner ? "Login successful." : "Owner account created and authenticated.");
      setStep("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to authenticate.";
      if (/invalid credentials/i.test(message) && hasOwner) {
        setError("Invalid credentials. Signup is disabled because an owner account already exists.");
      } else {
        setError(message);
      }
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
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="mx-auto w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>

        {step === "credentials" ? (
          <div className="mt-4 space-y-3">
            <label className="block space-y-1 text-sm">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="h-10 w-full rounded border border-slate-300 bg-white px-3 outline-none ring-blue-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className="h-10 w-full rounded border border-slate-300 bg-white px-3 outline-none ring-blue-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <button
              type="button"
              onClick={() => void startAuth()}
              disabled={busy}
              className="h-10 w-full rounded bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Processing..." : hasOwner ? "Login" : "Create Owner"}
            </button>
          </div>
        ) : null}

        {step === "done" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">Authenticated successfully.</p>
            <button
              type="button"
              onClick={() => {
                window.history.pushState({}, "", withBasePath(nextPathAfterLogin));
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
              className="h-10 w-full rounded bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Go to Admin
            </button>
          </div>
        ) : null}

        {info ? <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">{info}</p> : null}
        {error ? <p className="mt-3 text-xs text-rose-600 dark:text-rose-300">{error}</p> : null}
      </section>
    </div>
  );
};

export default Signup;
