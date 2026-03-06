import { promises as fs } from "node:fs";
import path from "node:path";
import { createAsyncQueue } from "../utils/asyncQueue.js";

export type FashionSlideLikeScope = "homepage" | "editorial";

type FashionSlideLikeEntry = {
  count: number;
  likedClientIds: string[];
  updatedAt: string;
};

type FashionLikesStoreData = {
  scopes: Record<FashionSlideLikeScope, Record<string, FashionSlideLikeEntry>>;
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

const clampCount = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0);
const dedupe = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const normalizeEntry = (value: FashionSlideLikeEntry | undefined, seedLikes = 0): FashionSlideLikeEntry => {
  const normalizedSeed = clampCount(seedLikes);
  if (!value) {
    return {
      count: normalizedSeed,
      likedClientIds: [],
      updatedAt: new Date().toISOString()
    };
  }
  return {
    count: Math.max(clampCount(value.count), normalizedSeed),
    likedClientIds: dedupe(Array.isArray(value.likedClientIds) ? value.likedClientIds : []),
    updatedAt: typeof value.updatedAt === "string" && value.updatedAt.trim() ? value.updatedAt : new Date().toISOString()
  };
};

const ensureScopeShape = (value: FashionLikesStoreData): FashionLikesStoreData => ({
  scopes: {
    homepage: value.scopes?.homepage ?? {},
    editorial: value.scopes?.editorial ?? {}
  }
});

export const createFashionLikesStore = async (baseDir: string) => {
  const dataDir = path.join(baseDir, "fashion");
  const dataPath = path.join(dataDir, "likes.json");
  await ensureDir(dataDir);

  const initial: FashionLikesStoreData = {
    scopes: { homepage: {}, editorial: {} }
  };
  const existing = await readJson<FashionLikesStoreData>(dataPath, initial);
  const hydrated = ensureScopeShape(existing);
  await writeJson(dataPath, hydrated);

  const runExclusive = createAsyncQueue();

  const read = async () => ensureScopeShape(await readJson<FashionLikesStoreData>(dataPath, hydrated));
  const save = async (value: FashionLikesStoreData) => {
    const next = ensureScopeShape(value);
    await writeJson(dataPath, next);
    return next;
  };

  const syncSlides = async (scope: FashionSlideLikeScope, slideIds: string[]) =>
    runExclusive(async () => {
      const current = await read();
      const keep = new Set(slideIds.map((id) => id.trim()).filter(Boolean));
      const scopeEntries = current.scopes[scope] ?? {};
      const nextEntries: Record<string, FashionSlideLikeEntry> = {};
      Object.entries(scopeEntries).forEach(([slideId, entry]) => {
        if (!keep.has(slideId)) return;
        nextEntries[slideId] = normalizeEntry(entry);
      });
      current.scopes[scope] = nextEntries;
      await save(current);
    });

  const getSummary = async (
    scope: FashionSlideLikeScope,
    clientId: string,
    slides: Array<{ id: string; seedLikes?: number }>
  ) =>
    runExclusive(async () => {
      const current = await read();
      const scopeEntries = { ...(current.scopes[scope] ?? {}) };
      const counts: Record<string, number> = {};
      const liked: Record<string, boolean> = {};
      let changed = false;

      slides.forEach((slide) => {
        const slideId = slide.id.trim();
        if (!slideId) return;
        const normalized = normalizeEntry(scopeEntries[slideId], slide.seedLikes ?? 0);
        const hadEntry = Boolean(scopeEntries[slideId]);
        scopeEntries[slideId] = normalized;
        if (!hadEntry) changed = true;
        counts[slideId] = normalized.count;
        liked[slideId] = normalized.likedClientIds.includes(clientId);
      });

      if (changed) {
        current.scopes[scope] = scopeEntries;
        await save(current);
      }

      return { counts, liked };
    });

  const toggle = async (
    scope: FashionSlideLikeScope,
    slideId: string,
    clientId: string,
    seedLikes = 0
  ) =>
    runExclusive(async () => {
      const current = await read();
      const scopeEntries = { ...(current.scopes[scope] ?? {}) };
      const normalizedId = slideId.trim();
      const entry = normalizeEntry(scopeEntries[normalizedId], seedLikes);
      const clientIds = new Set(entry.likedClientIds);
      let liked = false;
      let nextCount = entry.count;

      if (clientIds.has(clientId)) {
        clientIds.delete(clientId);
        liked = false;
        nextCount = Math.max(0, entry.count - 1);
      } else {
        clientIds.add(clientId);
        liked = true;
        nextCount = entry.count + 1;
      }

      scopeEntries[normalizedId] = {
        count: clampCount(nextCount),
        likedClientIds: Array.from(clientIds),
        updatedAt: new Date().toISOString()
      };
      current.scopes[scope] = scopeEntries;
      await save(current);

      return {
        count: scopeEntries[normalizedId].count,
        liked
      };
    });

  return {
    syncSlides,
    getSummary,
    toggle
  };
};
