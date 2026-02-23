import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
  mode: "read-only" | "super";
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

type MessageStatus = "sending" | "streaming" | "complete" | "error";

type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  lastUpdatedAt: number;
};

type ChatMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  status: MessageStatus;
  suggestions?: string[];
  sources?: SourceItem[];
};

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "blockquote"; text: string }
  | { type: "code"; language: string; code: string };

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

const STORAGE_SESSIONS_KEY = "autohub_ai_sessions_v2";
const STORAGE_MESSAGES_KEY = "autohub_ai_messages_by_session_v2";
const STORAGE_ACTIVE_SESSION_KEY = "autohub_ai_active_session_v2";

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const now = () => Date.now();

const parseJson = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

type AiSettingsResponse = {
  mode: "current" | "super";
  superModeConfigured: boolean;
  superMode: null | {
    provider: string;
    baseUrl: string;
    model: string;
    apiKeyMask: string;
    updatedAt: string;
  };
};

const truncateTitle = (value: string, max = 52) => {
  const trimmed = value.trim();
  if (!trimmed) return "AI Assistant Control";
  return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
};

const createSession = (title = "New session"): ChatSession => {
  const timestamp = now();
  return { id: createId("session"), title, createdAt: timestamp, lastUpdatedAt: timestamp };
};

const createAssistantMessage = (sessionId: string, content: string, status: MessageStatus = "complete"): ChatMessage => ({
  id: createId("msg-a"),
  sessionId,
  role: "assistant",
  content,
  createdAt: now(),
  status
});

const createUserMessage = (sessionId: string, content: string, status: MessageStatus = "complete"): ChatMessage => ({
  id: createId("msg-u"),
  sessionId,
  role: "user",
  content,
  createdAt: now(),
  status
});

const buildAnalysisPrompt = (message: string, context: AiContextResponse | null) => {
  const trimmed = message.trim();
  if (!context) return `${trimmed}\n\nRespond with markdown headings, bullets, and concrete next steps.`;
  return `${trimmed}

Use markdown output with sections:
- Summary
- Key Risks
- Search/SEO Opportunities
- Recommended Actions (prioritized)

Current snapshot:
- Total products: ${context.site.totalProducts}
- Subscribers: ${context.email.subscribers}
- Analytics events: ${context.analytics.totalEvents}
- Industries: ${context.site.industries}
- Section counts: ${JSON.stringify(context.site.sectionCounts)}
`;
};

const shouldUseAnalysisContext = (message: string) => {
  const lower = message.trim().toLowerCase();
  if (!lower) return false;
  if (lower === "hi" || lower === "hello" || lower === "hey") return false;
  if (lower.startsWith("how are you") || lower.startsWith("who are you")) return false;
  return /(status|summary|traffic|seo|analytics|report|analy|audit|opportunit|search|compare|plan)/i.test(lower);
};

const improveSearchQuery = (query: string) => {
  const base = query.trim();
  if (!base) return "";
  if (/\b(2026|latest|guidelines|best practices|compliance|seo)\b/i.test(base)) return base;
  return `${base} latest guidelines 2026 best practices compliance`;
};

const parseMarkdown = (input: string): MarkdownBlock[] => {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const codeStart = line.match(/^```\s*(\w+)?\s*$/);
    if (codeStart) {
      const language = codeStart[1] ?? "text";
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index] ?? "")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", language, code: codeLines.join("\n") });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\s*[-*]\s+/, "").trim());
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index] ?? "")) {
        quoteLines.push((lines[index] ?? "").replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    const paragraphLines: string[] = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index]?.trim() &&
      !/^(#{1,6})\s+/.test(lines[index] ?? "") &&
      !/^\s*[-*]\s+/.test(lines[index] ?? "") &&
      !/^>\s?/.test(lines[index] ?? "") &&
      !/^```/.test(lines[index] ?? "")
    ) {
      paragraphLines.push(lines[index] ?? "");
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join("\n") });
  }

  return blocks;
};

const renderInline = (text: string, keyPrefix: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  const pattern = /(https?:\/\/\S+)|`([^`]+)`|\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = pattern.exec(text);
  let part = 0;

  while (match) {
    if (match.index > lastIndex) {
      nodes.push(<span key={`${keyPrefix}-t-${part}`}>{text.slice(lastIndex, match.index)}</span>);
      part += 1;
    }
    const [full, link, inlineCode, bold] = match;
    if (link) {
      nodes.push(
        <a key={`${keyPrefix}-l-${part}`} href={link} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-300 underline underline-offset-2 hover:text-blue-200">
          {link}
        </a>
      );
    } else if (inlineCode) {
      nodes.push(
        <code key={`${keyPrefix}-c-${part}`} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[0.9em] text-cyan-200">
          {inlineCode}
        </code>
      );
    } else if (bold) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${part}`} className="font-semibold text-white">
          {bold}
        </strong>
      );
    } else {
      nodes.push(<span key={`${keyPrefix}-f-${part}`}>{full}</span>);
    }
    lastIndex = match.index + full.length;
    part += 1;
    match = pattern.exec(text);
  }
  if (lastIndex < text.length) {
    nodes.push(<span key={`${keyPrefix}-tail`}>{text.slice(lastIndex)}</span>);
  }
  return nodes;
};

const AiControlCenterEditor = () => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [toolPanel, setToolPanel] = useState<ToolPanel>("none");
  const [toast, setToast] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [aiMode, setAiMode] = useState<"current" | "super">("current");
  const [superConfigured, setSuperConfigured] = useState(false);
  const [superProvider, setSuperProvider] = useState("openai_compatible");
  const [superBaseUrl, setSuperBaseUrl] = useState("https://api.openai.com/v1");
  const [superModel, setSuperModel] = useState("gpt-4o-mini");
  const [superApiKey, setSuperApiKey] = useState("");
  const [superApiKeyMask, setSuperApiKeyMask] = useState("");

  const [actionMessage, setActionMessage] = useState("");
  const [actionImageUrl, setActionImageUrl] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [preparedAction, setPreparedAction] = useState<PreparedActionResponse | null>(null);
  const [executeIssues, setExecuteIssues] = useState<string[]>([]);

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
  const [sessions, setSessions] = useState<ChatSession[]>(() =>
    parseJson<ChatSession[]>(typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_SESSIONS_KEY) : null, [])
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_ACTIVE_SESSION_KEY) : null
  );
  const [messagesBySession, setMessagesBySession] = useState<Record<string, ChatMessage[]>>(() =>
    parseJson<Record<string, ChatMessage[]>>(typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_MESSAGES_KEY) : null, {})
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const sortedSessions = useMemo(() => [...sessions].sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt), [sessions]);

  const activeMessages = useMemo(() => {
    if (!activeSessionId) return [];
    return messagesBySession[activeSessionId] ?? [];
  }, [activeSessionId, messagesBySession]);

  const latestTitle = useMemo(() => {
    if (!activeSessionId) return "AI Assistant Control";
    const current = sessions.find((item) => item.id === activeSessionId);
    return current?.title ?? "AI Assistant Control";
  }, [activeSessionId, sessions]);

  const updateSessionMeta = (sessionId: string, titleOverride?: string) => {
    setSessions((prev) =>
      prev.map((item) =>
        item.id === sessionId
          ? { ...item, title: titleOverride ? truncateTitle(titleOverride) : item.title, lastUpdatedAt: now() }
          : item
      )
    );
  };

  const appendMessage = (sessionId: string, messageToAdd: ChatMessage, titleFromUser?: string) => {
    setMessagesBySession((prev) => ({ ...prev, [sessionId]: [...(prev[sessionId] ?? []), messageToAdd] }));
    updateSessionMeta(sessionId, titleFromUser);
  };

  const replaceMessage = (sessionId: string, messageId: string, patch: Partial<ChatMessage>) => {
    setMessagesBySession((prev) => ({
      ...prev,
      [sessionId]: (prev[sessionId] ?? []).map((item) => (item.id === messageId ? { ...item, ...patch } : item))
    }));
    updateSessionMeta(sessionId);
  };

  const removeMessage = (sessionId: string, messageId: string) => {
    setMessagesBySession((prev) => ({
      ...prev,
      [sessionId]: (prev[sessionId] ?? []).filter((item) => item.id !== messageId)
    }));
    updateSessionMeta(sessionId);
  };

  const createEmptySession = () => {
    const session = createSession();
    const welcome = createAssistantMessage(
      session.id,
      "I can audit your live site status, search online sources, and prepare product actions. Use quick prompts or ask directly."
    );
    welcome.suggestions = ["Ask: what happened on my page today?", "Ask: search online FTC affiliate rules"];
    setSessions((prev) => [session, ...prev]);
    setMessagesBySession((prev) => ({ ...prev, [session.id]: [welcome] }));
    setActiveSessionId(session.id);
    return session.id;
  };

  const ensureActiveSession = () => {
    if (activeSessionId && sessions.some((item) => item.id === activeSessionId)) return activeSessionId;
    return createEmptySession();
  };

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
    void loadAiSettings();
  }, []);

  useEffect(() => {
    if (sessions.length === 0) {
      createEmptySession();
    }
  }, [sessions.length]);

  useEffect(() => {
    if (!activeSessionId) return;
    if (!sessions.some((item) => item.id === activeSessionId)) {
      setActiveSessionId(null);
    }
  }, [activeSessionId, sessions]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messagesBySession));
    }
  }, [messagesBySession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeSessionId) {
      window.localStorage.setItem(STORAGE_ACTIVE_SESSION_KEY, activeSessionId);
    } else {
      window.localStorage.removeItem(STORAGE_ACTIVE_SESSION_KEY);
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeMessages, activeSessionId]);

  const sendPrompt = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || busy) return;
    const sessionId = ensureActiveSession();

    setBusy(true);
    setError("");
    setMessage("");

    const userItem = createUserMessage(sessionId, trimmed, "sending");
    appendMessage(sessionId, userItem, trimmed);
    replaceMessage(sessionId, userItem.id, { status: "complete" });
    const placeholder = createAssistantMessage(sessionId, "Thinking...", "streaming");
    appendMessage(sessionId, placeholder);

    try {
      const enrichedMessage = shouldUseAnalysisContext(trimmed) ? buildAnalysisPrompt(trimmed, context) : trimmed;
      const response = await apiJson<AiChatResponse>("/api/ai/control/chat", "POST", { message: enrichedMessage });
      if (response.mode === "super") {
        setAiMode("super");
      }
      replaceMessage(sessionId, placeholder.id, {
        content: response.answer,
        status: "complete",
        suggestions: response.suggestions,
        sources: response.sources ?? []
      });
      await loadContext();
    } catch (err) {
      replaceMessage(sessionId, placeholder.id, {
        content: err instanceof Error ? err.message : "AI chat failed.",
        status: "error"
      });
      setError(err instanceof Error ? err.message : "AI chat failed.");
    } finally {
      setBusy(false);
    }
  };

  const hydrateSettings = (settings: AiSettingsResponse) => {
    setAiMode(settings.mode);
    setSuperConfigured(settings.superModeConfigured);
    setSuperProvider(settings.superMode?.provider ?? "openai_compatible");
    setSuperBaseUrl(settings.superMode?.baseUrl ?? "https://api.openai.com/v1");
    setSuperModel(settings.superMode?.model ?? "gpt-4o-mini");
    setSuperApiKeyMask(settings.superMode?.apiKeyMask ?? "");
  };

  const loadAiSettings = async () => {
    try {
      const settings = await apiGet<AiSettingsResponse>("/api/ai/control/settings");
      hydrateSettings(settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI settings.");
    }
  };

  const saveMode = async (mode: "current" | "super") => {
    setSettingsBusy(true);
    setError("");
    try {
      const settings = await apiJson<AiSettingsResponse>("/api/ai/control/settings/mode", "PUT", { mode });
      hydrateSettings(settings);
      setToast(`Mode set to ${settings.mode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save AI mode.");
    } finally {
      setSettingsBusy(false);
    }
  };

  const saveSuperMode = async () => {
    const key = superApiKey.trim();
    if (!key) {
      setError("Super mode API key is required.");
      return;
    }
    setSettingsBusy(true);
    setError("");
    try {
      const settings = await apiJson<AiSettingsResponse>("/api/ai/control/settings/super", "PUT", {
        provider: superProvider,
        baseUrl: superBaseUrl.trim(),
        model: superModel.trim(),
        apiKey: key
      });
      hydrateSettings(settings);
      setSuperApiKey("");
      setToast("Super mode key saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save super mode settings.");
    } finally {
      setSettingsBusy(false);
    }
  };

  const clearSuperMode = async () => {
    setSettingsBusy(true);
    setError("");
    try {
      const settings = await apiJson<AiSettingsResponse>("/api/ai/control/settings/super", "DELETE");
      hydrateSettings(settings);
      setSuperApiKey("");
      setToast("Super mode removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear super mode settings.");
    } finally {
      setSettingsBusy(false);
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
    const sessionId = ensureActiveSession();
    setWebBusy(true);
    setError("");
    try {
      const response = await apiJson<WebSearchResponse>("/api/ai/control/web-search", "POST", { query });
      let mergedResults = response.results ?? [];

      if (mergedResults.length < 4) {
        const improvedQuery = improveSearchQuery(query);
        if (improvedQuery && improvedQuery.toLowerCase() !== query.toLowerCase()) {
          const retry = await apiJson<WebSearchResponse>("/api/ai/control/web-search", "POST", { query: improvedQuery });
          const combined = [...mergedResults, ...(retry.results ?? [])];
          const seen = new Set<string>();
          mergedResults = combined.filter((item) => {
            if (seen.has(item.url)) return false;
            seen.add(item.url);
            return true;
          });
        }
      }

      setWebResults(mergedResults);
      appendMessage(sessionId, createUserMessage(sessionId, `Search online: ${query}`), `Search online: ${query}`);
      appendMessage(
        sessionId,
        {
          ...createAssistantMessage(
            sessionId,
            mergedResults.length > 0
              ? `Found ${mergedResults.length} online sources for "${query}".`
              : `No web sources found for "${query}".`
          ),
          sources: mergedResults
        }
      );
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
    const sessionId = ensureActiveSession();
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
      appendMessage(sessionId, createUserMessage(sessionId, trimmed), trimmed);
      appendMessage(
        sessionId,
        createAssistantMessage(
          sessionId,
          `Prepared ${response.actionType} for ${response.target.section}. Confirm with exact phrase before expiry: ${response.approval.confirmPhrase}`
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to prepare action.");
    } finally {
      setActionBusy(false);
    }
  };

  const executePreparedAction = async () => {
    if (!preparedAction || actionBusy) return;
    const sessionId = ensureActiveSession();
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
      appendMessage(
        sessionId,
        createAssistantMessage(
          sessionId,
          `Executed: inserted "${result.insertedTitle}" into ${result.section}. Total products now: ${result.productsInSection}.${result.rollbackId ? ` Rollback ID: ${result.rollbackId}.` : ""}`
        )
      );
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

  const deleteSession = (sessionId: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((item) => item.id !== sessionId);
      if (sessionId === activeSessionId) {
        const next = [...remaining].sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt)[0] ?? null;
        setActiveSessionId(next?.id ?? null);
      }
      return remaining;
    });
    setMessagesBySession((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
    setMessage("");
    setPreparedAction(null);
    setExecuteIssues([]);
    setToolPanel("none");
    setWebResults([]);
  };

  const generateAiEmail = async (event: FormEvent) => {
    event.preventDefault();
    if (!emailObjective.trim() || emailBusy) return;
    const sessionId = ensureActiveSession();
    setEmailBusy(true);
    setError("");
    try {
      const objective = emailObjective.trim();
      const response = await apiJson<AiEmailResponse>("/api/ai/control/email/generate", "POST", {
        objective,
        section: emailSection,
        language: emailLanguage,
        tone: emailTone,
        includeEmojis: emailEmojis,
        saveDraft: true
      });
      setEmailResult(response);
      appendMessage(sessionId, createUserMessage(sessionId, `Generate email draft: ${objective}`), `Generate email draft: ${objective}`);
      appendMessage(
        sessionId,
        createAssistantMessage(
          sessionId,
          `Email draft generated for ${response.section} (${response.language}/${response.tone}). ${
            response.draftSaved && response.campaignId ? `Saved as campaign ${response.campaignId}.` : "Draft not saved."
          }`
        )
      );
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
    const sessionId = ensureActiveSession();
    setDocsBusy(true);
    setError("");
    try {
      const response = await apiJson<AiExportResponse>("/api/ai/control/export", "POST", {
        question,
        format: docsFormat
      });
      setExportResults((prev) => [response, ...prev].slice(0, 20));
      appendMessage(
        sessionId,
        createUserMessage(sessionId, `Generate ${docsFormat.toUpperCase()} export: ${question}`),
        `Generate ${docsFormat.toUpperCase()} export: ${question}`
      );
      appendMessage(
        sessionId,
        createAssistantMessage(sessionId, `Generated ${response.format.toUpperCase()} export: ${response.fileName}`)
      );
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
      setToast("Copied");
      const sessionId = ensureActiveSession();
      appendMessage(sessionId, createAssistantMessage(sessionId, "Copied generated HTML email to clipboard."));
    } catch {
      setError("Clipboard copy failed. Select and copy manually.");
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied");
    } catch {
      setError("Clipboard copy failed.");
    }
  };

  const renderMarkdownMessage = (content: string) => {
    const blocks = parseMarkdown(content);
    return (
      <div className="space-y-3">
        {blocks.map((block, index) => {
          const key = `b-${index}`;
          if (block.type === "heading") {
            const cls =
              block.level <= 2
                ? "text-base font-semibold text-white"
                : block.level === 3
                  ? "text-sm font-semibold text-white"
                  : "text-sm font-medium text-slate-100";
            return (
              <h4 key={key} className={cls}>
                {renderInline(block.text, `${key}-h`)}
              </h4>
            );
          }
          if (block.type === "list") {
            return (
              <ul key={key} className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-100">
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-i-${itemIndex}`}>{renderInline(item, `${key}-i-${itemIndex}`)}</li>
                ))}
              </ul>
            );
          }
          if (block.type === "blockquote") {
            return (
              <blockquote key={key} className="border-l-2 border-slate-600 pl-3 text-sm italic text-slate-300">
                {renderInline(block.text, `${key}-q`)}
              </blockquote>
            );
          }
          if (block.type === "code") {
            return (
              <div key={key} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/80">
                <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2 text-[11px] uppercase tracking-wide text-slate-400">
                  <span>{block.language || "code"}</span>
                  <button
                    type="button"
                    onClick={() => void copyText(block.code)}
                    className="rounded border border-slate-600 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-800"
                  >
                    Copy code
                  </button>
                </div>
                <pre className="overflow-x-auto px-3 py-3 text-xs leading-5 text-cyan-200">
                  <code>{block.code}</code>
                </pre>
              </div>
            );
          }
          return (
            <p key={key} className="whitespace-pre-wrap text-sm leading-6 text-slate-100">
              {renderInline(block.text, `${key}-p`)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <section className="h-[82vh] overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-950 text-slate-100 shadow-2xl">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[250px_1fr]">
        <aside className="hidden border-r border-slate-800/90 bg-slate-900/80 p-4 lg:flex lg:flex-col">
          <button
            type="button"
            onClick={createEmptySession}
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
            {sortedSessions.length === 0 ? (
              <p className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
                No asked sessions yet.
              </p>
            ) : (
              sortedSessions.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-900/70 px-2 py-2">
                  <button
                    type="button"
                    onClick={() => setActiveSessionId(item.id)}
                    className={`w-full text-left text-xs hover:text-white ${
                      item.id === activeSessionId ? "text-blue-200" : "text-slate-200"
                    }`}
                    title="Open this session"
                  >
                    {item.title}
                  </button>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">{new Date(item.lastUpdatedAt).toLocaleTimeString()}</span>
                    <button
                      type="button"
                      onClick={() => deleteSession(item.id)}
                      className="rounded-md border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="mt-3 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
          >
            Settings
          </button>
        </aside>

        <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900/95">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/90 px-4 py-3 md:px-6">
            <div>
              <h3 className="text-lg font-bold md:text-xl">AI Assistant Offers Help</h3>
              <p className="text-xs text-slate-400">
                Global system brain: status, web sources, and safe action prep.{" "}
                <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                  {aiMode} mode
                </span>
              </p>
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
          {toast ? <div className="px-4 pt-3 text-xs text-emerald-300 md:px-6">{toast}</div> : null}

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4">
              {activeSessionId ? (
                activeMessages.length > 0 ? (
                  activeMessages.map((item) => (
                    <article key={item.id} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`w-full max-w-[85%] rounded-2xl border px-4 py-3 md:max-w-[75%] ${
                          item.role === "user"
                            ? "border-slate-700 bg-slate-800 text-slate-100"
                            : item.status === "error"
                              ? "border-rose-800 bg-rose-950/30 text-rose-100"
                              : "border-slate-800 bg-slate-900/80 text-slate-100"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-slate-400">
                          <span>{item.role}</span>
                          <div className="flex items-center gap-2">
                            <span>{item.status}</span>
                            <button
                              type="button"
                              onClick={() => void copyText(item.content)}
                              className="rounded border border-slate-600 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-800"
                            >
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => removeMessage(item.sessionId, item.id)}
                              className="rounded border border-slate-600 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-800"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {item.role === "assistant" ? renderMarkdownMessage(item.content) : <p className="whitespace-pre-wrap text-sm leading-6">{item.content}</p>}
                        {item.status === "streaming" ? <p className="mt-2 text-xs text-slate-400">Generating...</p> : null}
                        {item.suggestions && item.suggestions.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
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
                                className="rounded-xl border border-slate-800 bg-slate-950 p-3 hover:bg-slate-800/80"
                              >
                                <p className="text-sm font-semibold text-blue-300">{source.title}</p>
                                <p className="mt-1 line-clamp-2 text-xs text-slate-300">{source.snippet}</p>
                                <p className="mt-1 text-[11px] text-slate-500">{source.source}</p>
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-center text-sm text-slate-400">
                    No messages in this session yet.
                  </div>
                )
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-center text-sm text-slate-400">
                  No active session. Create a new chat to start.
                </div>
              )}
            </div>
          </div>

          <footer className="border-t border-slate-800/90 bg-slate-950/95 px-4 py-4 md:px-6">
            <div className="mx-auto w-full max-w-3xl">
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
            </div>
          </footer>
        </div>
      </div>
      {settingsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-100">AI Settings</h4>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={settingsBusy}
                onClick={() => void saveMode("current")}
                className={`rounded-xl border px-3 py-2 text-left text-sm ${
                  aiMode === "current" ? "border-emerald-500 bg-emerald-900/30 text-emerald-200" : "border-slate-700 text-slate-200"
                }`}
              >
                <p className="font-semibold">Current mode</p>
                <p className="mt-1 text-xs text-slate-400">Default local AI system.</p>
              </button>
              <button
                type="button"
                disabled={settingsBusy || !superConfigured}
                onClick={() => void saveMode("super")}
                className={`rounded-xl border px-3 py-2 text-left text-sm ${
                  aiMode === "super" ? "border-cyan-500 bg-cyan-900/30 text-cyan-200" : "border-slate-700 text-slate-200"
                }`}
              >
                <p className="font-semibold">Super mode</p>
                <p className="mt-1 text-xs text-slate-400">External provider via your API key.</p>
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Super mode provider</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={superProvider}
                  onChange={(event) => setSuperProvider(event.target.value)}
                  placeholder="Provider"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
                <input
                  value={superModel}
                  onChange={(event) => setSuperModel(event.target.value)}
                  placeholder="Model (e.g. gpt-4o-mini)"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
                <input
                  value={superBaseUrl}
                  onChange={(event) => setSuperBaseUrl(event.target.value)}
                  placeholder="Base URL (e.g. https://api.openai.com/v1)"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm sm:col-span-2"
                />
                <input
                  value={superApiKey}
                  onChange={(event) => setSuperApiKey(event.target.value)}
                  type="password"
                  placeholder={superApiKeyMask ? `Stored key: ${superApiKeyMask} (enter new key to replace)` : "Paste API key"}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm sm:col-span-2"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={settingsBusy}
                  onClick={() => void saveSuperMode()}
                  className="rounded-full bg-cyan-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {settingsBusy ? "Saving..." : "Save Super Mode"}
                </button>
                <button
                  type="button"
                  disabled={settingsBusy || !superConfigured}
                  onClick={() => void clearSuperMode()}
                  className="rounded-full border border-slate-600 px-4 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-50"
                >
                  Clear Super Mode
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
