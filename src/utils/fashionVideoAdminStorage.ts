import type { FashionVideoContent, FashionVideoContentMeta } from "../../shared/fashionTypes";
import { apiGet, apiJson } from "../api/client";

export type FashionVideoAdminComment = {
  id: string;
  name: string;
  text: string;
  createdAt: string;
  status?: "visible" | "hidden" | "flagged";
  clientId: string;
};

export type FashionVideoEngagementAdminSummary = {
  totals: {
    views: number;
    likes: number;
    dislikes: number;
    comments: number;
  };
  byVideo: Array<{
    videoId: string;
    views: number;
    likes: number;
    dislikes: number;
    commentCount: number;
    comments: FashionVideoAdminComment[];
  }>;
};

export type FashionVideoAnalyticsSummary = {
  totals: {
    totalVideos: number;
    draftVideos: number;
    publishedVideos: number;
    promotedVideos: number;
    mappedVideos: number;
    views: number;
    likes: number;
    dislikes: number;
    comments: number;
  };
  trends: {
    views: number[];
    engagement: number[];
    publishPulse: number[];
  };
  recommendations: string[];
  topVideos: Array<{
    videoId: string;
    title: string;
    productCollection: string;
    views: number;
    score: number;
  }>;
};

export const getPublishedFashionVideoContentAsync = async (): Promise<FashionVideoContent> => {
  const response = await apiGet<{ content: FashionVideoContent }>("/api/fashion-videos/published");
  return response.content ?? { videos: [] };
};

export const getDraftFashionVideoContentAsync = async (): Promise<FashionVideoContent | null> => {
  try {
    const response = await apiGet<{ content: FashionVideoContent | null }>("/api/fashion-videos/draft");
    return response.content ?? null;
  } catch {
    return null;
  }
};

export const getFashionVideoMetaAsync = async (): Promise<FashionVideoContentMeta | null> => {
  try {
    return await apiGet<FashionVideoContentMeta>("/api/fashion-videos/meta");
  } catch {
    return null;
  }
};

export const getFashionVideoAdminInitialContentAsync = async (): Promise<FashionVideoContent> => {
  const draft = await getDraftFashionVideoContentAsync();
  if (draft) return draft;
  return getPublishedFashionVideoContentAsync();
};

export const getFashionVideoEngagementAdminSummaryAsync = async (): Promise<FashionVideoEngagementAdminSummary> => {
  return apiGet<FashionVideoEngagementAdminSummary>("/api/fashion-videos/engagement/admin");
};

export const moderateFashionVideoCommentAsync = async (
  videoId: string,
  commentId: string,
  status: "visible" | "hidden" | "flagged"
) => {
  const response = await apiJson<{ comment: FashionVideoAdminComment }>("/api/fashion-videos/comments/moderate", "POST", {
    videoId,
    commentId,
    status
  });
  return response.comment;
};

export const getFashionVideoAnalyticsSummaryAsync = async (): Promise<FashionVideoAnalyticsSummary> => {
  return apiGet<FashionVideoAnalyticsSummary>("/api/fashion-videos/analytics/summary");
};

export const saveFashionVideoDraftContent = async (content: FashionVideoContent) => {
  const response = await apiJson<{ content: FashionVideoContent }>("/api/fashion-videos/draft", "PUT", { content });
  return response.content;
};

export const publishFashionVideoContent = async (content?: FashionVideoContent) => {
  const response = await apiJson<{ content: FashionVideoContent }>("/api/fashion-videos/publish", "POST", content ? { content } : undefined);
  return response.content;
};

export const toggleFashionVideoPromoteAsync = async (videoId: string) => {
  const response = await apiJson<{ content: FashionVideoContent }>("/api/fashion-videos/promote", "POST", { videoId });
  return response.content;
};

export const deleteFashionVideoAsync = async (videoId: string) => {
  const response = await apiJson<{ content: FashionVideoContent }>(`/api/fashion-videos/${videoId}`, "DELETE");
  return response.content;
};

export const updateFashionVideoPlacementAsync = async (
  videoId: string,
  placement: "landing" | "feed" | "series" | "promoted"
) => {
  const response = await apiJson<{ content: FashionVideoContent }>("/api/fashion-videos/placement", "POST", {
    videoId,
    placement
  });
  return response.content;
};

export const reorderFashionVideoAsync = async (videoId: string, direction: "up" | "down") => {
  const response = await apiJson<{ content: FashionVideoContent }>("/api/fashion-videos/reorder", "POST", {
    videoId,
    direction
  });
  return response.content;
};

export const resetFashionVideoContentToDefaults = async () => {
  const response = await apiJson<{ published: FashionVideoContent }>("/api/fashion-videos/reset", "POST");
  return response.published ?? { videos: [] };
};
