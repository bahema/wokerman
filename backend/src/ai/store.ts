import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createAsyncQueue } from "../utils/asyncQueue.js";

type ApprovalRecord = {
  id: string;
  actionType: string;
  targetSection: string;
  payloadHash: string;
  confirmPhrase: string;
  createdAt: string;
  expiresAt: number;
};

type ActionAuditRecord = {
  id: string;
  at: string;
  action: string;
  status: "allowed" | "denied" | "executed";
  role: string;
  authSource: string;
  path: string;
  ip: string;
  metadata: Record<string, unknown>;
};

type RollbackSnapshotRecord = {
  id: string;
  at: string;
  reason: string;
  role: string;
  authSource: string;
  content: unknown;
};

type AiSuperProvider = "openai_compatible";
type AiMode = "current" | "super";

type AiSuperSettingsRecord = {
  provider: AiSuperProvider;
  baseUrl: string;
  model: string;
  apiKeyCiphertext: string;
  apiKeyMask: string;
  updatedAt: string;
};

type AiSettingsRecord = {
  mode: AiMode;
  superMode: AiSuperSettingsRecord | null;
  updatedAt: string;
};

type AiControlRecord = {
  approvals: ApprovalRecord[];
  audits: ActionAuditRecord[];
  rollbackSnapshots: RollbackSnapshotRecord[];
  settings: AiSettingsRecord;
  updatedAt: string;
};

const APPROVAL_TTL_MS = 10 * 60 * 1000;
const MAX_AUDITS = 300;
const MAX_ROLLBACKS = 50;

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const readJson = async <T>(filePath: string, fallback: T): Promise<T> => {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = async (filePath: string, data: unknown) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const trimTo = <T>(items: T[], max: number) => (items.length <= max ? items : items.slice(items.length - max));

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");

const maskApiKey = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const suffix = trimmed.slice(-4);
  return `****${suffix}`;
};

const createEncryptionKey = (secret: string) =>
  createHash("sha256")
    .update(secret)
    .digest();

const encryptWithSecret = (secret: string, plaintext: string) => {
  const key = createEncryptionKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
};

const decryptWithSecret = (secret: string, token: string) => {
  const key = createEncryptionKey(secret);
  const raw = Buffer.from(token, "base64");
  if (raw.length < 12 + 16 + 1) return "";
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
};

export const hashAiPayload = (payload: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

export const createAiControlStore = async (
  baseDir: string,
  options?: {
    encryptionSecret?: string;
  }
) => {
  const dataDir = path.join(baseDir, "ai");
  const dataPath = path.join(dataDir, "control.json");
  await ensureDir(dataDir);

  const initial: AiControlRecord = {
    approvals: [],
    audits: [],
    rollbackSnapshots: [],
    settings: {
      mode: "current",
      superMode: null,
      updatedAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  };

  const existing = await readJson<AiControlRecord>(dataPath, initial);
  await writeJson(dataPath, existing);
  const runExclusive = createAsyncQueue();

  const read = async (): Promise<AiControlRecord> => {
    const record = await readJson<AiControlRecord>(dataPath, initial);
    const now = Date.now();
    return {
      ...record,
      approvals: (record.approvals ?? []).filter((item) => item.expiresAt > now),
      audits: record.audits ?? [],
      rollbackSnapshots: record.rollbackSnapshots ?? [],
      settings: {
        mode: record.settings?.mode === "super" ? "super" : "current",
        superMode: record.settings?.superMode ?? null,
        updatedAt: record.settings?.updatedAt ?? new Date().toISOString()
      }
    };
  };

  const save = async (record: AiControlRecord) => {
    const next = { ...record, updatedAt: new Date().toISOString() };
    await writeJson(dataPath, next);
    return next;
  };

  const createApproval = async (input: { actionType: string; targetSection: string; payloadHash: string }) => {
    return runExclusive(async () => {
      const record = await read();
      const id = randomUUID();
      const confirmPhrase = `EXECUTE ${id.slice(0, 8).toUpperCase()}`;
      const createdAt = new Date().toISOString();
      const approval: ApprovalRecord = {
        id,
        actionType: input.actionType,
        targetSection: input.targetSection,
        payloadHash: input.payloadHash,
        confirmPhrase,
        createdAt,
        expiresAt: Date.now() + APPROVAL_TTL_MS
      };
      await save({ ...record, approvals: [...record.approvals, approval] });
      return approval;
    });
  };

  const verifyAndConsumeApproval = async (input: { approvalId: string; confirmText: string; payloadHash: string }) => {
    return runExclusive(async () => {
      const record = await read();
      const found = record.approvals.find((item) => item.id === input.approvalId);
      if (!found) return { ok: false as const, error: "Approval token not found or expired." };
      if (found.confirmPhrase !== input.confirmText.trim()) {
        return { ok: false as const, error: "Confirmation text does not match approval phrase." };
      }
      if (found.payloadHash !== input.payloadHash) {
        return { ok: false as const, error: "Prepared payload changed. Re-prepare action before execute." };
      }
      const nextApprovals = record.approvals.filter((item) => item.id !== found.id);
      await save({ ...record, approvals: nextApprovals });
      return { ok: true as const, approval: found };
    });
  };

  const logAudit = async (audit: Omit<ActionAuditRecord, "id" | "at">) => {
    await runExclusive(async () => {
      const record = await read();
      const next: ActionAuditRecord = {
        id: randomUUID(),
        at: new Date().toISOString(),
        ...audit
      };
      await save({
        ...record,
        audits: trimTo([...record.audits, next], MAX_AUDITS)
      });
    });
  };

  const captureRollbackSnapshot = async (input: {
    reason: string;
    role: string;
    authSource: string;
    content: unknown;
  }) => {
    return runExclusive(async () => {
      const record = await read();
      const snapshot: RollbackSnapshotRecord = {
        id: randomUUID(),
        at: new Date().toISOString(),
        reason: input.reason,
        role: input.role,
        authSource: input.authSource,
        content: clone(input.content)
      };
      await save({
        ...record,
        rollbackSnapshots: trimTo([...record.rollbackSnapshots, snapshot], MAX_ROLLBACKS)
      });
      return { id: snapshot.id, at: snapshot.at, reason: snapshot.reason };
    });
  };

  const getSafetySummary = async () => {
    const record = await read();
    return {
      approvalsOpen: record.approvals.length,
      audits: record.audits.slice(-20),
      rollbackSnapshots: record.rollbackSnapshots.slice(-10).map((item) => ({
        id: item.id,
        at: item.at,
        reason: item.reason,
        role: item.role,
        authSource: item.authSource
      }))
    };
  };

  const setMode = async (mode: AiMode) => {
    return runExclusive(async () => {
      const record = await read();
      const normalizedMode: AiMode = mode === "super" ? "super" : "current";
      const superConfigured = Boolean(record.settings.superMode);
      const nextMode: AiMode = normalizedMode === "super" && superConfigured ? "super" : "current";
      const nextSettings: AiSettingsRecord = {
        ...record.settings,
        mode: nextMode,
        updatedAt: new Date().toISOString()
      };
      await save({ ...record, settings: nextSettings });
      return {
        mode: nextSettings.mode,
        superModeConfigured: Boolean(nextSettings.superMode),
        superMode: nextSettings.superMode
          ? {
              provider: nextSettings.superMode.provider,
              baseUrl: nextSettings.superMode.baseUrl,
              model: nextSettings.superMode.model,
              apiKeyMask: nextSettings.superMode.apiKeyMask,
              updatedAt: nextSettings.superMode.updatedAt
            }
          : null
      };
    });
  };

  const upsertSuperMode = async (input: { apiKey: string; provider?: string; baseUrl?: string; model?: string }) => {
    return runExclusive(async () => {
      const record = await read();
      const apiKey = input.apiKey.trim();
      if (!apiKey) {
        throw new Error("Super mode API key is required.");
      }
      const encryptionSecret = (options?.encryptionSecret ?? "").trim();
      if (!encryptionSecret) {
        throw new Error("AI super mode encryption secret is not configured on this environment.");
      }
      const provider: AiSuperProvider = "openai_compatible";
      const baseUrl = normalizeBaseUrl(input.baseUrl ?? "https://api.openai.com/v1");
      const model = (input.model ?? "gpt-4o-mini").trim() || "gpt-4o-mini";
      const nowIso = new Date().toISOString();
      const superMode: AiSuperSettingsRecord = {
        provider,
        baseUrl,
        model,
        apiKeyCiphertext: encryptWithSecret(encryptionSecret, apiKey),
        apiKeyMask: maskApiKey(apiKey),
        updatedAt: nowIso
      };
      const nextSettings: AiSettingsRecord = {
        ...record.settings,
        superMode,
        updatedAt: nowIso
      };
      await save({ ...record, settings: nextSettings });
      return {
        mode: nextSettings.mode,
        superModeConfigured: true,
        superMode: {
          provider: superMode.provider,
          baseUrl: superMode.baseUrl,
          model: superMode.model,
          apiKeyMask: superMode.apiKeyMask,
          updatedAt: superMode.updatedAt
        }
      };
    });
  };

  const clearSuperMode = async () => {
    return runExclusive(async () => {
      const record = await read();
      const nextSettings: AiSettingsRecord = {
        mode: "current",
        superMode: null,
        updatedAt: new Date().toISOString()
      };
      await save({ ...record, settings: nextSettings });
      return {
        mode: nextSettings.mode,
        superModeConfigured: false,
        superMode: null
      };
    });
  };

  const getSettings = async () => {
    const record = await read();
    const settings = record.settings;
    return {
      mode: settings.mode,
      superModeConfigured: Boolean(settings.superMode),
      superMode: settings.superMode
        ? {
            provider: settings.superMode.provider,
            baseUrl: settings.superMode.baseUrl,
            model: settings.superMode.model,
            apiKeyMask: settings.superMode.apiKeyMask,
            updatedAt: settings.superMode.updatedAt
          }
        : null
    };
  };

  const getRuntimeSettings = async () => {
    const record = await read();
    const settings = record.settings;
    if (!settings.superMode) {
      return { mode: "current" as const, superMode: null };
    }
    const encryptionSecret = (options?.encryptionSecret ?? "").trim();
    if (!encryptionSecret) {
      return { mode: "current" as const, superMode: null };
    }
    try {
      const apiKey = decryptWithSecret(encryptionSecret, settings.superMode.apiKeyCiphertext).trim();
      if (!apiKey) {
        return { mode: "current" as const, superMode: null };
      }
      return {
        mode: settings.mode,
        superMode: {
          provider: settings.superMode.provider,
          baseUrl: settings.superMode.baseUrl,
          model: settings.superMode.model,
          apiKey
        }
      };
    } catch {
      return { mode: "current" as const, superMode: null };
    }
  };

  return {
    createApproval,
    verifyAndConsumeApproval,
    logAudit,
    captureRollbackSnapshot,
    getSafetySummary,
    getSettings,
    getRuntimeSettings,
    setMode,
    upsertSuperMode,
    clearSuperMode
  };
};
