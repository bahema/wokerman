import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createAsyncQueue } from "../utils/asyncQueue.js";

export type StoredMediaItem = {
  id: string;
  name: string;
  fileName: string;
  url: string;
  mime: string;
  sizeBytes: number;
  createdAt: string;
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

export const createMediaStore = async (baseDir: string) => {
  const uploadsDir = path.join(baseDir, "uploads");
  const metadataPath = path.join(baseDir, "media.json");
  await ensureDir(baseDir);
  await ensureDir(uploadsDir);
  const existing = await readJson<StoredMediaItem[]>(metadataPath, []);
  await writeJson(metadataPath, existing);
  const runExclusive = createAsyncQueue();

  const list = async () => {
    const items = await readJson<StoredMediaItem[]>(metadataPath, []);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  };

  const add = async (input: Omit<StoredMediaItem, "id" | "createdAt">) => {
    return runExclusive(async () => {
      const next: StoredMediaItem = {
        ...input,
        id: randomUUID(),
        createdAt: new Date().toISOString()
      };
      const items = await readJson<StoredMediaItem[]>(metadataPath, []);
      items.unshift(next);
      await writeJson(metadataPath, items);
      return next;
    });
  };

  const remove = async (id: string) => {
    return runExclusive(async () => {
      const items = await readJson<StoredMediaItem[]>(metadataPath, []);
      const target = items.find((item) => item.id === id);
      if (!target) return null;
      const next = items.filter((item) => item.id !== id);
      await writeJson(metadataPath, next);
      const fullPath = path.join(uploadsDir, target.fileName);
      try {
        await fs.unlink(fullPath);
      } catch {
        // ignore if file already removed
      }
      return target;
    });
  };

  return {
    uploadsDir,
    metadataPath,
    list,
    add,
    remove
  };
};
