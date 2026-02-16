export const TABLES = {
  siteContent: "site_content",
  mediaAssets: "media_assets",
  analyticsEvents: "analytics_events"
} as const;

export const SITE_CONTENT_KINDS = {
  draft: "draft",
  published: "published"
} as const;

export type SiteContentKind = (typeof SITE_CONTENT_KINDS)[keyof typeof SITE_CONTENT_KINDS];
