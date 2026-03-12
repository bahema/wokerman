import { apiGet } from "../api/client";
import type { FashionVideoContent, FashionVideoContentMeta, FashionVideoRecord } from "../../shared/fashionTypes";

export type FashionVideoPageRecord = {
  id: string;
  title: string;
  note: string;
  length: string;
  viewCount: number;
  thumbnailUrl: string;
  videoAssetUrl: string;
  checkoutLabel: string;
  sourceLabel: string;
  whatsappNumber: string;
  collection: string;
  category: string;
  tone: string;
  viewers: string;
  likes: number;
  dislikes: number;
  comments: {
    id: string;
    name: string;
    text: string;
    createdAt?: string;
  parentId?: string;
  likes?: number;
  dislikes?: number;
  reaction?: "like" | "dislike" | null;
  likedByViewer?: boolean;
  replies?: FashionVideoPageRecord["comments"];
}[];
  mappedProductId: string;
  isPromoted: boolean;
  placement: "landing" | "feed" | "series" | "promoted";
};

const mapComment = (comment: FashionVideoRecord["comments"][number]): FashionVideoPageRecord["comments"][number] => ({
  id: comment.id,
  name: comment.name,
  text: comment.text,
  createdAt: comment.createdAt,
  parentId: comment.parentId,
  likes: comment.likes ?? 0,
  dislikes: comment.dislikes ?? 0,
  reaction: comment.reaction ?? null,
  likedByViewer: comment.likedByViewer ?? false,
  replies: (comment.replies ?? []).filter((reply) => reply.status !== "hidden").map(mapComment)
});

const formatViewCount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
};

export const toFashionVideoPageRecord = (video: FashionVideoRecord): FashionVideoPageRecord => ({
  id: video.id,
  title: video.title,
  note: video.description,
  length: video.duration,
  viewCount: video.views,
  viewers: formatViewCount(video.views),
  likes: video.likes,
  dislikes: video.dislikes,
  comments: video.comments.filter((comment) => comment.status !== "hidden").map(mapComment),
  mappedProductId: video.mappedProductId,
  isPromoted: video.isPromoted,
  placement: video.placement,
  thumbnailUrl: video.thumbnail,
  videoAssetUrl: video.videoAsset,
  checkoutLabel: video.checkoutLabel,
  sourceLabel: video.sourceLabel,
  whatsappNumber: video.whatsappNumber,
  collection: video.collection,
  category: video.category,
  tone: video.tone
});

export const fetchPublishedFashionVideosAsync = async () => {
  const response = await apiGet<{ content: FashionVideoContent }>("/api/fashion-videos/published");
  return (response.content?.videos ?? [])
    .filter((video) => video.status === "published")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toFashionVideoPageRecord);
};

export const getFashionVideoMetaAsync = async () => {
  return apiGet<FashionVideoContentMeta>("/api/fashion-videos/meta");
};
