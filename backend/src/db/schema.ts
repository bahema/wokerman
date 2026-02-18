export const TABLES = {
  siteContent: "site_content",
  mediaAssets: "media_assets",
  analyticsEvents: "analytics_events",
  emailSubscribers: "email_subscribers",
  emailCampaigns: "email_campaigns",
  emailTemplates: "email_templates",
  emailEvents: "email_events"
} as const;

export const SITE_CONTENT_KINDS = {
  draft: "draft",
  published: "published"
} as const;

export type SiteContentKind = (typeof SITE_CONTENT_KINDS)[keyof typeof SITE_CONTENT_KINDS];

export const EMAIL_SUBSCRIBER_STATUS = {
  pending: "pending",
  confirmed: "confirmed",
  unsubscribed: "unsubscribed"
} as const;

export type EmailSubscriberStatus = (typeof EMAIL_SUBSCRIBER_STATUS)[keyof typeof EMAIL_SUBSCRIBER_STATUS];

export const EMAIL_SUBSCRIBER_SOURCE = {
  quickGrabs: "quick_grabs"
} as const;

export type EmailSubscriberSource = (typeof EMAIL_SUBSCRIBER_SOURCE)[keyof typeof EMAIL_SUBSCRIBER_SOURCE];

export const EMAIL_CAMPAIGN_BODY_MODE = {
  rich: "rich",
  html: "html"
} as const;

export type EmailCampaignBodyMode = (typeof EMAIL_CAMPAIGN_BODY_MODE)[keyof typeof EMAIL_CAMPAIGN_BODY_MODE];

export const EMAIL_CAMPAIGN_AUDIENCE_MODE = {
  all: "all",
  segments: "segments"
} as const;

export type EmailCampaignAudienceMode = (typeof EMAIL_CAMPAIGN_AUDIENCE_MODE)[keyof typeof EMAIL_CAMPAIGN_AUDIENCE_MODE];

export const EMAIL_CAMPAIGN_SEND_MODE = {
  now: "now",
  schedule: "schedule"
} as const;

export type EmailCampaignSendMode = (typeof EMAIL_CAMPAIGN_SEND_MODE)[keyof typeof EMAIL_CAMPAIGN_SEND_MODE];

export const EMAIL_CAMPAIGN_STATUS = {
  draft: "draft",
  scheduled: "scheduled",
  sent: "sent"
} as const;

export type EmailCampaignStatus = (typeof EMAIL_CAMPAIGN_STATUS)[keyof typeof EMAIL_CAMPAIGN_STATUS];

export const EMAIL_EVENT_TYPES = {
  leadSubscribed: "lead_subscribed",
  leadConfirmed: "lead_confirmed",
  leadUnsubscribed: "lead_unsubscribed",
  leadConfirmationResent: "lead_confirmation_resent",
  leadDeleted: "lead_deleted",
  campaignSaved: "campaign_saved",
  campaignTestSent: "campaign_test_sent",
  campaignScheduled: "campaign_scheduled",
  campaignSent: "campaign_sent"
} as const;

export type EmailEventType = (typeof EMAIL_EVENT_TYPES)[keyof typeof EMAIL_EVENT_TYPES];
