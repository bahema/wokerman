-- 003_email_core.sql
-- Core email persistence for Quick Grabs subscribers, campaigns, templates, and timeline events.

CREATE TABLE IF NOT EXISTS email_subscribers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  source TEXT NOT NULL CHECK (source IN ('quick_grabs')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_subscribers_email_lower
  ON email_subscribers (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_email_subscribers_status
  ON email_subscribers (status);

CREATE INDEX IF NOT EXISTS idx_email_subscribers_created_at
  ON email_subscribers (created_at);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT NOT NULL DEFAULT '',
  body_mode TEXT NOT NULL CHECK (body_mode IN ('rich', 'html')),
  body_rich TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  audience_mode TEXT NOT NULL CHECK (audience_mode IN ('all', 'segments')),
  segments_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  exclusions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  send_mode TEXT NOT NULL CHECK (send_mode IN ('now', 'schedule')),
  schedule_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'sent')),
  estimated_recipients INTEGER NOT NULL DEFAULT 0 CHECK (estimated_recipients >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status
  ON email_campaigns (status);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_schedule_at
  ON email_campaigns (schedule_at);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at
  ON email_campaigns (created_at);

CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('rich', 'html')),
  subject TEXT NOT NULL,
  preview_text TEXT NOT NULL DEFAULT '',
  body_rich TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'lead_subscribed',
      'lead_confirmed',
      'lead_unsubscribed',
      'lead_confirmation_resent',
      'lead_deleted',
      'campaign_saved',
      'campaign_test_sent',
      'campaign_scheduled',
      'campaign_sent'
    )
  ),
  subscriber_id TEXT REFERENCES email_subscribers(id) ON DELETE SET NULL,
  campaign_id TEXT REFERENCES email_campaigns(id) ON DELETE SET NULL,
  meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_events_type
  ON email_events (event_type);

CREATE INDEX IF NOT EXISTS idx_email_events_created_at
  ON email_events (created_at);

CREATE INDEX IF NOT EXISTS idx_email_events_subscriber_id
  ON email_events (subscriber_id);

CREATE INDEX IF NOT EXISTS idx_email_events_campaign_id
  ON email_events (campaign_id);
