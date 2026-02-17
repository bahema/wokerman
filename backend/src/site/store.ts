import { promises as fs } from "node:fs";
import path from "node:path";
import type { SiteContent } from "../../../shared/siteTypes";
import { defaultPublishedContent } from "../db/defaultPublishedContent.js";
import { validateSiteContent } from "./validateContent.js";

type SiteStoreRecord = {
  published: SiteContent;
  draft: SiteContent | null;
  updatedAt: string;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

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

const isLegacyEmptyPublishedContent = (content: SiteContent) =>
  content.products.forex.length === 0 &&
  content.products.betting.length === 0 &&
  content.products.software.length === 0 &&
  content.products.social.length === 0 &&
  content.industries.length === 0;

export const createSiteStore = async (baseDir: string) => {
  const dataDir = path.join(baseDir, "site");
  const dataPath = path.join(dataDir, "content.json");
  await ensureDir(dataDir);

  const initial: SiteStoreRecord = {
    published: clone(defaultPublishedContent),
    draft: null,
    updatedAt: new Date().toISOString()
  };
  const existing = await readJson<SiteStoreRecord>(dataPath, initial);
  const hydrated =
    existing.draft === null && isLegacyEmptyPublishedContent(existing.published)
      ? { ...existing, published: clone(defaultPublishedContent), updatedAt: new Date().toISOString() }
      : existing;
  await writeJson(dataPath, hydrated);

  const read = async () => readJson<SiteStoreRecord>(dataPath, initial);

  const save = async (record: SiteStoreRecord) => {
    const next = { ...record, updatedAt: new Date().toISOString() };
    await writeJson(dataPath, next);
    return next;
  };

  const getPublished = async () => {
    const record = await read();
    return record.published;
  };

  const getDraft = async () => {
    const record = await read();
    return record.draft;
  };

  const getMeta = async () => {
    const record = await read();
    return {
      updatedAt: record.updatedAt,
      hasDraft: Boolean(record.draft)
    };
  };

  const saveDraft = async (draft: SiteContent) => {
    const validation = validateSiteContent(draft);
    if (!validation.ok) throw new Error(validation.error);
    const record = await read();
    await save({ ...record, draft: validation.content });
    return validation.content;
  };

  const publish = async (payload?: SiteContent) => {
    const record = await read();
    const nextPublished = payload ?? record.draft ?? record.published;
    const validation = validateSiteContent(nextPublished);
    if (!validation.ok) throw new Error(validation.error);
    const next = await save({
      ...record,
      published: validation.content,
      draft: null
    });
    return next.published;
  };

  const reset = async () => {
    const next: SiteStoreRecord = {
      published: clone(defaultPublishedContent),
      draft: null,
      updatedAt: new Date().toISOString()
    };
    await writeJson(dataPath, next);
    return next;
  };

  return {
    getPublished,
    getDraft,
    getMeta,
    saveDraft,
    publish,
    reset
  };
};
