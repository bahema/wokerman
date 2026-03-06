import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import type { FashionContent, FashionContentMeta } from "../../../shared/fashionTypes";
import { defaultFashionContent } from "../db/defaultFashionContent.js";
import { validateFashionContent } from "./validateContent.js";
import { createAsyncQueue } from "../utils/asyncQueue.js";

type FashionStoreRecord = {
  published: FashionContent;
  draft: FashionContent | null;
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

const createPublishedRevision = (content: FashionContent) =>
  createHash("sha256").update(JSON.stringify(content)).digest("hex").slice(0, 16);

export const createFashionStore = async (baseDir: string) => {
  const dataDir = path.join(baseDir, "fashion");
  const dataPath = path.join(dataDir, "content.json");
  await ensureDir(dataDir);

  const initial: FashionStoreRecord = {
    published: clone(defaultFashionContent),
    draft: null,
    updatedAt: new Date().toISOString()
  };
  const existing = await readJson<FashionStoreRecord>(dataPath, initial);
  const publishedValidation = validateFashionContent(existing.published);
  const draftValidation =
    existing.draft === null ? { ok: true as const, content: null } : validateFashionContent(existing.draft);
  const hydrated: FashionStoreRecord =
    !publishedValidation.ok || !draftValidation.ok
      ? initial
      : {
          published: publishedValidation.content,
          draft: existing.draft === null ? null : draftValidation.content,
          updatedAt: typeof existing.updatedAt === "string" && existing.updatedAt.trim() ? existing.updatedAt : initial.updatedAt
        };
  await writeJson(dataPath, hydrated);

  const runExclusive = createAsyncQueue();

  const read = async () => {
    const record = await readJson<FashionStoreRecord>(dataPath, hydrated);
    const published = validateFashionContent(record.published);
    if (!published.ok) {
      return initial;
    }
    const draft =
      record.draft === null
        ? null
        : (() => {
            const result = validateFashionContent(record.draft);
            return result.ok ? result.content : null;
          })();
    return {
      published: published.content,
      draft,
      updatedAt: typeof record.updatedAt === "string" && record.updatedAt.trim() ? record.updatedAt : new Date().toISOString()
    };
  };

  const save = async (record: FashionStoreRecord) => {
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

  const getMeta = async (): Promise<FashionContentMeta> => {
    const record = await read();
    return {
      updatedAt: record.updatedAt,
      hasDraft: Boolean(record.draft),
      publishedRevision: createPublishedRevision(record.published),
      publishedProductCount: record.published.productCatalog.length,
      draftProductCount: record.draft?.productCatalog.length ?? 0,
      homepageSlideCount: record.published.homepageSlides.length,
      editorialSlideCount: record.published.editorialSlides.length
    };
  };

  const saveDraft = async (draft: FashionContent) => {
    return runExclusive(async () => {
      const validation = validateFashionContent(draft);
      if (!validation.ok) throw new Error(validation.error);
      const record = await read();
      await save({ ...record, draft: validation.content });
      return validation.content;
    });
  };

  const publish = async (payload?: FashionContent) => {
    return runExclusive(async () => {
      const record = await read();
      const nextPublished = payload ?? record.draft ?? record.published;
      const validation = validateFashionContent(nextPublished);
      if (!validation.ok) throw new Error(validation.error);
      const next = await save({
        ...record,
        published: validation.content,
        draft: null
      });
      return next.published;
    });
  };

  const reset = async () => {
    return runExclusive(async () => {
      const next: FashionStoreRecord = {
        published: clone(defaultFashionContent),
        draft: null,
        updatedAt: new Date().toISOString()
      };
      await writeJson(dataPath, next);
      return next;
    });
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
