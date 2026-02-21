import { useEffect, useMemo, useState } from "react";
import { getAuthStatus, startLogin } from "../utils/authTrust";
import { withBasePath } from "../utils/basePath";
import { useI18n } from "../i18n/provider";

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
  const { t } = useI18n();
  const [hasOwner, setHasOwner] = useState(false);
  const [statusReady, setStatusReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [error, setError] = useState("");
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

  const title = useMemo(() => t("signup.title"), [t]);
  const subtitle = useMemo(
    () => t("signup.subtitle"),
    [t]
  );

  const startAuth = async () => {
    setError("");
    if (!hasOwner) {
      setError(t("signup.ownerMissing"));
      return;
    }
    setBusy(true);
    try {
      await startLogin(email.trim().toLowerCase(), password, trustDevice);
      window.history.pushState({}, "", withBasePath(nextPathAfterLogin));
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("signup.errorAuthFailed");
      if (/invalid credentials/i.test(message) && hasOwner) {
        setError(t("signup.invalidCredentials"));
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
        {t("signup.loadingAuth")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="mx-auto w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>

        <div className="mt-4 space-y-3">
          <label className="block space-y-1 text-sm">
            <span>{t("signup.emailLabel")}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("signup.emailPlaceholder")}
              className="h-10 w-full rounded border border-slate-300 bg-white px-3 outline-none ring-blue-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t("signup.passwordLabel")}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("signup.passwordPlaceholder")}
              className="h-10 w-full rounded border border-slate-300 bg-white px-3 outline-none ring-blue-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(event) => setTrustDevice(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
            />
            <span>{t("signup.trustDevice")}</span>
          </label>
          <button
            type="button"
            onClick={() => void startAuth()}
            disabled={busy}
            className="h-10 w-full rounded bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? t("signup.processing") : t("signup.continue")}
          </button>
        </div>

        {error ? <p className="mt-3 text-xs text-rose-600 dark:text-rose-300">{error}</p> : null}
      </section>
    </div>
  );
};

export default Signup;
