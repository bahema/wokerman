import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createAsyncQueue } from "../utils/asyncQueue.js";

export type TrafficAiIntent = "informational" | "commercial" | "transactional";

export type TrafficAiOpportunity = {
  id: string;
  topic: string;
  keyword: string;
  targetPath: string;
  intent: TrafficAiIntent;
  demandScore: number;
  competitionScore: number;
  relevanceScore: number;
  compositeScore: number;
  channels: string[];
  complianceNotes: string[];
};

export type TrafficAiComplianceItem = {
  id: string;
  severity: "info" | "warning";
  message: string;
};

export type TrafficAiPlan = {
  id: string;
  createdAt: string;
  source: "rule-based-local";
  summary: {
    opportunities: number;
    avgCompositeScore: number;
    highIntentCount: number;
  };
  opportunities: TrafficAiOpportunity[];
  complianceChecklist: TrafficAiComplianceItem[];
  generatedFrom: {
    productsTotal: number;
    industriesTotal: number;
    subscribersTotal: number;
    emailConfirmedTotal: number;
  };
};

type TrafficAiRecord = {
  plans: TrafficAiPlan[];
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

const normalizePlan = (plan: TrafficAiPlan): TrafficAiPlan => ({
  ...plan,
  opportunities: Array.isArray(plan.opportunities) ? plan.opportunities : [],
  complianceChecklist: Array.isArray(plan.complianceChecklist) ? plan.complianceChecklist : []
});

const nowIso = () => new Date().toISOString();

export const createTrafficAiStore = async (baseDir: string) => {
  const dataDir = path.join(baseDir, "traffic-ai");
  const dataPath = path.join(dataDir, "plans.json");
  await ensureDir(dataDir);

  const initial: TrafficAiRecord = { plans: [], updatedAt: nowIso() };
  const existing = await readJson<TrafficAiRecord>(dataPath, initial);
  await writeJson(dataPath, existing);
  const runExclusive = createAsyncQueue();

  const read = async () => {
    const record = await readJson<TrafficAiRecord>(dataPath, initial);
    return {
      plans: Array.isArray(record.plans) ? record.plans.map(normalizePlan) : [],
      updatedAt: typeof record.updatedAt === "string" && record.updatedAt ? record.updatedAt : nowIso()
    };
  };

  const save = async (record: TrafficAiRecord) => {
    const next: TrafficAiRecord = {
      plans: record.plans.slice(0, 30),
      updatedAt: nowIso()
    };
    await writeJson(dataPath, next);
    return next;
  };

  const listPlans = async () => {
    const record = await read();
    return [...record.plans].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  };

  const getLatestPlan = async () => {
    const plans = await listPlans();
    return plans[0] ?? null;
  };

  const addPlan = async (plan: Omit<TrafficAiPlan, "id" | "createdAt">) => {
    return runExclusive(async () => {
      const record = await read();
      const nextPlan: TrafficAiPlan = {
        ...plan,
        id: randomUUID(),
        createdAt: nowIso()
      };
      await save({
        ...record,
        plans: [nextPlan, ...record.plans]
      });
      return nextPlan;
    });
  };

  return {
    listPlans,
    getLatestPlan,
    addPlan
  };
};

