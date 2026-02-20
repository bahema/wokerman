import { useMemo, useState } from "react";
import { appBasePath } from "../../utils/basePath";

type CheckResult = {
  status: "pass" | "fail";
  message: string;
  durationMs: number;
};

const normalizeBase = (value: string) => value.trim().replace(/\/+$/, "");
const toAppPath = (pathname: string) => {
  const clean = pathname || "/";
  if (!appBasePath) return clean;
  if (clean === appBasePath) return "/";
  if (clean.startsWith(`${appBasePath}/`)) return clean.slice(appBasePath.length) || "/";
  return clean;
};
const resolveFrontendUrl = () => `${window.location.origin}${appBasePath || ""}/`;

const resolveApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return normalizeBase(configured);
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return `${window.location.protocol}//${host}:4000`;
  }
  return "https://autohub-backend-production.up.railway.app";
};

const runCheck = async (label: string, fn: () => Promise<void>): Promise<[string, CheckResult]> => {
  const started = performance.now();
  try {
    await fn();
    return [
      label,
      {
        status: "pass",
        message: "OK",
        durationMs: Math.round(performance.now() - started)
      }
    ];
  } catch (error) {
    return [
      label,
      {
        status: "fail",
        message: error instanceof Error ? error.message : "Unknown failure",
        durationMs: Math.round(performance.now() - started)
      }
    ];
  }
};

const SystemHealthEditor = () => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const apiBaseUrl = useMemo(() => resolveApiBaseUrl(), []);

  const runAllChecks = async () => {
    setRunning(true);
    const checks: Array<Promise<[string, CheckResult]>> = [
      runCheck("frontend", async () => {
        const response = await fetch(resolveFrontendUrl(), { method: "GET" });
        if (!response.ok) throw new Error(`Frontend HTTP ${response.status}`);
      }),
      runCheck("backend-health", async () => {
        const url = `${apiBaseUrl}/api/health`;
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) throw new Error(`Health HTTP ${response.status} at ${url}`);
      }),
      runCheck("auth-status", async () => {
        const response = await fetch(`${apiBaseUrl}/api/auth/status`, { method: "GET", credentials: "include" });
        if (!response.ok) throw new Error(`Auth status HTTP ${response.status}`);
      }),
      runCheck("boss-routes", async () => {
        const current = toAppPath(window.location.pathname);
        if (!current.startsWith("/boss/") && current !== "/admin" && current !== "/signup") {
          throw new Error(`Unexpected admin path: ${current}`);
        }
      })
    ];

    const entries = await Promise.all(checks);
    setResults(Object.fromEntries(entries));
    setRunning(false);
  };

  const summary = useMemo(() => {
    const values = Object.values(results);
    if (!values.length) return { passed: 0, total: 0 };
    const passed = values.filter((item) => item.status === "pass").length;
    return { passed, total: values.length };
  }, [results]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Health Check Runner</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">API base: {apiBaseUrl}</p>
          </div>
          <button
            type="button"
            onClick={() => void runAllChecks()}
            disabled={running}
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? "Running..." : "Run All Checks"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
          Result: {summary.total ? `${summary.passed}/${summary.total} passed` : "No checks run yet"}
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {[
          { key: "frontend", label: "Frontend Reachability" },
          { key: "backend-health", label: "Backend /api/health" },
          { key: "auth-status", label: "Backend /api/auth/status" },
          { key: "boss-routes", label: "Admin Route Context" }
        ].map((check) => {
          const result = results[check.key];
          const badgeClass =
            result?.status === "pass"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              : result?.status === "fail"
                ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
          return (
            <article key={check.key} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{check.label}</p>
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${badgeClass}`}>
                  {result ? result.status : "idle"}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{result ? result.message : "Not executed yet."}</p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                {result ? `${result.durationMs} ms` : ""}
              </p>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default SystemHealthEditor;
