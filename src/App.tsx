import { useEffect, useState } from "react";
import Admin from "./pages/Admin";
import Home from "./pages/Home";
import PolicyPage from "./pages/PolicyPage";
import Signup from "./pages/Signup";
import { hasAdminAccess } from "./utils/authTrust";
import { setSeo } from "./utils/seo";

type PublicCategoryPath = "/forex" | "/betting" | "/software" | "/social";

const normalizePath = (rawPath: string) => {
  const cleaned = rawPath.length > 1 ? rawPath.replace(/\/+$/, "") : rawPath;
  if (cleaned === "/boss/login") return "/signup";
  if (cleaned.startsWith("/boss/")) return "/admin";
  if (
    cleaned === "/admin" ||
    cleaned === "/signup" ||
    cleaned === "/" ||
    cleaned === "/forex" ||
    cleaned === "/betting" ||
    cleaned === "/software" ||
    cleaned === "/social" ||
    cleaned === "/affiliate-disclosure" ||
    cleaned === "/earnings-disclaimer" ||
    cleaned === "/privacy" ||
    cleaned === "/terms"
  ) {
    return cleaned;
  }
  return "/404";
};

const categorySectionByPath: Record<PublicCategoryPath, "forex" | "betting" | "software" | "social"> = {
  "/forex": "forex",
  "/betting": "betting",
  "/software": "software",
  "/social": "social"
};

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const normalizedPath = normalizePath(path);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args: Parameters<History["pushState"]>) {
      originalPushState.apply(this, args);
      setPath(window.location.pathname);
    };
    window.history.replaceState = function (...args: Parameters<History["replaceState"]>) {
      originalReplaceState.apply(this, args);
      setPath(window.location.pathname);
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
    if (normalizedPath !== "/admin") return;
    setCheckingAuth(true);
    void (async () => {
      const ok = await hasAdminAccess();
      if (!cancelled) {
        setIsAuthed(ok);
        setCheckingAuth(false);
      }
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
      "/signup": {
        title: "Login | AutoHub Boss Panel",
        description: "Secure owner login for the AutoHub administration panel.",
        canonicalPath: "/signup",
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
      }
    };

    const seo = seoByPath[normalizedPath] ?? seoByPath["/"];
    setSeo(seo);
  }, [normalizedPath]);

  if (normalizedPath === "/signup") return <Signup />;
  if (normalizedPath === "/affiliate-disclosure") return <PolicyPage kind="affiliate-disclosure" />;
  if (normalizedPath === "/earnings-disclaimer") return <PolicyPage kind="earnings-disclaimer" />;
  if (normalizedPath === "/privacy") return <PolicyPage kind="privacy" />;
  if (normalizedPath === "/terms") return <PolicyPage kind="terms" />;
  if (normalizedPath === "/admin") {
    if (checkingAuth) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
          Checking secure session...
        </div>
      );
    }
    if (!isAuthed) return <Signup />;
    return <Admin />;
  }
  if (normalizedPath === "/404") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">404</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Page Not Found</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            No page exists at <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">{path}</code>.
          </p>
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, "", "/");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }
  const section = normalizedPath in categorySectionByPath ? categorySectionByPath[normalizedPath as PublicCategoryPath] : undefined;
  return <Home initialSection={section} />;
}

export default App;
