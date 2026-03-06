import type { SiteContent } from "../data/siteData";
import { apiGet, apiJson } from "../api/client";

export const PUBLISHED_KEY = "site:published";
export const DRAFT_KEY = "site:draft";
export const PUBLISHED_CACHE_KEY = "site:published:cache";
export const PUBLISHED_UPDATED_EVENT = "site:published:updated";

const cloneDefaultAsync = async (): Promise<SiteContent> => {
  const { defaultSiteContent } = await import("../data/siteData");
  return JSON.parse(JSON.stringify(defaultSiteContent)) as SiteContent;
};

const readPublishedCache = (): SiteContent | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PUBLISHED_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SiteContent;
  } catch {
    return null;
  }
};

const writePublishedCache = (content: SiteContent) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PUBLISHED_CACHE_KEY, JSON.stringify(content));
    window.dispatchEvent(new CustomEvent<SiteContent>(PUBLISHED_UPDATED_EVENT, { detail: content }));
  } catch {
    // Ignore storage quota/privacy errors.
  }
};

export type SiteMeta = {
  updatedAt: string;
  hasDraft: boolean;
};

export const getPublishedContent = (): SiteContent => {
  throw new Error("getPublishedContent is async now. Use getPublishedContentAsync.");
};

export const getPublishedContentAsync = async (): Promise<SiteContent> => {
  try {
    const response = await apiGet<{ content: SiteContent }>("/api/site/published");
    const content = response.content ?? (await cloneDefaultAsync());
    writePublishedCache(content);
    return content;
  } catch {
    const cached = readPublishedCache();
    if (cached) return cached;
    return cloneDefaultAsync();
  }
};

export const getDraftContent = (): SiteContent | null => {
  throw new Error("getDraftContent is async now. Use getDraftContentAsync.");
};

export const getDraftContentAsync = async (): Promise<SiteContent | null> => {
  try {
    const response = await apiGet<{ content: SiteContent | null }>("/api/site/draft");
    return response.content ?? null;
  } catch {
    return null;
  }
};

export const getSiteMetaAsync = async (): Promise<SiteMeta | null> => {
  try {
    return await apiGet<SiteMeta>("/api/site/meta");
  } catch {
    return null;
  }
};

export const getAdminInitialContent = (): SiteContent => {
  throw new Error("getAdminInitialContent is async now. Use getAdminInitialContentAsync.");
};

export const getAdminInitialContentAsync = async (): Promise<SiteContent> => {
  const draft = await getDraftContentAsync();
  if (draft) return draft;
  return getPublishedContentAsync();
};

export const saveDraftContent = async (content: SiteContent) => {
  const response = await apiJson<{ content: SiteContent }>("/api/site/draft", "PUT", { content });
  return response.content;
};

export const publishContent = async (content?: SiteContent) => {
  const response = await apiJson<{ content: SiteContent }>("/api/site/publish", "POST", content ? { content } : undefined);
  if (response.content) writePublishedCache(response.content);
  return response.content;
};

export const resetContentToDefaults = async () => {
  const response = await apiJson<{ published: SiteContent }>("/api/site/reset", "POST");
  return response.published ?? (await cloneDefaultAsync());
};
