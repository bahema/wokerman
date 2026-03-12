import { apiJson } from "../api/client";

export type FashionVideoReaction = "like" | "dislike" | null;

export type FashionVideoCommentView = {
  id: string;
  name: string;
  text: string;
  createdAt?: string;
  parentId?: string;
  likes?: number;
  dislikes?: number;
  reaction?: "like" | "dislike" | null;
  likedByViewer?: boolean;
  replies?: FashionVideoCommentView[];
};

type VideoSeed = {
  id: string;
  seedViews?: number;
  seedLikes?: number;
  seedDislikes?: number;
  seedComments?: FashionVideoCommentView[];
};

const CLIENT_KEY_STORAGE = "autohub:fashion:videos:engagement-client-key";

const resolveClientId = () => {
  if (typeof window === "undefined") return "client-server";
  const existing = window.localStorage.getItem(CLIENT_KEY_STORAGE)?.trim();
  if (existing) return existing;
  const generatedRaw =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const generated = `client-${generatedRaw.replace(/[^a-z0-9_-]+/gi, "").toLowerCase().slice(0, 40)}`;
  window.localStorage.setItem(CLIENT_KEY_STORAGE, generated);
  return generated;
};

export const getFashionVideoEngagementSummary = async (videos: VideoSeed[]) =>
  apiJson<{
    views: Record<string, number>;
    likes: Record<string, number>;
    dislikes: Record<string, number>;
    reactions: Record<string, FashionVideoReaction>;
    comments: Record<string, FashionVideoCommentView[]>;
  }>("/api/fashion-videos/engagement/summary", "POST", {
    clientId: resolveClientId(),
    videos
  });

export const recordFashionVideoView = async (videoId: string, seedViews = 0) =>
  apiJson<{ views: number }>("/api/fashion-videos/engagement/view", "POST", {
    clientId: resolveClientId(),
    videoId,
    seedViews
  });

export const toggleFashionVideoReaction = async (
  videoId: string,
  reaction: "like" | "dislike",
  seedLikes = 0,
  seedDislikes = 0
) =>
  apiJson<{ likes: number; dislikes: number; reaction: FashionVideoReaction }>("/api/fashion-videos/engagement/react", "POST", {
    clientId: resolveClientId(),
    videoId,
    reaction,
    seedLikes,
    seedDislikes
  });

export const submitFashionVideoComment = async (videoId: string, name: string, text: string, parentId?: string) =>
  apiJson<{ comment: FashionVideoCommentView }>("/api/fashion-videos/comments", "POST", {
    clientId: resolveClientId(),
    videoId,
    name,
    text,
    parentId
  });

export const toggleFashionVideoCommentReaction = async (videoId: string, commentId: string, reaction: "like" | "dislike") =>
  apiJson<{ comment: FashionVideoCommentView }>("/api/fashion-videos/comments/react", "POST", {
    clientId: resolveClientId(),
    videoId,
    commentId,
    reaction
  });
