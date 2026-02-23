import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiJson } from "../../api/client";

type TrafficAiIntent = "informational" | "commercial" | "transactional";

type TrafficAiOpportunity = {
  id: string;
  topic: string;
  keyword: string;
  targetPath: string;
  intent: TrafficAiIntent;
  demandScore: number;
  competitionScore: number;
  relevanceScore: number;
  compositeScore: number;
  channels: string[];
  complianceNotes: string[];
};

type TrafficAiPlan = {
  id: string;
  createdAt: string;
  source: "rule-based-local";
  summary: {
    opportunities: number;
    avgCompositeScore: number;
    highIntentCount: number;
  };
  opportunities: TrafficAiOpportunity[];
  complianceChecklist: Array<{ id: string; severity: "info" | "warning"; message: string }>;
  generatedFrom: {
    productsTotal: number;
    industriesTotal: number;
    subscribersTotal: number;
    emailConfirmedTotal: number;
  };
};

type LatestPlanResponse = { plan: TrafficAiPlan | null };
type PlanHistoryResponse = { items: TrafficAiPlan[]; total: number };
type GeneratePlanResponse = { plan: TrafficAiPlan };

const intentBadge = (intent: TrafficAiIntent) => {
  if (intent === "transactional") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (intent === "commercial") return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
  return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
};

const TrafficAiEditor = () => {
  const [loading, setLoading] = useState(true);
  const [busyGenerate, setBusyGenerate] = useState(false);
  const [latestPlan, setLatestPlan] = useState<TrafficAiPlan | null>(null);
  const [history, setHistory] = useState<TrafficAiPlan[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setErrorMessage("");
    try {
      const [latest, plans] = await Promise.all([
        apiGet<LatestPlanResponse>("/api/traffic-ai/plan/latest"),
        apiGet<PlanHistoryResponse>("/api/traffic-ai/plans")
      ]);
      setLatestPlan(latest.plan ?? null);
      setHistory(plans.items ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load Traffic AI data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runGenerate = async () => {
    if (busyGenerate) return;
    setBusyGenerate(true);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await apiJson<GeneratePlanResponse>("/api/traffic-ai/plan/generate", "POST");
      setLatestPlan(response.plan);
      setHistory((prev) => [response.plan, ...prev.filter((item) => item.id !== response.plan.id)]);
      setNotice("Traffic AI plan generated successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to generate Traffic AI plan.");
    } finally {
      setBusyGenerate(false);
    }
  };

  const topOpportunities = useMemo(() => latestPlan?.opportunities.slice(0, 8) ?? [], [latestPlan]);
  const recentPlans = useMemo(() => history.slice(0, 6), [history]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">Local Traffic AI (Rule-Based)</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Generates SEO opportunities without external AI APIs. Use this as local-first planning before deployment.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runGenerate()}
            disabled={busyGenerate}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyGenerate ? "Generating..." : "Generate Weekly Plan"}
          </button>
        </div>
        {notice ? (
          <p className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            {notice}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
            {errorMessage}
          </p>
        ) : null}
      </section>

      {loading ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading Traffic AI data...</p>
        </section>
      ) : null}

      {latestPlan ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <article className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Generated</p>
              <p className="mt-1 text-sm font-semibold">{new Date(latestPlan.createdAt).toLocaleString()}</p>
            </article>
            <article className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Opportunities</p>
              <p className="mt-1 text-sm font-semibold">{latestPlan.summary.opportunities}</p>
            </article>
            <article className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Avg Score</p>
              <p className="mt-1 text-sm font-semibold">{latestPlan.summary.avgCompositeScore}</p>
            </article>
            <article className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">High Intent</p>
              <p className="mt-1 text-sm font-semibold">{latestPlan.summary.highIntentCount}</p>
            </article>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <h4 className="mb-3 text-base font-bold">Top Opportunities</h4>
        {!topOpportunities.length ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No plan generated yet.</p>
        ) : (
          <div className="space-y-2">
            {topOpportunities.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.topic}</p>
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${intentBadge(item.intent)}`}>
                    {item.intent}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Keyword: <span className="font-semibold">{item.keyword}</span> | Target: {item.targetPath}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Score {item.compositeScore} (Demand {item.demandScore}, Competition {item.competitionScore}, Relevance {item.relevanceScore})
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Channels: {item.channels.join(", ")}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <h4 className="mb-3 text-base font-bold">Compliance Checklist</h4>
        {!latestPlan?.complianceChecklist.length ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No checklist available.</p>
        ) : (
          <div className="space-y-2">
            {latestPlan.complianceChecklist.map((item) => (
              <p
                key={item.id}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  item.severity === "warning"
                    ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                    : "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                {item.message}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <h4 className="mb-3 text-base font-bold">Recent Plan History</h4>
        {!recentPlans.length ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No history yet.</p>
        ) : (
          <div className="space-y-2">
            {recentPlans.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                <p className="font-semibold">{new Date(item.createdAt).toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Opportunities: {item.summary.opportunities} | Avg score: {item.summary.avgCompositeScore} | High intent:{" "}
                  {item.summary.highIntentCount}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default TrafficAiEditor;

