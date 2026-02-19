import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createAsyncQueue } from "../utils/asyncQueue.js";

export type CookieConsentRecord = {
  id: string;
  version: number;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  source: string;
  ipHash: string;
  userAgent: string;
  createdAt: string;
  updatedAt: string;
};

type CookieConsentStoreRecord = {
  consents: CookieConsentRecord[];
  updatedAt: string;
};

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

const normalizeConsentId = (value: string) => value.trim().toLowerCase();

const normalizeRecord = (item: Partial<CookieConsentRecord>): CookieConsentRecord => {
  const now = new Date().toISOString();
  return {
    id: typeof item.id === "string" && item.id.trim() ? normalizeConsentId(item.id) : randomUUID(),
    version: Number.isFinite(Number(item.version)) ? Math.max(1, Math.floor(Number(item.version))) : 1,
    essential: true,
    analytics: Boolean(item.analytics),
    marketing: Boolean(item.marketing),
    preferences: Boolean(item.preferences),
    source: typeof item.source === "string" ? item.source.slice(0, 80) : "web",
    ipHash: typeof item.ipHash === "string" ? item.ipHash.slice(0, 160) : "",
    userAgent: typeof item.userAgent === "string" ? item.userAgent.slice(0, 320) : "",
    createdAt: typeof item.createdAt === "string" && item.createdAt ? item.createdAt : now,
    updatedAt: typeof item.updatedAt === "string" && item.updatedAt ? item.updatedAt : now
  };
};

export const createCookieConsentStore = async (baseDir: string) => {
  const dataDir = path.join(baseDir, "cookies");
  const dataPath = path.join(dataDir, "consents.json");
  await ensureDir(dataDir);
  const initial: CookieConsentStoreRecord = { consents: [], updatedAt: new Date().toISOString() };
  const existing = await readJson<CookieConsentStoreRecord>(dataPath, initial);
  const hydrated: CookieConsentStoreRecord = {
    consents: Array.isArray(existing.consents) ? existing.consents.map(normalizeRecord) : [],
    updatedAt: typeof existing.updatedAt === "string" && existing.updatedAt ? existing.updatedAt : new Date().toISOString()
  };
  await writeJson(dataPath, hydrated);
  const runExclusive = createAsyncQueue();

  const read = async () => readJson<CookieConsentStoreRecord>(dataPath, hydrated);

  const save = async (record: CookieConsentStoreRecord) => {
    const next = { ...record, updatedAt: new Date().toISOString() };
    await writeJson(dataPath, next);
    return next;
  };

  const upsertConsent = async (input: {
    consentId: string;
    version: number;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
    source: string;
    ipHash: string;
    userAgent: string;
  }) => {
    return runExclusive(async () => {
      const record = await read();
      const targetId = normalizeConsentId(input.consentId);
      const index = record.consents.findIndex((item) => item.id === targetId);
      const now = new Date().toISOString();
      if (index >= 0) {
        const current = record.consents[index];
        const next = normalizeRecord({
          ...current,
          version: input.version,
          analytics: input.analytics,
          marketing: input.marketing,
          preferences: input.preferences,
          source: input.source,
          ipHash: input.ipHash,
          userAgent: input.userAgent,
          updatedAt: now
        });
        const consents = [...record.consents];
        consents[index] = next;
        await save({ ...record, consents });
        return next;
      }

      const created = normalizeRecord({
        id: targetId,
        version: input.version,
        analytics: input.analytics,
        marketing: input.marketing,
        preferences: input.preferences,
        source: input.source,
        ipHash: input.ipHash,
        userAgent: input.userAgent,
        createdAt: now,
        updatedAt: now
      });
      await save({ ...record, consents: [created, ...record.consents] });
      return created;
    });
  };

  const getById = async (consentId: string) => {
    const targetId = normalizeConsentId(consentId);
    if (!targetId) return null;
    const record = await read();
    return record.consents.find((item) => item.id === targetId) ?? null;
  };

  return {
    upsertConsent,
    getById
  };
};

