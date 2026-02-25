import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createAsyncQueue } from "../utils/asyncQueue.js";

export type AnalyticsEvent = {
  id: string;
  eventName: string;
  payload: Record<string, unknown>;
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

export const createAnalyticsStore = async (baseDir: string) => {
  const dataDir = path.join(baseDir, "analytics");
  const eventsPath = path.join(dataDir, "events.json");
  await ensureDir(dataDir);
  const existing = await readJson<AnalyticsEvent[]>(eventsPath, []);
  await writeJson(eventsPath, existing);
  const runExclusive = createAsyncQueue();

  const list = async () => readJson<AnalyticsEvent[]>(eventsPath, []);

  const add = async (eventName: string, payload: Record<string, unknown>) => {
    return runExclusive(async () => {
      const event: AnalyticsEvent = {
        id: randomUUID(),
        eventName,
        payload,
        createdAt: new Date().toISOString()
      };
      const items = await list();
      items.push(event);
      await writeJson(eventsPath, items);
      return event;
    });
  };

  const summary = async () => {
    const events = await list();
    const totalEvents = events.length;

    const byEvent = events.reduce<Record<string, number>>((acc, event) => {
      acc[event.eventName] = (acc[event.eventName] ?? 0) + 1;
      return acc;
    }, {});

    const byDay = events.reduce<Record<string, number>>((acc, event) => {
      const day = event.createdAt.slice(0, 10);
      acc[day] = (acc[day] ?? 0) + 1;
      return acc;
    }, {});

    const productClicks = events
      .filter((event) => event.eventName === "product_link_click")
      .reduce<Record<string, number>>((acc, event) => {
        const key = String(event.payload.productId ?? "unknown");
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});

    return {
      totalEvents,
      byEvent,
      byDay,
      productClicks
    };
  };

  return {
    list,
    add,
    summary
  };
};
