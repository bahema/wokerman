import { Suspense, lazy, useEffect, useState } from "react";
import CookieConsent from "./components/CookieConsent";
import Home from "./pages/Home";
import { hasAdminAccess } from "./utils/authTrust";
import { setSeo } from "./utils/seo";
import { useI18n } from "./i18n/provider";

const Admin = lazy(() => import("./pages/Admin"));
const ConfirmResultPage = lazy(() => import("./pages/ConfirmResultPage"));
const LoginPage = lazy(() => import("./pages/Signup"));
const PolicyPage = lazy(() => import("./pages/PolicyPage"));
const UnsubscribeResultPage = lazy(() => import("./pages/UnsubscribeResultPage"));

type PublicCategoryPath = "/forex" | "/betting" | "/software" | "/social";

const APP_BASE_PATH = (() => {
  const raw = import.meta.env.BASE_URL || "/";
  const trimmed = raw.endsWith("/") ? raw.slice(0, -1) : raw;
  return !trimmed || trimmed === "/" ? "" : trimmed;
})();

const toAppPath = (pathname: string) => {
  const clean = pathname || "/";
  if (!APP_BASE_PATH) return clean;
  if (clean === APP_BASE_PATH) return "/";
  if (clean.startsWith(`${APP_BASE_PATH}/`)) return clean.slice(APP_BASE_PATH.length) || "/";
  return clean;
};

const toBrowserPath = (appPath: string) => {
  if (!appPath.startsWith("/")) return appPath;
  if (!APP_BASE_PATH) return appPath;
  if (appPath === APP_BASE_PATH || appPath.startsWith(`${APP_BASE_PATH}/`)) return appPath;
  return `${APP_BASE_PATH}${appPath}`;
};

const normalizeHistoryArgs = <T extends [data: any, unused: string, url?: string | URL | null | undefined]>(args: T): T => {
  const [state, unused, url] = args;
  if (typeof url !== "string") return args;
  if (/^[a-z]+:\/\//i.test(url) || url.startsWith("#") || url.startsWith("?")) return args;
  return [state, unused, toBrowserPath(url)] as unknown as T;
};

const normalizePath = (rawPath: string) => {
  const cleaned = rawPath.length > 1 ? rawPath.replace(/\/+$/, "") : rawPath;
  if (cleaned === "/boss/login" || cleaned === "/signup") return "/login";
  if (cleaned.startsWith("/boss/")) return "/admin";
  if (
    cleaned === "/admin" ||
    cleaned === "/login" ||
    cleaned === "/" ||
    cleaned === "/forex" ||
    cleaned === "/betting" ||
    cleaned === "/software" ||
    cleaned === "/social" ||
    cleaned === "/affiliate-disclosure" ||
    cleaned === "/earnings-disclaimer" ||
    cleaned === "/privacy" ||
    cleaned === "/terms"
    || cleaned === "/confirm"
    || cleaned === "/unsubscribe"
  ) {
    return cleaned;
  }
  return "/404";
};

const sanitizePostLoginPath = (raw?: string) => {
  if (!raw) return "/admin";
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin !== window.location.origin) return "/admin";
    if (parsed.pathname === "/admin" || parsed.pathname.startsWith("/boss/")) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return "/admin";
  } catch {
    return "/admin";
  }
};

const categorySectionByPath: Record<PublicCategoryPath, "forex" | "betting" | "software" | "social"> = {
  "/forex": "forex",
  "/betting": "betting",
  "/software": "software",
  "/social": "social"
};

function App() {
  const { t, ogLocale } = useI18n();
  const [path, setPath] = useState(toAppPath(window.location.pathname));
  const [checkingAuth, setCheckingAuth] = useState(false);
  const normalizedPath = normalizePath(path);

  useEffect(() => {
    const onPopState = () => setPath(toAppPath(window.location.pathname));
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args: Parameters<History["pushState"]>) {
      const nextArgs = normalizeHistoryArgs(args);
      originalPushState.apply(this, nextArgs);
      setPath(toAppPath(window.location.pathname));
    };
    window.history.replaceState = function (...args: Parameters<History["replaceState"]>) {
      const nextArgs = normalizeHistoryArgs(args);
      originalReplaceState.apply(this, nextArgs);
      setPath(toAppPath(window.location.pathname));
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (normalizedPath !== "/login") return;
    setCheckingAuth(true);
    void (async () => {
      const ok = await hasAdminAccess();
      if (cancelled) return;
      const nextRaw = new URLSearchParams(window.location.search).get("next");
      if (ok && nextRaw) {
        const nextPath = sanitizePostLoginPath(nextRaw);
        window.history.replaceState({}, "", toBrowserPath(nextPath));
        setPath(toAppPath(window.location.pathname));
      }
      setCheckingAuth(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [normalizedPath]);

  useEffect(() => {
    const seoByPath: Record<string, { title: string; description: string; canonicalPath: string; robots?: string }> = {
      "/": {
        title: "AutoHub | Forex, Betting, Software & Social Tools",
        description: "Discover high-performance Forex, Betting, Software, and Social automation products built for modern digital operators.",
        canonicalPath: "/"
      },
      "/forex": {
        title: "Forex Tools | AutoHub",
        description: "Explore Forex automation and trading workflow tools with ratings, features, and direct checkout links.",
        canonicalPath: "/forex"
      },
      "/betting": {
        title: "Betting Systems | AutoHub",
        description: "Browse betting systems and analytics tools designed for performance, control, and decision speed.",
        canonicalPath: "/betting"
      },
      "/software": {
        title: "Software Products | AutoHub",
        description: "Discover newly released software products for automation, team workflows, and growth.",
        canonicalPath: "/software"
      },
      "/social": {
        title: "Social Automation Tools | AutoHub",
        description: "Find social automation products for scheduling, engagement workflows, and campaign optimization.",
        canonicalPath: "/social"
      },
      "/login": {
        title: "Login | AutoHub Boss Panel",
        description: "Secure owner login for the AutoHub administration panel.",
        canonicalPath: "/login",
        robots: "noindex,nofollow"
      },
      "/admin": {
        title: "Admin | AutoHub Boss Panel",
        description: "Private administration workspace for AutoHub content and product management.",
        canonicalPath: "/admin",
        robots: "noindex,nofollow"
      },
      "/404": {
        title: "Page Not Found | AutoHub",
        description: "The requested page could not be found.",
        canonicalPath: "/404",
        robots: "noindex,nofollow"
      },
      "/affiliate-disclosure": {
        title: "Affiliate Disclosure | AutoHub",
        description: "Learn how affiliate links work on AutoHub and how commissions may be earned.",
        canonicalPath: "/affiliate-disclosure"
      },
      "/earnings-disclaimer": {
        title: "Earnings Disclaimer | AutoHub",
        description: "Read AutoHub's earnings disclaimer and understand that outcomes are not guaranteed.",
        canonicalPath: "/earnings-disclaimer"
      },
      "/privacy": {
        title: "Privacy Policy | AutoHub",
        description: "Read the AutoHub privacy policy and data handling overview.",
        canonicalPath: "/privacy"
      },
      "/terms": {
        title: "Terms of Use | AutoHub",
        description: "Review the AutoHub terms of use for website content and third-party product links.",
        canonicalPath: "/terms"
      },
      "/unsubscribe": {
        title: "Email Preferences | AutoHub",
        description: "Manage your AutoHub email subscription status.",
        canonicalPath: "/unsubscribe",
        robots: "noindex,nofollow"
      },
      "/confirm": {
        title: "Email Confirmation | AutoHub",
        description: "Confirmation result for your AutoHub email subscription.",
        canonicalPath: "/confirm",
        robots: "noindex,nofollow"
      }
    };

    const seo = seoByPath[normalizedPath] ?? seoByPath["/"];
    setSeo({ ...seo, locale: ogLocale });
  }, [normalizedPath, ogLocale]);

  if (normalizedPath === "/login") {
    if (checkingAuth) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
          {t("app.checkingSession")}
        </div>
      );
    }
    const nextRaw = new URLSearchParams(window.location.search).get("next") ?? undefined;
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-300">{t("app.loading")}</div>}>
        <LoginPage postLoginPath={sanitizePostLoginPath(nextRaw)} />
      </Suspense>
    );
  }
  if (normalizedPath === "/affiliate-disclosure") return withCookieConsent(<Suspense fallback={null}><PolicyPage kind="affiliate-disclosure" /></Suspense>);
  if (normalizedPath === "/earnings-disclaimer") return withCookieConsent(<Suspense fallback={null}><PolicyPage kind="earnings-disclaimer" /></Suspense>);
  if (normalizedPath === "/privacy") return withCookieConsent(<Suspense fallback={null}><PolicyPage kind="privacy" /></Suspense>);
  if (normalizedPath === "/terms") return withCookieConsent(<Suspense fallback={null}><PolicyPage kind="terms" /></Suspense>);
  if (normalizedPath === "/confirm") return withCookieConsent(<Suspense fallback={null}><ConfirmResultPage /></Suspense>);
  if (normalizedPath === "/unsubscribe") return withCookieConsent(<Suspense fallback={null}><UnsubscribeResultPage /></Suspense>);
  if (normalizedPath === "/admin") {
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-300">{t("app.loadingAdmin")}</div>}>
        <Admin />
      </Suspense>
    );
  }
  if (normalizedPath === "/404") {
    return withCookieConsent(
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">404</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{t("app.notFoundTitle")}</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {t("app.notFoundPrefix")}{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">{path}</code>
            {t("app.notFoundSuffix")}
          </p>
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, "", toBrowserPath("/"));
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            {t("app.goHome")}
          </button>
        </div>
      </div>
    );
  }
  const section = normalizedPath in categorySectionByPath ? categorySectionByPath[normalizedPath as PublicCategoryPath] : undefined;
  return withCookieConsent(<Home initialSection={section} />);
}

export default App;
const withCookieConsent = (page: JSX.Element) => (
  <>
    {page}
    <CookieConsent />
  </>
);
