import { FormEvent, useEffect, useState } from "react";
import { apiGet, apiJson } from "../../api/client";

type AiContextResponse = {
  snapshotAt: string;
  site: {
    updatedAt: string;
    hasDraft: boolean;
    industries: number;
    testimonials: number;
    sectionCounts: Record<string, number>;
    totalProducts: number;
  };
  email: {
    subscribers: number;
    pending: number;
    confirmed: number;
    unsubscribed: number;
    campaignsDraft: number;
    campaignsScheduled: number;
    campaignsSent: number;
  };
  analytics: {
    totalEvents: number;
    topEvents: Array<{ eventName: string; count: number }>;
  };
  trafficAi: null | {
    latestPlanAt: string;
    opportunities: number;
    avgScore: number;
  };
};

type AiChatResponse = {
  mode: "read-only";
  answer: string;
  suggestions: string[];
};

type PreparedActionResponse = {
  mode: "preview-only";
  actionType: "add_product";
  executeAvailable: false;
  confirmationRequired: true;
  target: {
    section: "forex" | "betting" | "software" | "social" | "gadgets" | "supplements";
    path: string;
  };
  productDraft: {
    title: string;
    shortDescription: string;
    longDescription: string;
    features: string[];
    rating: number;
    isNew: boolean;
    imageUrl: string;
    checkoutLink: string;
    complianceWarnings: string[];
  };
  nextStep: string;
};

type ChatItem = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const AiControlCenterEditor = () => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionImageUrl, setActionImageUrl] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [preparedAction, setPreparedAction] = useState<PreparedActionResponse | null>(null);
  const [context, setContext] = useState<AiContextResponse | null>(null);
  const [chat, setChat] = useState<ChatItem[]>([]);

  const loadContext = async () => {
    setError("");
    try {
      const next = await apiGet<AiContextResponse>("/api/ai/control/context");
      setContext(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI context.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadContext();
  }, []);

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    const userItem: ChatItem = { id: `${Date.now()}-u`, role: "user", text: trimmed };
    setChat((prev) => [...prev, userItem]);
    setMessage("");
    try {
      const response = await apiJson<AiChatResponse>("/api/ai/control/chat", "POST", { message: trimmed });
      const assistantText = [response.answer, ...response.suggestions.map((item) => `- ${item}`)].join("\n");
      const assistantItem: ChatItem = { id: `${Date.now()}-a`, role: "assistant", text: assistantText };
      setChat((prev) => [...prev, assistantItem]);
      await loadContext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI chat failed.");
    } finally {
      setBusy(false);
    }
  };

  const prepareAction = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = actionMessage.trim();
    if (!trimmed || actionBusy) return;
    setActionBusy(true);
    setError("");
    try {
      const response = await apiJson<PreparedActionResponse>("/api/ai/control/prepare-action", "POST", {
        message: trimmed,
        imageUrl: actionImageUrl.trim()
      });
      setPreparedAction(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to prepare action.");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold">AI Control Center (Phase 1)</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Read-only global assistant. It can analyze system state and suggest actions, but cannot execute writes yet.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadContext()}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-100"
          >
            Refresh Snapshot
          </button>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading AI snapshot...</p>
        </section>
      ) : null}

      {context ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <article className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Snapshot</p>
              <p className="mt-1 text-sm font-semibold">{new Date(context.snapshotAt).toLocaleString()}</p>
            </article>
            <article className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Products</p>
              <p className="mt-1 text-sm font-semibold">{context.site.totalProducts}</p>
            </article>
            <article className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Subscribers</p>
              <p className="mt-1 text-sm font-semibold">{context.email.subscribers}</p>
            </article>
            <article className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Events</p>
              <p className="mt-1 text-sm font-semibold">{context.analytics.totalEvents}</p>
            </article>
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
            <p className="font-semibold">Traffic AI</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              {context.trafficAi
                ? `Latest plan ${new Date(context.trafficAi.latestPlanAt).toLocaleString()} | Opportunities ${context.trafficAi.opportunities} | Avg score ${context.trafficAi.avgScore}`
                : "No traffic plan yet. Open Traffic AI and generate one."}
            </p>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <h4 className="mb-3 text-base font-bold">Chat</h4>
        <form onSubmit={ask} className="space-y-3">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            placeholder="Ask: what happened on my page today? what expires soon? traffic summary?"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Thinking..." : "Ask AI"}
          </button>
        </form>
        {error ? (
          <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </p>
        ) : null}
        <div className="mt-4 space-y-2">
          {chat.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No messages yet.</p>
          ) : (
            chat.map((item) => (
              <article
                key={item.id}
                className={`rounded-xl border px-3 py-2 text-sm whitespace-pre-wrap ${
                  item.role === "user"
                    ? "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200"
                    : "border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-100"
                }`}
              >
                {item.text}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <h4 className="mb-3 text-base font-bold">Prepare Action (Phase 2a)</h4>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          Example: <span className="font-semibold">add product to gadgets</span>. This prepares a product draft preview only.
        </p>
        <form onSubmit={prepareAction} className="space-y-3">
          <textarea
            value={actionMessage}
            onChange={(event) => setActionMessage(event.target.value)}
            rows={2}
            placeholder="Add product to gadgets section..."
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
          <input
            value={actionImageUrl}
            onChange={(event) => setActionImageUrl(event.target.value)}
            placeholder="Optional upload image URL (must be /uploads/...)"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={actionBusy}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionBusy ? "Preparing..." : "Prepare Draft"}
            </button>
            <button
              type="button"
              disabled
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-500 dark:border-slate-600 dark:text-slate-400"
              title="Execution is intentionally disabled in Phase 2a."
            >
              Confirm & Execute (Locked)
            </button>
          </div>
        </form>
        {preparedAction ? (
          <div className="mt-4 space-y-3">
            <article className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-sm font-semibold">Target: {preparedAction.target.section} ({preparedAction.target.path})</p>
              <p className="mt-1 text-sm">{preparedAction.productDraft.title}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{preparedAction.productDraft.shortDescription}</p>
              {preparedAction.productDraft.imageUrl ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Image: {preparedAction.productDraft.imageUrl}</p>
              ) : null}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Rating: {preparedAction.productDraft.rating} | New: {preparedAction.productDraft.isNew ? "yes" : "no"}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Features</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                {preparedAction.productDraft.features.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Compliance Warnings</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-amber-700 dark:text-amber-300">
                {preparedAction.productDraft.complianceWarnings.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{preparedAction.nextStep}</p>
            </article>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default AiControlCenterEditor;
