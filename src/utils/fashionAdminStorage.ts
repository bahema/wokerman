import type { FashionContentMeta } from "../../shared/fashionTypes";
import { apiGet, apiJson } from "../api/client";
import { cachePublishedFashionContent, createDefaultFashionBossDraft, type FashionBossDraft } from "./fashionDraft";

export type FashionMeta = FashionContentMeta;

export const getPublishedFashionContentAsync = async (): Promise<FashionBossDraft> => {
  try {
    const response = await apiGet<{ content: FashionBossDraft }>("/api/fashion/published");
    const content = response.content ?? createDefaultFashionBossDraft();
    cachePublishedFashionContent(content);
    return content;
  } catch {
    return createDefaultFashionBossDraft();
  }
};

export const getDraftFashionContentAsync = async (): Promise<FashionBossDraft | null> => {
  try {
    const response = await apiGet<{ content: FashionBossDraft | null }>("/api/fashion/draft");
    return response.content ?? null;
  } catch {
    return null;
  }
};

export const getFashionMetaAsync = async (): Promise<FashionMeta | null> => {
  try {
    return await apiGet<FashionMeta>("/api/fashion/meta");
  } catch {
    return null;
  }
};

export const getFashionAdminInitialContentAsync = async (): Promise<FashionBossDraft> => {
  const draft = await getDraftFashionContentAsync();
  if (draft) return draft;
  return getPublishedFashionContentAsync();
};

export const saveFashionDraftContent = async (content: FashionBossDraft) => {
  const response = await apiJson<{ content: FashionBossDraft }>("/api/fashion/draft", "PUT", { content });
  return response.content;
};

export const publishFashionContent = async (content?: FashionBossDraft) => {
  const response = await apiJson<{ content: FashionBossDraft }>("/api/fashion/publish", "POST", content ? { content } : undefined);
  if (response.content) {
    cachePublishedFashionContent(response.content);
  }
  return response.content;
};

export const resetFashionContentToDefaults = async () => {
  const response = await apiJson<{ published: FashionBossDraft }>("/api/fashion/reset", "POST");
  const published = response.published ?? createDefaultFashionBossDraft();
  cachePublishedFashionContent(published);
  return published;
};
