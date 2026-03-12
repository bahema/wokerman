import type { FashionVideoContent, FashionVideoRecord } from "../../shared/fashionTypes";

export type FashionVideoValidationIssue = {
  videoId: string;
  title: string;
  field: string;
  message: string;
};

const isNonEmpty = (value: string | undefined | null) => Boolean(value && value.trim());

export const validateFashionVideoRecordForAdmin = (
  video: FashionVideoRecord,
  fallbackWhatsAppNumber: string
): FashionVideoValidationIssue[] => {
  const issues: FashionVideoValidationIssue[] = [];
  const push = (field: string, message: string) => {
    issues.push({
      videoId: video.id,
      title: video.title || video.id,
      field,
      message
    });
  };

  if (!isNonEmpty(video.title)) push("title", "Video title is required.");
  if (!isNonEmpty(video.description)) push("description", "Video description is required.");
  if (!isNonEmpty(video.duration)) push("duration", "Duration is required.");
  if (!isNonEmpty(video.series)) push("series", "Series / grouping is required.");
  if (!isNonEmpty(video.thumbnail)) push("thumbnail", "Thumbnail is required before save or publish.");
  if (!isNonEmpty(video.videoAsset)) push("videoAsset", "Video asset is required before save or publish.");
  if (!isNonEmpty(video.mappedProductId)) push("mappedProductId", "Mapped product is required.");
  if (!isNonEmpty(video.collection)) push("collection", "Collection is required.");
  if (!isNonEmpty(video.category)) push("category", "Category is required.");
  if (!isNonEmpty(video.tone)) push("tone", "Tone is required.");
  if (!video.styleTags?.length) push("styleTags", "At least one style tag is required.");
  if (!isNonEmpty(video.checkoutLabel)) push("checkoutLabel", "Check out label is required.");
  if (!isNonEmpty(video.sourceLabel)) push("sourceLabel", "Source label is required.");
  if (!isNonEmpty(video.whatsappNumber) && !isNonEmpty(fallbackWhatsAppNumber)) {
    push("whatsappNumber", "WhatsApp number is required here or in the main Fashion system.");
  }
  return issues;
};

export const validateFashionVideoContentForAdmin = (
  content: FashionVideoContent,
  fallbackWhatsAppNumber: string
): FashionVideoValidationIssue[] => {
  const issues: FashionVideoValidationIssue[] = [];
  const ids = new Set<string>();
  content.videos.forEach((video, index) => {
    if (!isNonEmpty(video.id)) {
      issues.push({
        videoId: `row-${index + 1}`,
        title: video.title || `Video ${index + 1}`,
        field: "id",
        message: "Video id is required."
      });
    } else if (ids.has(video.id)) {
      issues.push({
        videoId: video.id,
        title: video.title || video.id,
        field: "id",
        message: `Duplicate video id "${video.id}".`
      });
    } else {
      ids.add(video.id);
    }
    issues.push(...validateFashionVideoRecordForAdmin(video, fallbackWhatsAppNumber));
  });
  return issues;
};
