import { FormEvent, useEffect, useMemo, useState } from "react";
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
  role?: "viewer" | "editor" | "publisher" | "owner";
  capabilities?: string[];
};

type SourceItem = {
  title: string;
  url: string;
  snippet: string;
  source: string;
};

type AiChatResponse = {
  mode: "read-only";
  answer: string;
  suggestions: string[];
  sources?: SourceItem[];
};

type PreparedActionResponse = {
  mode: "preview-only";
  actionType: "add_product";
  executeAvailable: boolean;
  confirmationRequired: true;
  target: {
    section: "forex" | "betting" | "software" | "social" | "gadgets" | "supplements" | "upcoming";
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
  approval: {
    id: string;
    confirmPhrase: string;
    expiresAt: number;
  };
  nextStep: string;
};

type ExecuteActionResponse = {
  ok: true;
  mode: "execute";
  section: "forex" | "betting" | "software" | "social" | "gadgets" | "supplements" | "upcoming";
  insertedTitle: string;
  productsInSection: number;
  rollbackId?: string;
};

type WebSearchResponse = {
  query: string;
  results: SourceItem[];
};

type ChatItem = {
  id: string;
  role: "user" | "assistant";
  text: string;
  suggestions?: string[];
  sources?: SourceItem[];
};

type AskedSessionItem = {
  id: string;
  question: string;
  createdAt: number;
};

type AiEmailResponse = {
  ok: true;
  mode: "email_generate";
  language: string;
  tone: string;
  includeEmojis?: boolean;
  section: string;
  campaignId: string | null;
  draftSaved: boolean;
  email: {
    subject: string;
    previewText: string;
    bodyHtml: string;
    bodyRich: string;
  };
};

type AiExportResponse = {
  ok: true;
  mode: "export_generate";
  format: "pdf" | "doc" | "excel";
  fileName: string;
  url: string;
  sizeBytes: number;
};

type ToolPanel = "none" | "web" | "action" | "email" | "docs";

const QUICK_PROMPTS = [
  "What happened on my page today?",
  "Search online affiliate disclosure rules for supplements",
  "Give me SEO traffic opportunities summary",
  "Prepare add product to gadgets"
];

const AiControlCenterEditor = () => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [toolPanel, setToolPanel] = useState<ToolPanel>("none");

  const [actionMessage, setActionMessage] = useState("");
  const [actionImageUrl, setActionImageUrl] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [preparedAction, setPreparedAction] = useState<PreparedActionResponse | null>(null);
  const [executeIssues, setExecuteIssues] = useState<string[]>([]);
  const [askedSessions, setAskedSessions] = useState<AskedSessionItem[]>([]);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailObjective, setEmailObjective] = useState("");
  const [emailSection, setEmailSection] = useState("health");
  const [emailLanguage, setEmailLanguage] = useState("en");
  const [emailTone, setEmailTone] = useState("professional");
  const [emailEmojis, setEmailEmojis] = useState(true);
  const [emailResult, setEmailResult] = useState<AiEmailResponse | null>(null);
  const [docsBusy, setDocsBusy] = useState(false);
  const [docsQuestion, setDocsQuestion] = useState("");
  const [docsFormat, setDocsFormat] = useState<"pdf" | "doc" | "excel">("pdf");
  const [exportResults, setExportResults] = useState<AiExportResponse[]>([]);

  const [webQuery, setWebQuery] = useState("");
  const [webBusy, setWebBusy] = useState(false);
  const [webResults, setWebResults] = useState<SourceItem[]>([]);

  const [context, setContext] = useState<AiContextResponse | null>(null);
  const [chat, setChat] = useState<ChatItem[]>([]);

  const latestTitle = useMemo(() => {
    const firstUser = chat.find((item) => item.role === "user");
    if (!firstUser) return "AI Assistant Control";
    const trimmed = firstUser.text.trim();
    return trimmed.length > 36 ? `${trimmed.slice(0, 36)}...` : trimmed;
  }, [chat]);

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
    setChat([
      {
        id: "welcome",
        role: "assistant",
        text:
          "I can audit your live site status, search online sources, and prepare product actions. Use quick prompts or ask directly.",
        suggestions: ["Ask: what happened on my page today?", "Ask: search online FTC affiliate rules"]
      }
    ]);
  }, []);

  const sendPrompt = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    const userItem: ChatItem = { id: `${Date.now()}-u`, role: "user", text: trimmed };
    setChat((prev) => [...prev, userItem]);
    setAskedSessions((prev) => {
      const nextItem: AskedSessionItem = { id: `${Date.now()}-s`, question: trimmed, createdAt: Date.now() };
      const deduped = [nextItem, ...prev.filter((item) => item.question !== trimmed)];
      return deduped.slice(0, 50);
    });

    try {
      const response = await apiJson<AiChatResponse>("/api/ai/control/chat", "POST", { message: trimmed });
      const assistantItem: ChatItem = {
        id: `${Date.now()}-a`,
        role: "assistant",
        text: response.answer,
        suggestions: response.suggestions,
        sources: response.sources ?? []
      };
      setChat((prev) => [...prev, assistantItem]);
      await loadContext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI chat failed.");
    } finally {
      setBusy(false);
    }
  };

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    await sendPrompt(message);
  };

  const runWebSearch = async (event: FormEvent) => {
    event.preventDefault();
    const query = webQuery.trim();
    if (!query || webBusy) return;
    setWebBusy(true);
    setError("");
    try {
      const response = await apiJson<WebSearchResponse>("/api/ai/control/web-search", "POST", { query });
      setWebResults(response.results ?? []);
      setChat((prev) => [
        ...prev,
        { id: `${Date.now()}-wu`, role: "user", text: `Search online: ${query}` },
        {
          id: `${Date.now()}-wa`,
          role: "assistant",
          text:
            response.results.length > 0
              ? `Found ${response.results.length} online sources for "${query}".`
              : `No web sources found for "${query}".`,
          sources: response.results
        }
      ]);
      setAskedSessions((prev) => {
        const question = `Search online: ${query}`;
        const nextItem: AskedSessionItem = { id: `${Date.now()}-s`, question, createdAt: Date.now() };
        const deduped = [nextItem, ...prev.filter((item) => item.question !== question)];
        return deduped.slice(0, 50);
      });
      setToolPanel("none");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Web search failed.");
    } finally {
      setWebBusy(false);
    }
  };

  const prepareAction = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = actionMessage.trim();
    if (!trimmed || actionBusy) return;
    setActionBusy(true);
    setError("");
    setExecuteIssues([]);
    try {
      const response = await apiJson<PreparedActionResponse>("/api/ai/control/prepare-action", "POST", {
        message: trimmed,
        imageUrl: actionImageUrl.trim()
      });
      setPreparedAction(response);
      setConfirmText("");
      setChat((prev) => [
        ...prev,
        { id: `${Date.now()}-pu`, role: "user", text: trimmed },
        {
          id: `${Date.now()}-pa`,
          role: "assistant",
          text: `Prepared ${response.actionType} for ${response.target.section}. Confirm with exact phrase before expiry: ${response.approval.confirmPhrase}`
        }
      ]);
      setAskedSessions((prev) => {
        const nextItem: AskedSessionItem = { id: `${Date.now()}-s`, question: trimmed, createdAt: Date.now() };
        const deduped = [nextItem, ...prev.filter((item) => item.question !== trimmed)];
        return deduped.slice(0, 50);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to prepare action.");
    } finally {
      setActionBusy(false);
    }
  };

  const executePreparedAction = async () => {
    if (!preparedAction || actionBusy) return;
    setActionBusy(true);
    setError("");
    setExecuteIssues([]);
    try {
      const result = await apiJson<ExecuteActionResponse>("/api/ai/control/execute-action", "POST", {
        approvalId: preparedAction.approval.id,
        confirmText: confirmText.trim(),
        target: preparedAction.target,
        productDraft: preparedAction.productDraft
      });
      setPreparedAction(null);
      setActionMessage("");
      setActionImageUrl("");
      setConfirmText("");
      setToolPanel("none");
      setChat((prev) => [
        ...prev,
        {
          id: `${Date.now()}-exec`,
          role: "assistant",
          text: `Executed: inserted "${result.insertedTitle}" into ${result.section}. Total products now: ${result.productsInSection}.${result.rollbackId ? ` Rollback ID: ${result.rollbackId}.` : ""}`
        }
      ]);
      await loadContext();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Failed to execute action.";
      setError(messageText);
      if (/duplicate/i.test(messageText) || /compliance/i.test(messageText) || /health category/i.test(messageText)) {
        setExecuteIssues([messageText]);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const resetChat = () => {
    setChat([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        text: "New session ready. Ask about performance, compliance, traffic, or product actions.",
        suggestions: ["Ask: status summary", "Ask: search online best affiliate CTAs"]
      }
    ]);
    setMessage("");
    setWebResults([]);
    setPreparedAction(null);
    setExecuteIssues([]);
    setAskedSessions([]);
    setToolPanel("none");
  };

  const deleteAskedSession = (id: string) => {
    setAskedSessions((prev) => prev.filter((item) => item.id !== id));
  };

  const generateAiEmail = async (event: FormEvent) => {
    event.preventDefault();
    if (!emailObjective.trim() || emailBusy) return;
    setEmailBusy(true);
    setError("");
    try {
      const response = await apiJson<AiEmailResponse>("/api/ai/control/email/generate", "POST", {
        objective: emailObjective.trim(),
        section: emailSection,
        language: emailLanguage,
        tone: emailTone,
        includeEmojis: emailEmojis,
        saveDraft: true
      });
      setEmailResult(response);
      setChat((prev) => [
        ...prev,
        { id: `${Date.now()}-eu`, role: "user", text: `Generate email draft: ${emailObjective.trim()}` },
        {
          id: `${Date.now()}-ea`,
          role: "assistant",
          text: `Email draft generated for ${response.section} (${response.language}/${response.tone}). ${
            response.draftSaved && response.campaignId ? `Saved as campaign ${response.campaignId}.` : "Draft not saved."
          }`
        }
      ]);
      setAskedSessions((prev) => {
        const question = `Generate email draft: ${emailObjective.trim()}`;
        const nextItem: AskedSessionItem = { id: `${Date.now()}-s`, question, createdAt: Date.now() };
        const deduped = [nextItem, ...prev.filter((item) => item.question !== question)];
        return deduped.slice(0, 50);
      });
      await loadContext();
      setToolPanel("none");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email generation failed.");
    } finally {
      setEmailBusy(false);
    }
  };

  const generateExport = async (event: FormEvent) => {
    event.preventDefault();
    const question = docsQuestion.trim();
    if (!question || docsBusy) return;
    setDocsBusy(true);
    setError("");
    try {
      const response = await apiJson<AiExportResponse>("/api/ai/control/export", "POST", {
        question,
        format: docsFormat
      });
      setExportResults((prev) => [response, ...prev].slice(0, 20));
      setChat((prev) => [
        ...prev,
        { id: `${Date.now()}-du`, role: "user", text: `Generate ${docsFormat.toUpperCase()} export: ${question}` },
        {
          id: `${Date.now()}-da`,
          role: "assistant",
          text: `Generated ${response.format.toUpperCase()} export: ${response.fileName}`
        }
      ]);
      setAskedSessions((prev) => {
        const q = `Generate ${docsFormat.toUpperCase()} export: ${question}`;
        const nextItem: AskedSessionItem = { id: `${Date.now()}-s`, question: q, createdAt: Date.now() };
        const deduped = [nextItem, ...prev.filter((item) => item.question !== q)];
        return deduped.slice(0, 50);
      });
      setDocsQuestion("");
      setToolPanel("none");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate export.");
    } finally {
      setDocsBusy(false);
    }
  };

  const copyGeneratedHtml = async () => {
    if (!emailResult?.email.bodyHtml) return;
    try {
      await navigator.clipboard.writeText(emailResult.email.bodyHtml);
      setChat((prev) => [
        ...prev,
        { id: `${Date.now()}-copy`, role: "assistant", text: "Copied generated HTML email to clipboard." }
      ]);
    } catch {
      setError("Clipboard copy failed. Select and copy manually.");
    }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-950 text-slate-100 shadow-2xl">
      <div className="grid min-h-[80vh] grid-cols-1 lg:grid-cols-[250px_1fr]">
        <aside className="hidden border-r border-slate-800/90 bg-slate-900/80 p-4 lg:flex lg:flex-col">
          <button
            type="button"
            onClick={resetChat}
            className="mb-4 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-left text-sm font-semibold hover:bg-slate-800"
          >
            + New Chat
          </button>
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Current Session</p>
          <div className="rounded-xl bg-blue-950/50 px-3 py-2 text-sm text-blue-200">{latestTitle}</div>
          <p className="mb-2 mt-5 text-xs uppercase tracking-wide text-slate-400">Quick Commands</p>
          <div className="space-y-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void sendPrompt(prompt)}
                className="w-full rounded-xl border border-slate-700 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
              >
                {prompt}
              </button>
            ))}
          </div>
          <p className="mb-2 mt-5 text-xs uppercase tracking-wide text-slate-400">Asked Sessions</p>
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {askedSessions.length === 0 ? (
              <p className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
                No asked sessions yet.
              </p>
            ) : (
              askedSessions.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-900/70 px-2 py-2">
                  <button
                    type="button"
                    onClick={() => void sendPrompt(item.question)}
                    className="w-full text-left text-xs text-slate-200 hover:text-white"
                    title="Replay this session question"
                  >
                    {item.question}
                  </button>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleTimeString()}</span>
                    <button
                      type="button"
                      onClick={() => deleteAskedSession(item.id)}
                      className="rounded-md border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="flex min-h-[80vh] flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900/95">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/90 px-4 py-3 md:px-6">
            <div>
              <h3 className="text-lg font-bold md:text-xl">AI Assistant Offers Help</h3>
              <p className="text-xs text-slate-400">Global system brain: status, web sources, and safe action prep.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadContext()}
              className="rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
            >
              Refresh Snapshot
            </button>
          </header>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-800/90 px-4 py-3 sm:grid-cols-4 md:px-6">
            <article className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Products</p>
              <p className="text-sm font-semibold">{context?.site.totalProducts ?? "-"}</p>
            </article>
            <article className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Subscribers</p>
              <p className="text-sm font-semibold">{context?.email.subscribers ?? "-"}</p>
            </article>
            <article className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Events</p>
              <p className="text-sm font-semibold">{context?.analytics.totalEvents ?? "-"}</p>
            </article>
            <article className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Snapshot</p>
              <p className="text-sm font-semibold">
                {context ? new Date(context.snapshotAt).toLocaleTimeString() : loading ? "Loading..." : "-"}
              </p>
            </article>
          </div>
          <div className="grid grid-cols-1 gap-2 border-b border-slate-800/90 px-4 py-2 sm:grid-cols-3 md:px-6">
            <article className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Role</p>
              <p className="text-sm font-semibold capitalize">{context?.role ?? "-"}</p>
            </article>
            <article className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 sm:col-span-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Capabilities</p>
              <p className="text-sm font-semibold">{context?.capabilities?.join(", ") ?? "-"}</p>
            </article>
          </div>

          {error ? (
            <div className="px-4 pt-3 md:px-6">
              <p className="rounded-xl border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">{error}</p>
            </div>
          ) : null}

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-6">
            {chat.map((item) => (
              <article key={item.id} className={`max-w-4xl ${item.role === "user" ? "ml-auto" : ""}`}>
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm whitespace-pre-wrap ${
                    item.role === "user"
                      ? "border-slate-700 bg-slate-800 text-slate-100"
                      : "border-slate-800 bg-slate-900/80 text-slate-100"
                  }`}
                >
                  {item.text}
                </div>
                {item.suggestions && item.suggestions.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => void sendPrompt(suggestion.replace(/^Ask:\s*/i, ""))}
                        className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}
                {item.sources && item.sources.length > 0 ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {item.sources.slice(0, 6).map((source) => (
                      <a
                        key={`${item.id}-${source.url}`}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="rounded-xl border border-slate-800 bg-slate-900 p-3 hover:bg-slate-800/80"
                      >
                        <p className="text-sm font-semibold text-blue-300">{source.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-300">{source.snippet}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{source.source}</p>
                      </a>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <footer className="border-t border-slate-800/90 bg-slate-950/95 px-4 py-4 md:px-6">
            <form onSubmit={ask} className="rounded-2xl border border-slate-700 bg-slate-900/90 p-3">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={2}
                placeholder="Ask AI to audit status, search online sources, or prepare actions..."
                className="w-full resize-none border-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-400 outline-none"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setToolPanel((prev) => (prev === "web" ? "none" : "web"))}
                  className={`rounded-full border px-3 py-1.5 text-xs ${toolPanel === "web" ? "border-blue-500 bg-blue-900/40 text-blue-200" : "border-slate-700 text-slate-200"}`}
                >
                  Sources Tool
                </button>
                <button
                  type="button"
                  onClick={() => setToolPanel((prev) => (prev === "action" ? "none" : "action"))}
                  className={`rounded-full border px-3 py-1.5 text-xs ${toolPanel === "action" ? "border-indigo-500 bg-indigo-900/40 text-indigo-200" : "border-slate-700 text-slate-200"}`}
                >
                  Ads/Product Tool
                </button>
                <button
                  type="button"
                  onClick={() => setToolPanel((prev) => (prev === "email" ? "none" : "email"))}
                  className={`rounded-full border px-3 py-1.5 text-xs ${toolPanel === "email" ? "border-emerald-500 bg-emerald-900/40 text-emerald-200" : "border-slate-700 text-slate-200"}`}
                >
                  Email Tool
                </button>
                <button
                  type="button"
                  onClick={() => setToolPanel((prev) => (prev === "docs" ? "none" : "docs"))}
                  className={`rounded-full border px-3 py-1.5 text-xs ${toolPanel === "docs" ? "border-cyan-500 bg-cyan-900/40 text-cyan-200" : "border-slate-700 text-slate-200"}`}
                >
                  Docs Tool
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="ml-auto rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Thinking..." : "Send"}
                </button>
              </div>
            </form>

            {toolPanel === "web" ? (
              <form onSubmit={runWebSearch} className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-3">
                <label className="text-xs uppercase tracking-wide text-slate-400">Web Search Query</label>
                <input
                  value={webQuery}
                  onChange={(event) => setWebQuery(event.target.value)}
                  placeholder="Search online: health affiliate disclaimer requirements"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={webBusy}
                    className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-100 disabled:opacity-60"
                  >
                    {webBusy ? "Searching..." : "Run Search"}
                  </button>
                  <p className="text-xs text-slate-400">{webResults.length > 0 ? `${webResults.length} results cached.` : "No cached results."}</p>
                </div>
              </form>
            ) : null}

            {toolPanel === "action" ? (
              <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-3">
                <form onSubmit={prepareAction} className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Prepare Product/Ad Draft</label>
                  <textarea
                    value={actionMessage}
                    onChange={(event) => setActionMessage(event.target.value)}
                    rows={2}
                    placeholder="Add product to gadgets for posture corrector with affiliate disclosure..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />
                  <input
                    value={actionImageUrl}
                    onChange={(event) => setActionImageUrl(event.target.value)}
                    placeholder="Optional image URL from uploads (/uploads/...)"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={actionBusy}
                    className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {actionBusy ? "Preparing..." : "Prepare Draft"}
                  </button>
                </form>

                {preparedAction ? (
                  <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                    <p className="text-sm font-semibold">{preparedAction.productDraft.title}</p>
                    <p className="mt-1 text-xs text-slate-300">{preparedAction.productDraft.shortDescription}</p>
                    <p className="mt-2 text-xs text-slate-400">Target: {preparedAction.target.section}</p>
                    <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/80 p-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Pre-Execute Guardrails</p>
                      <ul className="mt-1 space-y-1 text-xs text-slate-300">
                        <li>Approval token and phrase required</li>
                        <li>Duplicate check in target section</li>
                        <li>Affiliate disclosure compliance required</li>
                        <li>Health claim restrictions enforced for health sections</li>
                      </ul>
                    </div>
                    <div className="mt-2">
                      <label className="text-[11px] uppercase tracking-wide text-slate-400">Type exact phrase to publish</label>
                      <input
                        value={confirmText}
                        onChange={(event) => setConfirmText(event.target.value)}
                        placeholder={preparedAction.approval.confirmPhrase}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                      />
                      <p className="mt-1 text-[11px] text-slate-400">
                        Expires: {new Date(preparedAction.approval.expiresAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={
                        actionBusy ||
                        !preparedAction.executeAvailable ||
                        confirmText.trim() !== preparedAction.approval.confirmPhrase
                      }
                      onClick={() => void executePreparedAction()}
                      className="mt-2 rounded-full border border-slate-600 px-4 py-1.5 text-xs font-semibold text-slate-100 disabled:opacity-50"
                    >
                      Confirm & Execute
                    </button>
                    {executeIssues.length > 0 ? (
                      <div className="mt-2 rounded-lg border border-rose-800 bg-rose-950/30 p-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-200">Execution Issues</p>
                        <ul className="mt-1 space-y-1 text-xs text-rose-200">
                          {executeIssues.map((issue) => (
                            <li key={issue}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {toolPanel === "email" ? (
              <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-3">
                <form onSubmit={generateAiEmail} className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Generate HTML Campaign</label>
                  <textarea
                    value={emailObjective}
                    onChange={(event) => setEmailObjective(event.target.value)}
                    rows={2}
                    placeholder="Objective: launch new health supplements and drive clicks..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <select
                      value={emailSection}
                      onChange={(event) => setEmailSection(event.target.value)}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    >
                      <option value="health">Health</option>
                      <option value="gadgets">Gadgets</option>
                      <option value="supplements">Supplements</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="forex">Forex</option>
                      <option value="betting">Betting</option>
                      <option value="software">Software</option>
                      <option value="social">Social</option>
                    </select>
                    <select
                      value={emailLanguage}
                      onChange={(event) => setEmailLanguage(event.target.value)}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    >
                      <option value="en">English</option>
                      <option value="fr">French</option>
                      <option value="es">Spanish</option>
                      <option value="de">German</option>
                      <option value="ar">Arabic</option>
                      <option value="pt">Portuguese</option>
                    </select>
                    <select
                      value={emailTone}
                      onChange={(event) => setEmailTone(event.target.value)}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="urgent">Urgent</option>
                      <option value="educational">Educational</option>
                    </select>
                    <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={emailEmojis}
                        onChange={(event) => setEmailEmojis(event.target.checked)}
                        className="h-4 w-4"
                      />
                      <span>Allow emojis</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={emailBusy}
                    className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {emailBusy ? "Generating..." : "Generate & Save Draft"}
                  </button>
                </form>
              </div>
            ) : null}

            {toolPanel === "docs" ? (
              <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-3">
                <form onSubmit={generateExport} className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Generate PDF/DOC/Excel From Question</label>
                  <textarea
                    value={docsQuestion}
                    onChange={(event) => setDocsQuestion(event.target.value)}
                    rows={2}
                    placeholder="Question: What happened on my page this week and what should I improve?"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={docsFormat}
                      onChange={(event) => setDocsFormat(event.target.value as "pdf" | "doc" | "excel")}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    >
                      <option value="pdf">PDF</option>
                      <option value="doc">DOC</option>
                      <option value="excel">Excel</option>
                    </select>
                    <button
                      type="submit"
                      disabled={docsBusy}
                      className="rounded-full bg-cyan-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {docsBusy ? "Generating..." : "Generate File"}
                    </button>
                  </div>
                </form>
                {exportResults.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {exportResults.map((item) => (
                      <a
                        key={`${item.fileName}-${item.url}`}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900"
                      >
                        {item.format.toUpperCase()} - {item.fileName} ({Math.max(1, Math.round(item.sizeBytes / 1024))} KB)
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </footer>
        </div>
      </div>
      {emailResult ? (
        <section className="border-t border-slate-800/90 bg-slate-950/95 px-4 py-4 md:px-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
            <p className="text-sm font-semibold">Generated Email Draft</p>
            <p className="mt-1 text-xs text-slate-300">Subject: {emailResult.email.subject}</p>
            <p className="mt-1 text-xs text-slate-300">Preheader: {emailResult.email.previewText}</p>
            <p className="mt-1 text-xs text-slate-400">
              Campaign: {emailResult.campaignId ?? "not saved"} | Section: {emailResult.section} | Language: {emailResult.language}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyGeneratedHtml()}
                className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
              >
                Copy HTML
              </button>
            </div>
            <textarea
              value={emailResult.email.bodyHtml}
              readOnly
              rows={10}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200"
            />
          </div>
        </section>
      ) : null}
    </section>
  );
};

export default AiControlCenterEditor;
