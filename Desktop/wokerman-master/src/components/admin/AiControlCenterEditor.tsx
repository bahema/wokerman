import { useEffect, useState } from "react";
import { apiGet, apiJson } from "../../api/client";

type AiSettingsResponse = {
  mode: "current" | "super";
  superModeConfigured: boolean;
  superMode: null | {
    provider: "openai_compatible";
    baseUrl: string;
    model: string;
    apiKeyMask: string;
    updatedAt: string;
  };
};

type AiChatResponse = {
  ok: boolean;
  mode: "super";
  answer: string;
  modelUsed?: string;
  attemptedModels?: string[];
  suggestions: string[];
};

type AiHealthResponse = {
  ok: boolean;
  modelUsed?: string;
  attemptedModels?: string[];
  responseTimeMs?: number;
  answer?: string;
};

type AiPreparedAction =
  | {
      kind: "update_hero";
      summary: string;
      payload: {
        headline?: string;
        subtext?: string;
        ctaPrimaryLabel?: string;
        ctaPrimaryTarget?: string;
        ctaSecondaryLabel?: string;
        ctaSecondaryTarget?: string;
      };
    }
  | {
      kind: "update_confirmation_template";
      summary: string;
      payload: {
        mode?: "rich" | "html";
        subject?: string;
        previewText?: string;
        bodyRich?: string;
        bodyHtml?: string;
      };
    };

const AiControlCenterEditor = () => {
  const [mode, setMode] = useState<"current" | "super">("current");
  const [provider] = useState<"openai_compatible">("openai_compatible");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4o-mini");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyMask, setApiKeyMask] = useState("");
  const [superConfigured, setSuperConfigured] = useState(false);
  const [prompt, setPrompt] = useState("Audit my current email system and give 5 fixes.");
  const [answer, setAnswer] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [modelInfo, setModelInfo] = useState("");
  const [healthInfo, setHealthInfo] = useState("");
  const [actionPrompt, setActionPrompt] = useState("Update homepage hero headline to highlight instant onboarding.");
  const [preparedAction, setPreparedAction] = useState<AiPreparedAction | null>(null);
  const [applyResult, setApplyResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const settings = await apiGet<AiSettingsResponse>("/api/ai/control/settings");
        if (cancelled) return;
        setMode(settings.mode);
        setSuperConfigured(settings.superModeConfigured);
        setBaseUrl(settings.superMode?.baseUrl ?? "https://api.openai.com/v1");
        setModel(settings.superMode?.model ?? "gpt-4o-mini");
        setApiKeyMask(settings.superMode?.apiKeyMask ?? "");
      } catch (nextError) {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : "Failed to load AI settings.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveSettings = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await apiJson<AiSettingsResponse>("/api/ai/control/settings/super", "PUT", {
        provider,
        baseUrl,
        model,
        apiKey
      });
      const refreshed = await apiGet<AiSettingsResponse>("/api/ai/control/settings");
      setMode(refreshed.mode);
      setSuperConfigured(refreshed.superModeConfigured);
      setApiKey("");
      setApiKeyMask(refreshed.superMode?.apiKeyMask ?? "");
      setMessage("AI provider settings saved.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to save AI settings.");
    } finally {
      setBusy(false);
    }
  };

  const saveMode = async (nextMode: "current" | "super") => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const settings = await apiJson<AiSettingsResponse>("/api/ai/control/settings/mode", "PUT", { mode: nextMode });
      setMode(settings.mode);
      setSuperConfigured(settings.superModeConfigured);
      setMessage(`AI mode set to ${settings.mode}.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to update AI mode.");
    } finally {
      setBusy(false);
    }
  };

  const runChat = async () => {
    const messageValue = prompt.trim();
    if (!messageValue) {
      setError("Prompt is required.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await apiJson<AiChatResponse>("/api/ai/control/chat", "POST", { message: messageValue });
      setAnswer(response.answer);
      setSuggestions(response.suggestions ?? []);
      setModelInfo(
        response.modelUsed
          ? `Model: ${response.modelUsed}${response.attemptedModels?.length ? ` | Fallback chain: ${response.attemptedModels.join(" -> ")}` : ""}`
          : ""
      );
      setMessage("AI response received.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "AI chat request failed.");
    } finally {
      setBusy(false);
    }
  };

  const runHealthCheck = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await apiJson<AiHealthResponse>("/api/ai/control/health", "POST", {});
      const details = [
        response.modelUsed ? `Model ${response.modelUsed}` : "Model n/a",
        typeof response.responseTimeMs === "number" ? `${response.responseTimeMs}ms` : "",
        response.answer ? `Reply: ${response.answer}` : ""
      ]
        .filter(Boolean)
        .join(" | ");
      setHealthInfo(details || "Health check passed.");
      setMessage("AI provider health check passed.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "AI health check failed.");
    } finally {
      setBusy(false);
    }
  };

  const prepareAction = async () => {
    const value = actionPrompt.trim();
    if (!value) {
      setError("Action prompt is required.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await apiJson<{ ok: boolean; action: AiPreparedAction }>("/api/ai/control/prepare-action", "POST", {
        prompt: value
      });
      setPreparedAction(response.action);
      setApplyResult("");
      setMessage("AI action prepared. Review then apply.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to prepare AI action.");
    } finally {
      setBusy(false);
    }
  };

  const applyPreparedAction = async () => {
    if (!preparedAction) {
      setError("Prepare an action first.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await apiJson<{ ok: boolean; summary?: string; applied?: string }>("/api/ai/control/apply-action", "POST", {
        action: preparedAction
      });
      setApplyResult(`Applied ${response.applied ?? "action"}${response.summary ? `: ${response.summary}` : ""}`);
      setMessage("AI action applied and saved.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to apply AI action.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <h3 className="mb-3 text-lg font-bold">Provider Settings</h3>
        <div className="space-y-3">
          <label className="block text-sm">
            Base URL
            <input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
              placeholder="https://api.openai.com/v1"
            />
          </label>
          <label className="block text-sm">
            Model
            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
              placeholder="gpt-4o-mini"
            />
          </label>
          <label className="block text-sm">
            API Key
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
              placeholder={apiKeyMask ? `Stored key: ${apiKeyMask}` : "Paste provider API key"}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveSettings()}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Save AI Settings
            </button>
            <button
              type="button"
              disabled={busy || !superConfigured}
              onClick={() => void saveMode("super")}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-600 disabled:opacity-60"
            >
              Enable Super Mode
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveMode("current")}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-600 disabled:opacity-60"
            >
              Set Current Mode
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Current mode: <span className="font-semibold">{mode}</span> | Super configured:{" "}
            <span className="font-semibold">{superConfigured ? "yes" : "no"}</span>
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <h3 className="mb-3 text-lg font-bold">AI Live Test</h3>
        <div className="space-y-3">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            placeholder="Ask AI to analyze, edit, or generate."
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void runChat()}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Run AI Chat Test
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runHealthCheck()}
            className="ml-2 rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-600 disabled:opacity-60"
          >
            Health Check
          </button>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {!error && message ? <p className="text-sm text-emerald-600">{message}</p> : null}
          {healthInfo ? <p className="text-xs text-slate-500 dark:text-slate-400">{healthInfo}</p> : null}
          {modelInfo ? <p className="text-xs text-slate-500 dark:text-slate-400">{modelInfo}</p> : null}
          {answer ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950">
              <p className="mb-2 whitespace-pre-wrap">{answer}</p>
              {suggestions.length ? (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs dark:border-slate-600"
                      onClick={() => setPrompt(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <h3 className="mb-3 text-lg font-bold">AI Safe Actions</h3>
        <div className="space-y-3">
          <textarea
            value={actionPrompt}
            onChange={(event) => setActionPrompt(event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            placeholder="Describe one change for hero or confirmation email template."
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void prepareAction()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Prepare Action
            </button>
            <button
              type="button"
              disabled={busy || !preparedAction}
              onClick={() => void applyPreparedAction()}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-600 disabled:opacity-60"
            >
              Apply Prepared Action
            </button>
          </div>
          {preparedAction ? (
            <pre className="overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-950">
              {JSON.stringify(preparedAction, null, 2)}
            </pre>
          ) : null}
          {applyResult ? <p className="text-sm text-emerald-600">{applyResult}</p> : null}
        </div>
      </section>
    </div>
  );
};

export default AiControlCenterEditor;
