import type { FashionVideoComment, FashionVideoContent, FashionVideoPlacement, FashionVideoRecord, FashionVideoStatus } from "../../../shared/fashionTypes";

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const asNonEmptyString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : "");

const asStringArray = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean) : null;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const VIDEO_STATUSES = new Set<FashionVideoStatus>(["draft", "published"]);
const VIDEO_PLACEMENTS = new Set<FashionVideoPlacement>(["landing", "feed", "series", "promoted"]);
const COMMENT_STATUSES = new Set<NonNullable<FashionVideoComment["status"]>>(["visible", "hidden", "flagged"]);

const validateComment = (comment: unknown, videoId: string, index: number): string => {
  if (!isObject(comment)) return `videos "${videoId}" comment #${index + 1}: invalid comment object.`;
  if (!asNonEmptyString(comment.id)) return `videos "${videoId}" comment #${index + 1}: id is required.`;
  if (!asNonEmptyString(comment.name)) return `videos "${videoId}" comment #${index + 1}: name is required.`;
  if (!asNonEmptyString(comment.text)) return `videos "${videoId}" comment #${index + 1}: text is required.`;
  if (!asNonEmptyString(comment.createdAt)) return `videos "${videoId}" comment #${index + 1}: createdAt is required.`;
  if (comment.parentId !== undefined && comment.parentId !== null && !asNonEmptyString(comment.parentId)) {
    return `videos "${videoId}" comment #${index + 1}: parentId must be a non-empty string when provided.`;
  }
  if (comment.likes !== undefined && comment.likes !== null && (typeof comment.likes !== "number" || !Number.isFinite(comment.likes) || comment.likes < 0)) {
    return `videos "${videoId}" comment #${index + 1}: likes must be a number >= 0 when provided.`;
  }
  if (comment.dislikes !== undefined && comment.dislikes !== null && (typeof comment.dislikes !== "number" || !Number.isFinite(comment.dislikes) || comment.dislikes < 0)) {
    return `videos "${videoId}" comment #${index + 1}: dislikes must be a number >= 0 when provided.`;
  }
  if (comment.reaction !== undefined && comment.reaction !== null && comment.reaction !== "like" && comment.reaction !== "dislike") {
    return `videos "${videoId}" comment #${index + 1}: reaction is invalid.`;
  }
  if (comment.likedByViewer !== undefined && comment.likedByViewer !== null && typeof comment.likedByViewer !== "boolean") {
    return `videos "${videoId}" comment #${index + 1}: likedByViewer must be boolean when provided.`;
  }
  if (comment.status !== undefined && comment.status !== null && !COMMENT_STATUSES.has(String(comment.status) as NonNullable<FashionVideoComment["status"]>)) {
    return `videos "${videoId}" comment #${index + 1}: status is invalid.`;
  }
  if (comment.replies !== undefined && comment.replies !== null) {
    if (!Array.isArray(comment.replies)) {
      return `videos "${videoId}" comment #${index + 1}: replies must be an array when provided.`;
    }
    for (let replyIndex = 0; replyIndex < comment.replies.length; replyIndex += 1) {
      const error: string = validateComment(comment.replies[replyIndex], videoId, replyIndex);
      if (error) return error;
    }
  }
  return "";
};

const validateVideo = (video: unknown, index: number) => {
  if (!isObject(video)) return `videos #${index + 1}: invalid video object.`;
  const videoId = asNonEmptyString(video.id) || `#${index + 1}`;
  for (const key of ["id", "title", "description", "duration", "series", "mappedProductId", "collection", "category", "tone", "checkoutLabel", "sourceLabel"] as const) {
    if (!asNonEmptyString(video[key])) return `videos "${videoId}": ${key} is required.`;
  }
  for (const key of ["thumbnail", "videoAsset", "whatsappNumber"] as const) {
    if (video[key] !== undefined && video[key] !== null && typeof video[key] !== "string") {
      return `videos "${videoId}": ${key} must be a string when provided.`;
    }
  }
  const thumbnail = asNonEmptyString(video.thumbnail);
  const videoAsset = asNonEmptyString(video.videoAsset);
  for (const key of ["views", "likes", "dislikes", "sortOrder"] as const) {
    if (typeof video[key] !== "number" || !Number.isFinite(video[key]) || video[key] < 0) {
      return `videos "${videoId}": ${key} must be a number >= 0.`;
    }
  }
  if (!VIDEO_STATUSES.has(String(video.status) as FashionVideoStatus)) {
    return `videos "${videoId}": status is invalid.`;
  }
  if (video.status === "published" && !videoAsset) {
    return `videos "${videoId}": published videos require a videoAsset.`;
  }
  if (video.status === "published" && !thumbnail) {
    return `videos "${videoId}": published videos require a thumbnail.`;
  }
  if (!VIDEO_PLACEMENTS.has(String(video.placement) as FashionVideoPlacement)) {
    return `videos "${videoId}": placement is invalid.`;
  }
  if (typeof video.isPromoted !== "boolean") {
    return `videos "${videoId}": isPromoted must be boolean.`;
  }
  const styleTags = asStringArray(video.styleTags);
  if (!styleTags || styleTags.length === 0) {
    return `videos "${videoId}": styleTags must contain at least one item.`;
  }
  if (!Array.isArray(video.comments)) {
    return `videos "${videoId}": comments must be an array.`;
  }
  for (let i = 0; i < video.comments.length; i += 1) {
    const error = validateComment(video.comments[i], videoId, i);
    if (error) return error;
  }
  return "";
};

export const validateFashionVideoContent = (
  value: unknown
): { ok: true; content: FashionVideoContent } | { ok: false; error: string } => {
  if (!isObject(value)) return { ok: false, error: "Invalid fashion video content payload." };
  if (!Array.isArray(value.videos)) return { ok: false, error: "videos must be an array." };

  const ids = new Set<string>();
  for (let i = 0; i < value.videos.length; i += 1) {
    const error = validateVideo(value.videos[i], i);
    if (error) return { ok: false, error };
    const video = value.videos[i] as FashionVideoRecord;
    if (ids.has(video.id)) return { ok: false, error: `videos contains duplicate id "${video.id}".` };
    ids.add(video.id);
  }

  return { ok: true, content: clone(value as FashionVideoContent) };
};
