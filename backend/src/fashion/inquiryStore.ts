import { promises as fs } from "node:fs";
import path from "node:path";
import type { FashionInquiryRecord, FashionInquiryStatus } from "./inquiryTypes.js";
import { createAsyncQueue } from "../utils/asyncQueue.js";

type FashionInquiryStoreData = {
  records: FashionInquiryRecord[];
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

const clampRecords = (records: FashionInquiryRecord[], maxRecords: number) => {
  if (records.length <= maxRecords) return records;
  return records.slice(records.length - maxRecords);
};

export const createFashionInquiryStore = async (baseDir: string) => {
  const dataDir = path.join(baseDir, "fashion");
  const dataPath = path.join(dataDir, "inquiries.json");
  await ensureDir(dataDir);

  const initial: FashionInquiryStoreData = { records: [] };
  const existing = await readJson<FashionInquiryStoreData>(dataPath, initial);
  const hydrated: FashionInquiryStoreData = {
    records: Array.isArray(existing.records) ? existing.records : []
  };
  await writeJson(dataPath, hydrated);

  const runExclusive = createAsyncQueue();
  const maxRecords = 2000;

  const read = async () => {
    const record = await readJson<FashionInquiryStoreData>(dataPath, hydrated);
    return {
      records: Array.isArray(record.records) ? record.records : []
    };
  };

  const save = async (value: FashionInquiryStoreData) => {
    const next: FashionInquiryStoreData = {
      records: clampRecords(value.records, maxRecords)
    };
    await writeJson(dataPath, next);
    return next;
  };

  const add = async (entry: FashionInquiryRecord) =>
    runExclusive(async () => {
      const current = await read();
      const next = await save({ records: [...current.records, clone(entry)] });
      return next.records[next.records.length - 1];
    });

  const updateStatus = async (
    id: string,
    patch: { status: FashionInquiryStatus; fallbackRequired: boolean; providerResponse?: FashionInquiryRecord["providerResponse"] }
  ) =>
    runExclusive(async () => {
      const current = await read();
      const index = current.records.findIndex((item) => item.id === id);
      if (index < 0) return null;
      const nextRecord: FashionInquiryRecord = {
        ...current.records[index],
        status: patch.status,
        fallbackRequired: patch.fallbackRequired,
        providerResponse: patch.providerResponse
      };
      const records = [...current.records];
      records[index] = nextRecord;
      await save({ records });
      return nextRecord;
    });

  const listLatest = async (limit = 20) => {
    const current = await read();
    const normalizedLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 200) : 20;
    return current.records.slice(-normalizedLimit).reverse();
  };

  const updateById = async (id: string, patch: Partial<Omit<FashionInquiryRecord, "id" | "createdAt" | "sendMode">>) =>
    runExclusive(async () => {
      const current = await read();
      const index = current.records.findIndex((item) => item.id === id);
      if (index < 0) return null;
      const nextRecord: FashionInquiryRecord = {
        ...current.records[index],
        ...clone(patch)
      };
      const records = [...current.records];
      records[index] = nextRecord;
      await save({ records });
      return nextRecord;
    });

  const removeById = async (id: string) =>
    runExclusive(async () => {
      const current = await read();
      const index = current.records.findIndex((item) => item.id === id);
      if (index < 0) return false;
      const records = current.records.filter((item) => item.id !== id);
      await save({ records });
      return true;
    });

  return {
    add,
    updateStatus,
    updateById,
    removeById,
    listLatest
  };
};
