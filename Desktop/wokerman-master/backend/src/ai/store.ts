import path from "node:path";
import { promises as fs } from "node:fs";

export type AiProvider = "openai_compatible";
export type AiMode = "current" | "super";

type AiState = {
  mode: AiMode;
  superMode: {
    provider: AiProvider;
    baseUrl: string;
    model: string;
    apiKey: string;
    updatedAt: string;
  } | null;
};

const DEFAULT_AI_STATE: AiState = {
  mode: "current",
  superMode: null
};

const maskApiKey = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return `${"*".repeat(Math.max(0, trimmed.length - 2))}${trimmed.slice(-2)}`;
  return `${trimmed.slice(0, 4)}${"*".repeat(trimmed.length - 8)}${trimmed.slice(-4)}`;
};

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");

const parseState = (raw: string): AiState => {
  try {
    const parsed = JSON.parse(raw) as Partial<AiState>;
    if (!parsed || typeof parsed !== "object") return DEFAULT_AI_STATE;
    const mode = parsed.mode === "super" ? "super" : "current";
    const superModeRaw = parsed.superMode;
    if (!superModeRaw || typeof superModeRaw !== "object") {
      return { mode, superMode: null };
    }
    const provider = superModeRaw.provider === "openai_compatible" ? "openai_compatible" : "openai_compatible";
    const baseUrl = typeof superModeRaw.baseUrl === "string" ? normalizeBaseUrl(superModeRaw.baseUrl) : "";
    const model = typeof superModeRaw.model === "string" ? superModeRaw.model.trim() : "";
    const apiKey = typeof superModeRaw.apiKey === "string" ? superModeRaw.apiKey.trim() : "";
    const updatedAt = typeof superModeRaw.updatedAt === "string" ? superModeRaw.updatedAt : new Date().toISOString();
    if (!baseUrl || !model || !apiKey) {
      return { mode: "current", superMode: null };
    }
    return {
      mode,
      superMode: {
        provider,
        baseUrl,
        model,
        apiKey,
        updatedAt
      }
    };
  } catch {
    return DEFAULT_AI_STATE;
  }
};

export const createAiControlStore = async (baseDir: string) => {
  const aiDir = path.join(baseDir, "ai");
  const statePath = path.join(aiDir, "state.json");

  await fs.mkdir(aiDir, { recursive: true });
  try {
    await fs.access(statePath);
  } catch {
    await fs.writeFile(statePath, JSON.stringify(DEFAULT_AI_STATE, null, 2), "utf-8");
  }

  const load = async (): Promise<AiState> => {
    const raw = await fs.readFile(statePath, "utf-8");
    return parseState(raw);
  };

  const save = async (state: AiState) => {
    await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");
  };

  return {
    getSettings: async () => {
      const state = await load();
      return {
        mode: state.mode,
        superModeConfigured: Boolean(state.superMode?.apiKey),
        superMode: state.superMode
          ? {
              provider: state.superMode.provider,
              baseUrl: state.superMode.baseUrl,
              model: state.superMode.model,
              apiKeyMask: maskApiKey(state.superMode.apiKey),
              updatedAt: state.superMode.updatedAt
            }
          : null
      };
    },
    getRuntimeSettings: async () => {
      const state = await load();
      return state;
    },
    setMode: async (mode: AiMode) => {
      const state = await load();
      const next: AiState = { ...state, mode };
      await save(next);
      return next;
    },
    upsertSuperMode: async (input: {
      provider?: AiProvider;
      baseUrl: string;
      model: string;
      apiKey?: string;
    }) => {
      const state = await load();
      const existing = state.superMode;
      const baseUrl = normalizeBaseUrl(input.baseUrl);
      const model = input.model.trim();
      const provider = input.provider ?? "openai_compatible";
      const apiKey = (input.apiKey ?? "").trim() || existing?.apiKey || "";
      if (!baseUrl) throw new Error("baseUrl is required.");
      if (!model) throw new Error("model is required.");
      if (!apiKey) throw new Error("apiKey is required.");
      const next: AiState = {
        mode: "super",
        superMode: {
          provider,
          baseUrl,
          model,
          apiKey,
          updatedAt: new Date().toISOString()
        }
      };
      await save(next);
      return next;
    },
    clearSuperMode: async () => {
      const state = await load();
      const next: AiState = { ...state, mode: "current", superMode: null };
      await save(next);
      return next;
    }
  };
};

