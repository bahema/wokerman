import { createHash, randomUUID } from "node:crypto";
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

type AiControlRecord = {
  approvals: ApprovalRecord[];
  audits: ActionAuditRecord[];
  rollbackSnapshots: RollbackSnapshotRecord[];
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

export const hashAiPayload = (payload: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

export const createAiControlStore = async (baseDir: string) => {
  const dataDir = path.join(baseDir, "ai");
  const dataPath = path.join(dataDir, "control.json");
  await ensureDir(dataDir);

  const initial: AiControlRecord = {
    approvals: [],
    audits: [],
    rollbackSnapshots: [],
    updatedAt: new Date().toISOString()
  };

  const existing = await readJson<AiControlRecord>(dataPath, initial);
  await writeJson(dataPath, existing);
  const runExclusive = createAsyncQueue();

  const read = async () => {
    const record = await readJson<AiControlRecord>(dataPath, initial);
    const now = Date.now();
    return {
      ...record,
      approvals: (record.approvals ?? []).filter((item) => item.expiresAt > now),
      audits: record.audits ?? [],
      rollbackSnapshots: record.rollbackSnapshots ?? []
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

  return {
    createApproval,
    verifyAndConsumeApproval,
    logAudit,
    captureRollbackSnapshot,
    getSafetySummary
  };
};
