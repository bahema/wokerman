import { promises as fs } from "node:fs";
import path from "node:path";
import { createAsyncQueue } from "../utils/asyncQueue.js";

export type FashionWhatsAppApiSettings = {
  enabled: boolean;
  apiBaseUrl: string;
  apiVersion: string;
  accessToken: string;
  phoneNumberId: string;
  recipientPhoneNumber: string;
};

const DEFAULT_SETTINGS: FashionWhatsAppApiSettings = {
  enabled: false,
  apiBaseUrl: "https://graph.facebook.com",
  apiVersion: "v23.0",
  accessToken: "",
  phoneNumberId: "",
  recipientPhoneNumber: ""
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

const normalizeUrl = (value: string) => value.trim().replace(/\/+$/, "");

const normalizeDigits = (value: string) => value.replace(/\D/g, "");

const validateSettings = (value: unknown): { ok: true; settings: FashionWhatsAppApiSettings } | { ok: false; error: string } => {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "WhatsApp settings payload is invalid." };
  }
  const payload = value as Record<string, unknown>;
  const settings: FashionWhatsAppApiSettings = {
    enabled: payload.enabled === true,
    apiBaseUrl: normalizeUrl(typeof payload.apiBaseUrl === "string" ? payload.apiBaseUrl : DEFAULT_SETTINGS.apiBaseUrl),
    apiVersion: typeof payload.apiVersion === "string" && payload.apiVersion.trim() ? payload.apiVersion.trim() : DEFAULT_SETTINGS.apiVersion,
    accessToken: typeof payload.accessToken === "string" ? payload.accessToken.trim() : "",
    phoneNumberId: typeof payload.phoneNumberId === "string" ? payload.phoneNumberId.trim() : "",
    recipientPhoneNumber: normalizeDigits(typeof payload.recipientPhoneNumber === "string" ? payload.recipientPhoneNumber : "")
  };

  if (!settings.apiBaseUrl) return { ok: false, error: "apiBaseUrl is required." };
  try {
    const parsed = new URL(settings.apiBaseUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ok: false, error: "apiBaseUrl must use http or https." };
    }
  } catch {
    return { ok: false, error: "apiBaseUrl must be a valid URL." };
  }
  if (!settings.apiVersion) return { ok: false, error: "apiVersion is required." };
  if (settings.enabled) {
    if (!settings.accessToken) return { ok: false, error: "accessToken is required when WhatsApp API is enabled." };
    if (!settings.phoneNumberId) return { ok: false, error: "phoneNumberId is required when WhatsApp API is enabled." };
    if (!settings.recipientPhoneNumber) {
      return { ok: false, error: "recipientPhoneNumber is required when WhatsApp API is enabled." };
    }
  }

  return { ok: true, settings };
};

export const createFashionWhatsAppStore = async (baseDir: string) => {
  const dataDir = path.join(baseDir, "fashion");
  const dataPath = path.join(dataDir, "whatsapp-settings.json");
  await ensureDir(dataDir);

  const initial = clone(DEFAULT_SETTINGS);
  const existing = await readJson<FashionWhatsAppApiSettings>(dataPath, initial);
  const validated = validateSettings(existing);
  const hydrated = validated.ok ? validated.settings : initial;
  await writeJson(dataPath, hydrated);
  const runExclusive = createAsyncQueue();

  const getSettings = async () => {
    const current = await readJson<FashionWhatsAppApiSettings>(dataPath, hydrated);
    const result = validateSettings(current);
    return result.ok ? result.settings : clone(DEFAULT_SETTINGS);
  };

  const saveSettings = async (input: FashionWhatsAppApiSettings) =>
    runExclusive(async () => {
      const result = validateSettings(input);
      if (!result.ok) throw new Error(result.error);
      await writeJson(dataPath, result.settings);
      return result.settings;
    });

  return {
    getSettings,
    saveSettings
  };
};
