import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  EMAIL_CAMPAIGN_AUDIENCE_MODE,
  EMAIL_CAMPAIGN_BODY_MODE,
  EMAIL_CAMPAIGN_SEND_MODE,
  EMAIL_CAMPAIGN_STATUS,
  EMAIL_EVENT_TYPES,
  EMAIL_SUBSCRIBER_SOURCE,
  EMAIL_SUBSCRIBER_STATUS
} from "../db/schema.js";
import { createAsyncQueue } from "../utils/asyncQueue.js";

type EmailSubscriberStatus = (typeof EMAIL_SUBSCRIBER_STATUS)[keyof typeof EMAIL_SUBSCRIBER_STATUS];
type EmailSubscriberSource = (typeof EMAIL_SUBSCRIBER_SOURCE)[keyof typeof EMAIL_SUBSCRIBER_SOURCE];
type EmailEventType = (typeof EMAIL_EVENT_TYPES)[keyof typeof EMAIL_EVENT_TYPES];
type EmailCampaignBodyMode = (typeof EMAIL_CAMPAIGN_BODY_MODE)[keyof typeof EMAIL_CAMPAIGN_BODY_MODE];
type EmailCampaignAudienceMode = (typeof EMAIL_CAMPAIGN_AUDIENCE_MODE)[keyof typeof EMAIL_CAMPAIGN_AUDIENCE_MODE];
type EmailCampaignSendMode = (typeof EMAIL_CAMPAIGN_SEND_MODE)[keyof typeof EMAIL_CAMPAIGN_SEND_MODE];
type EmailCampaignStatus = (typeof EMAIL_CAMPAIGN_STATUS)[keyof typeof EMAIL_CAMPAIGN_STATUS];

export type EmailSubscriber = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: EmailSubscriberStatus;
  source: EmailSubscriberSource;
  confirmToken: string;
  unsubscribeToken: string;
  createdAt: string;
  updatedAt: string;
};

export type EmailCampaignRecipient = Pick<EmailSubscriber, "id" | "name" | "email" | "unsubscribeToken">;

export type EmailEvent = {
  id: string;
  eventType: EmailEventType;
  subscriberId: string | null;
  campaignId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
};

export type EmailCampaign = {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  bodyMode: EmailCampaignBodyMode;
  bodyRich: string;
  bodyHtml: string;
  audienceMode: EmailCampaignAudienceMode;
  segments: string[];
  exclusions: string[];
  sendMode: EmailCampaignSendMode;
  scheduleAt: string | null;
  timezone: string;
  status: EmailCampaignStatus;
  estimatedRecipients: number;
  createdAt: string;
  updatedAt: string;
};

export type EmailTemplate = {
  id: "default";
  mode: EmailCampaignBodyMode;
  subject: string;
  previewText: string;
  bodyRich: string;
  bodyHtml: string;
  updatedAt: string;
};

export type EmailSenderProfile = {
  fromName: string;
  fromEmail: string;
  replyTo: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
  includeUnsubscribeFooter: boolean;
  checks: {
    subjectSafe: boolean;
    addressIncluded: boolean;
    unsubscribeLink: boolean;
  };
  updatedAt: string;
};

export type EmailAnalyticsSummary = {
  totals: {
    subscribers: number;
    pending: number;
    confirmed: number;
    unsubscribed: number;
    campaignsDraft: number;
    campaignsScheduled: number;
    campaignsSent: number;
  };
  recentCampaigns: Array<{
    id: string;
    name: string;
    status: EmailCampaignStatus;
    estimatedRecipients: number;
    updatedAt: string;
  }>;
  timeline: Array<{
    id: string;
    eventType: EmailEventType;
    campaignId: string | null;
    subscriberId: string | null;
    meta: Record<string, unknown>;
    createdAt: string;
  }>;
};

type EmailStoreRecord = {
  subscribers: EmailSubscriber[];
  campaigns: EmailCampaign[];
  template: EmailTemplate;
  senderProfile: EmailSenderProfile;
  events: EmailEvent[];
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

const buildToken = () => randomUUID().replace(/-/g, "");

const isSubscriberStatus = (value: unknown): value is EmailSubscriberStatus =>
  value === EMAIL_SUBSCRIBER_STATUS.pending || value === EMAIL_SUBSCRIBER_STATUS.confirmed || value === EMAIL_SUBSCRIBER_STATUS.unsubscribed;

const isSubscriberSource = (value: unknown): value is EmailSubscriberSource => value === EMAIL_SUBSCRIBER_SOURCE.quickGrabs;
const isCampaignBodyMode = (value: unknown): value is EmailCampaignBodyMode => value === EMAIL_CAMPAIGN_BODY_MODE.rich || value === EMAIL_CAMPAIGN_BODY_MODE.html;
const isCampaignAudienceMode = (value: unknown): value is EmailCampaignAudienceMode =>
  value === EMAIL_CAMPAIGN_AUDIENCE_MODE.all || value === EMAIL_CAMPAIGN_AUDIENCE_MODE.segments;
const isCampaignSendMode = (value: unknown): value is EmailCampaignSendMode => value === EMAIL_CAMPAIGN_SEND_MODE.now || value === EMAIL_CAMPAIGN_SEND_MODE.schedule;
const isCampaignStatus = (value: unknown): value is EmailCampaignStatus =>
  value === EMAIL_CAMPAIGN_STATUS.draft || value === EMAIL_CAMPAIGN_STATUS.scheduled || value === EMAIL_CAMPAIGN_STATUS.sent;

const normalizeSubscriber = (item: EmailSubscriber): EmailSubscriber => ({
  ...item,
  name: item.name.trim(),
  email: item.email.trim().toLowerCase(),
  phone: item.phone.trim(),
  status: isSubscriberStatus(item.status) ? item.status : EMAIL_SUBSCRIBER_STATUS.pending,
  source: isSubscriberSource(item.source) ? item.source : EMAIL_SUBSCRIBER_SOURCE.quickGrabs,
  confirmToken: typeof item.confirmToken === "string" && item.confirmToken.trim() ? item.confirmToken.trim() : buildToken(),
  unsubscribeToken: typeof item.unsubscribeToken === "string" && item.unsubscribeToken.trim() ? item.unsubscribeToken.trim() : buildToken()
});

const toPublicSubscriber = (item: EmailSubscriber) => ({
  id: item.id,
  name: item.name,
  email: item.email,
  phone: item.phone,
  status: item.status,
  source: item.source,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt
});

const normalizeCampaign = (item: EmailCampaign): EmailCampaign => ({
  id: item.id,
  name: (item.name ?? "").trim(),
  subject: (item.subject ?? "").trim(),
  previewText: (item.previewText ?? "").trim(),
  bodyMode: isCampaignBodyMode(item.bodyMode) ? item.bodyMode : EMAIL_CAMPAIGN_BODY_MODE.rich,
  bodyRich: item.bodyRich ?? "",
  bodyHtml: item.bodyHtml ?? "",
  audienceMode: isCampaignAudienceMode(item.audienceMode) ? item.audienceMode : EMAIL_CAMPAIGN_AUDIENCE_MODE.all,
  segments: Array.isArray(item.segments) ? item.segments.map((s) => String(s).trim()).filter(Boolean) : [],
  exclusions: Array.isArray(item.exclusions) ? item.exclusions.map((s) => String(s).trim()).filter(Boolean) : [],
  sendMode: isCampaignSendMode(item.sendMode) ? item.sendMode : EMAIL_CAMPAIGN_SEND_MODE.now,
  scheduleAt: typeof item.scheduleAt === "string" && item.scheduleAt ? item.scheduleAt : null,
  timezone: (item.timezone ?? "UTC").trim() || "UTC",
  status: isCampaignStatus(item.status) ? item.status : EMAIL_CAMPAIGN_STATUS.draft,
  estimatedRecipients: Number.isFinite(item.estimatedRecipients) ? Math.max(0, Math.floor(item.estimatedRecipients)) : 0,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt
});

const normalizeTemplate = (item: EmailTemplate): EmailTemplate => ({
  id: "default",
  mode: isCampaignBodyMode(item.mode) ? item.mode : EMAIL_CAMPAIGN_BODY_MODE.rich,
  subject: (item.subject ?? "Confirm your subscription, {{first_name}}").trim(),
  previewText: item.previewText ?? "",
  bodyRich:
    item.bodyRich ??
    "Hi {{first_name}},\n\nThanks for subscribing. Please confirm your subscription by clicking the link below:\n\n{{confirm_subscription_link}}\n\nIf this was not you, you can ignore this email.\n\nUnsubscribe: {{unsubscribe_link}}",
  bodyHtml:
    item.bodyHtml ??
    "<h2>Hi {{first_name}},</h2><p>Thanks for subscribing. Please confirm your subscription by clicking the link below:</p><p><a href='{{confirm_subscription_link}}'>Confirm subscription</a></p><p>If this was not you, you can ignore this email.</p><p>Unsubscribe: <a href='{{unsubscribe_link}}'>{{unsubscribe_link}}</a></p>",
  updatedAt: item.updatedAt || new Date().toISOString()
});

const normalizeSenderProfile = (item: Partial<EmailSenderProfile> | null | undefined): EmailSenderProfile => ({
  fromName: typeof item?.fromName === "string" && item.fromName.trim() ? item.fromName.trim() : "AutoHub Team",
  fromEmail: typeof item?.fromEmail === "string" && item.fromEmail.trim() ? item.fromEmail.trim() : "no-reply@example.com",
  replyTo: typeof item?.replyTo === "string" && item.replyTo.trim() ? item.replyTo.trim() : "support@example.com",
  smtpHost: typeof item?.smtpHost === "string" && item.smtpHost.trim() ? item.smtpHost.trim() : (process.env.SMTP_HOST ?? ""),
  smtpPort: Number.isFinite(Number(item?.smtpPort))
    ? Number(item?.smtpPort)
    : (Number.isFinite(Number(process.env.SMTP_PORT)) ? Number(process.env.SMTP_PORT) : 587),
  smtpUser: typeof item?.smtpUser === "string" && item.smtpUser.trim() ? item.smtpUser.trim() : (process.env.SMTP_USER ?? ""),
  smtpPass: typeof item?.smtpPass === "string" && item.smtpPass.trim() ? item.smtpPass : (process.env.SMTP_PASS ?? ""),
  smtpSecure: typeof item?.smtpSecure === "boolean" ? item.smtpSecure : Number(process.env.SMTP_PORT ?? 587) === 465,
  includeUnsubscribeFooter: item?.includeUnsubscribeFooter !== false,
  checks: {
    subjectSafe: item?.checks?.subjectSafe !== false,
    addressIncluded: Boolean(item?.checks?.addressIncluded),
    unsubscribeLink: item?.checks?.unsubscribeLink !== false
  },
  updatedAt: typeof item?.updatedAt === "string" && item.updatedAt ? item.updatedAt : new Date().toISOString()
});

export const createEmailStore = async (baseDir: string) => {
  const dataDir = path.join(baseDir, "email");
  const dataPath = path.join(dataDir, "state.json");
  await ensureDir(dataDir);

  const initial: EmailStoreRecord = {
    subscribers: [],
    campaigns: [],
    template: normalizeTemplate({
      id: "default",
      mode: EMAIL_CAMPAIGN_BODY_MODE.rich,
      subject: "Confirm your subscription, {{first_name}}",
      previewText: "Please verify your email to receive updates.",
      bodyRich:
        "Hi {{first_name}},\n\nThanks for subscribing. Please confirm your subscription by clicking the link below:\n\n{{confirm_subscription_link}}\n\nIf this was not you, you can ignore this email.\n\nUnsubscribe: {{unsubscribe_link}}",
      bodyHtml:
        "<h2>Hi {{first_name}},</h2><p>Thanks for subscribing. Please confirm your subscription by clicking the link below:</p><p><a href='{{confirm_subscription_link}}'>Confirm subscription</a></p><p>If this was not you, you can ignore this email.</p><p>Unsubscribe: <a href='{{unsubscribe_link}}'>{{unsubscribe_link}}</a></p>",
      updatedAt: new Date().toISOString()
    }),
    senderProfile: normalizeSenderProfile(null),
    events: [],
    updatedAt: new Date().toISOString()
  };

  const existing = await readJson<EmailStoreRecord>(dataPath, initial);
  await writeJson(dataPath, existing);
  const runExclusive = createAsyncQueue();

  const read = async () => {
    const record = await readJson<EmailStoreRecord>(dataPath, initial);
    return {
      ...record,
      subscribers: Array.isArray(record.subscribers) ? record.subscribers.map(normalizeSubscriber) : [],
      campaigns: Array.isArray(record.campaigns) ? record.campaigns.map(normalizeCampaign) : [],
      template: normalizeTemplate(record.template ?? initial.template),
      senderProfile: normalizeSenderProfile(record.senderProfile),
      events: Array.isArray(record.events) ? record.events : []
    };
  };

  const save = async (record: EmailStoreRecord) => {
    const next = { ...record, updatedAt: new Date().toISOString() };
    await writeJson(dataPath, next);
    return next;
  };

  const upsertPendingSubscriber = async (input: { name: string; email: string; phone?: string }) => {
    return runExclusive(async () => {
      const record = await read();
      const normalizedEmail = input.email.trim().toLowerCase();
      const normalizedName = input.name.trim();
      const normalizedPhone = (input.phone ?? "").trim();
      const nowIso = new Date().toISOString();

      const existingIndex = record.subscribers.findIndex((item) => item.email === normalizedEmail);
      let subscriber: EmailSubscriber;

      if (existingIndex >= 0) {
        const existing = record.subscribers[existingIndex];
        subscriber = {
          ...existing,
          name: normalizedName || existing.name,
          phone: normalizedPhone,
          status: EMAIL_SUBSCRIBER_STATUS.pending,
          source: EMAIL_SUBSCRIBER_SOURCE.quickGrabs,
          confirmToken: buildToken(),
          unsubscribeToken: existing.unsubscribeToken || buildToken(),
          updatedAt: nowIso
        };
        const subscribers = [...record.subscribers];
        subscribers[existingIndex] = subscriber;
        await save({ ...record, subscribers });
        return subscriber;
      }

      subscriber = {
        id: randomUUID(),
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        status: EMAIL_SUBSCRIBER_STATUS.pending,
        source: EMAIL_SUBSCRIBER_SOURCE.quickGrabs,
        confirmToken: buildToken(),
        unsubscribeToken: buildToken(),
        createdAt: nowIso,
        updatedAt: nowIso
      };
      await save({ ...record, subscribers: [subscriber, ...record.subscribers] });
      return subscriber;
    });
  };

  const addEvent = async (input: {
    eventType: EmailEventType;
    subscriberId?: string | null;
    campaignId?: string | null;
    meta?: Record<string, unknown>;
  }) => {
    return runExclusive(async () => {
      const record = await read();
      const event: EmailEvent = {
        id: randomUUID(),
        eventType: input.eventType,
        subscriberId: input.subscriberId ?? null,
        campaignId: input.campaignId ?? null,
        meta: input.meta ?? {},
        createdAt: new Date().toISOString()
      };
      await save({ ...record, events: [event, ...record.events] });
      return event;
    });
  };

  const confirmSubscriberByToken = async (token: string) => {
    return runExclusive(async () => {
      const normalizedToken = token.trim();
      if (!normalizedToken) return null;

      const record = await read();
      const index = record.subscribers.findIndex((item) => item.confirmToken === normalizedToken);
      if (index < 0) return null;

      const current = record.subscribers[index];
      const nowIso = new Date().toISOString();
      const next: EmailSubscriber = {
        ...current,
        status: EMAIL_SUBSCRIBER_STATUS.confirmed,
        updatedAt: nowIso
      };
      const subscribers = [...record.subscribers];
      subscribers[index] = next;
      await save({ ...record, subscribers });
      return next;
    });
  };

  const unsubscribeSubscriberByToken = async (token: string) => {
    return runExclusive(async () => {
      const normalizedToken = token.trim();
      if (!normalizedToken) return null;

      const record = await read();
      const index = record.subscribers.findIndex((item) => item.unsubscribeToken === normalizedToken);
      if (index < 0) return null;

      const current = record.subscribers[index];
      const nowIso = new Date().toISOString();
      const next: EmailSubscriber = {
        ...current,
        status: EMAIL_SUBSCRIBER_STATUS.unsubscribed,
        updatedAt: nowIso
      };
      const subscribers = [...record.subscribers];
      subscribers[index] = next;
      await save({ ...record, subscribers });
      return next;
    });
  };

  const getSubscriberById = async (id: string) => {
    const targetId = id.trim();
    if (!targetId) return null;
    const record = await read();
    return record.subscribers.find((item) => item.id === targetId) ?? null;
  };

  const getSubscriberByEmail = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return null;
    const record = await read();
    return record.subscribers.find((item) => item.email === normalizedEmail) ?? null;
  };

  const deleteSubscriberById = async (id: string) => {
    return runExclusive(async () => {
      const targetId = id.trim();
      if (!targetId) return null;
      const record = await read();
      const target = record.subscribers.find((item) => item.id === targetId);
      if (!target) return null;
      const subscribers = record.subscribers.filter((item) => item.id !== targetId);
      await save({ ...record, subscribers });
      return target;
    });
  };

  const listSubscribers = async (query?: {
    status?: EmailSubscriberStatus;
    q?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const record = await read();
    const page = Math.max(1, query?.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, query?.pageSize ?? 25));
    const q = (query?.q ?? "").trim().toLowerCase();
    const status = query?.status;

    const filtered = record.subscribers.filter((item) => {
      if (status && item.status !== status) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q)
      );
    });

    const sorted = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize).map(toPublicSubscriber);

    return {
      items,
      total: sorted.length,
      page,
      pageSize
    };
  };

  const listCampaignRecipients = async (): Promise<EmailCampaignRecipient[]> => {
    const record = await read();
    return record.subscribers
      .filter((item) => item.status === EMAIL_SUBSCRIBER_STATUS.confirmed)
      .map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        unsubscribeToken: item.unsubscribeToken
      }));
  };

  const saveCampaign = async (input: {
    id?: string;
    name: string;
    subject: string;
    previewText?: string;
    bodyMode: EmailCampaignBodyMode;
    bodyRich?: string;
    bodyHtml?: string;
    audienceMode: EmailCampaignAudienceMode;
    segments?: string[];
    exclusions?: string[];
    sendMode: EmailCampaignSendMode;
    scheduleAt?: string | null;
    timezone?: string;
    status: EmailCampaignStatus;
    estimatedRecipients?: number;
  }) => {
    return runExclusive(async () => {
      const record = await read();
      const nowIso = new Date().toISOString();
      const id = input.id?.trim() || randomUUID();
      const normalized: EmailCampaign = normalizeCampaign({
        id,
        name: input.name,
        subject: input.subject,
        previewText: input.previewText ?? "",
        bodyMode: input.bodyMode,
        bodyRich: input.bodyRich ?? "",
        bodyHtml: input.bodyHtml ?? "",
        audienceMode: input.audienceMode,
        segments: input.segments ?? [],
        exclusions: input.exclusions ?? [],
        sendMode: input.sendMode,
        scheduleAt: input.scheduleAt ?? null,
        timezone: input.timezone ?? "UTC",
        status: input.status,
        estimatedRecipients: input.estimatedRecipients ?? 0,
        createdAt: nowIso,
        updatedAt: nowIso
      });

      const existingIndex = record.campaigns.findIndex((item) => item.id === id);
      if (existingIndex >= 0) {
        const existing = record.campaigns[existingIndex];
        const updated: EmailCampaign = {
          ...normalized,
          id: existing.id,
          createdAt: existing.createdAt,
          updatedAt: nowIso
        };
        const campaigns = [...record.campaigns];
        campaigns[existingIndex] = updated;
        await save({ ...record, campaigns });
        return updated;
      }

      const created: EmailCampaign = {
        ...normalized,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      await save({ ...record, campaigns: [created, ...record.campaigns] });
      return created;
    });
  };

  const listCampaigns = async (query?: { page?: number; pageSize?: number }) => {
    const record = await read();
    const page = Math.max(1, query?.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, query?.pageSize ?? 25));
    const sorted = [...record.campaigns].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);
    return {
      items,
      total: sorted.length,
      page,
      pageSize
    };
  };

  const getConfirmationTemplate = async () => {
    const record = await read();
    return record.template;
  };

  const getSenderProfile = async () => {
    const record = await read();
    return record.senderProfile;
  };

  const saveSenderProfile = async (input: {
    fromName: string;
    fromEmail: string;
    replyTo: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass?: string;
    smtpSecure: boolean;
    includeUnsubscribeFooter: boolean;
    checks: {
      subjectSafe: boolean;
      addressIncluded: boolean;
      unsubscribeLink: boolean;
    };
  }) => {
    return runExclusive(async () => {
      const record = await read();
      const nextSmtpPass = typeof input.smtpPass === "string" ? input.smtpPass : record.senderProfile.smtpPass;
      const profile = normalizeSenderProfile({
        ...input,
        smtpPass: nextSmtpPass,
        updatedAt: new Date().toISOString()
      });
      await save({ ...record, senderProfile: profile });
      return profile;
    });
  };

  const saveConfirmationTemplate = async (input: {
    mode: EmailCampaignBodyMode;
    subject: string;
    previewText?: string;
    bodyRich?: string;
    bodyHtml?: string;
  }) => {
    return runExclusive(async () => {
      const record = await read();
      const updated = normalizeTemplate({
        id: "default",
        mode: input.mode,
        subject: input.subject,
        previewText: input.previewText ?? "",
        bodyRich: input.bodyRich ?? "",
        bodyHtml: input.bodyHtml ?? "",
        updatedAt: new Date().toISOString()
      });
      await save({ ...record, template: updated });
      return updated;
    });
  };

  const getAnalyticsSummary = async (): Promise<EmailAnalyticsSummary> => {
    const record = await read();

    const pending = record.subscribers.filter((item) => item.status === EMAIL_SUBSCRIBER_STATUS.pending).length;
    const confirmed = record.subscribers.filter((item) => item.status === EMAIL_SUBSCRIBER_STATUS.confirmed).length;
    const unsubscribed = record.subscribers.filter((item) => item.status === EMAIL_SUBSCRIBER_STATUS.unsubscribed).length;

    const campaignsDraft = record.campaigns.filter((item) => item.status === EMAIL_CAMPAIGN_STATUS.draft).length;
    const campaignsScheduled = record.campaigns.filter((item) => item.status === EMAIL_CAMPAIGN_STATUS.scheduled).length;
    const campaignsSent = record.campaigns.filter((item) => item.status === EMAIL_CAMPAIGN_STATUS.sent).length;

    const recentCampaigns = [...record.campaigns]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 50)
      .map((item) => ({
        id: item.id,
        name: item.name,
        status: item.status,
        estimatedRecipients: item.estimatedRecipients,
        updatedAt: item.updatedAt
      }));

    const timeline = [...record.events]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 100)
      .map((item) => ({
        id: item.id,
        eventType: item.eventType,
        campaignId: item.campaignId,
        subscriberId: item.subscriberId,
        meta: item.meta,
        createdAt: item.createdAt
      }));

    return {
      totals: {
        subscribers: record.subscribers.length,
        pending,
        confirmed,
        unsubscribed,
        campaignsDraft,
        campaignsScheduled,
        campaignsSent
      },
      recentCampaigns,
      timeline
    };
  };

  return {
    upsertPendingSubscriber,
    getSubscriberById,
    getSubscriberByEmail,
    deleteSubscriberById,
    confirmSubscriberByToken,
    unsubscribeSubscriberByToken,
    addEvent,
    listSubscribers,
    listCampaignRecipients,
    saveCampaign,
    listCampaigns,
    getConfirmationTemplate,
    saveConfirmationTemplate,
    getSenderProfile,
    saveSenderProfile,
    getAnalyticsSummary
  };
};
