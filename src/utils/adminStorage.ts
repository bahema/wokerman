import type { SiteContent } from "../data/siteData";
import { apiGet, apiJson } from "../api/client";

export const PUBLISHED_KEY = "site:published";
export const DRAFT_KEY = "site:draft";

const cloneDefaultAsync = async (): Promise<SiteContent> => {
  const { defaultSiteContent } = await import("../data/siteData");
  return JSON.parse(JSON.stringify(defaultSiteContent)) as SiteContent;
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
    return response.content ?? (await cloneDefaultAsync());
  } catch {
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
  return response.content;
};

export const resetContentToDefaults = async () => {
  const response = await apiJson<{ published: SiteContent }>("/api/site/reset", "POST");
  return response.published ?? (await cloneDefaultAsync());
};
