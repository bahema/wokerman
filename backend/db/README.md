# Database Setup (Step 3)

This folder contains SQL migrations for the backend data model.

## Migration Order

1. `migrations/001_init.sql`
2. `migrations/002_seed_published.sql`
3. `migrations/003_email_core.sql`

## Tables

- `site_content`:
  - stores `draft` and `published` JSON documents
- `media_assets`:
  - stores uploaded image metadata and URL
- `analytics_events`:
  - stores tracked event payloads
- `email_subscribers`:
  - stores Quick Grabs subscribers and lifecycle status
- `email_campaigns`:
  - stores sender draft/scheduled/sent campaign payloads
- `email_templates`:
  - stores editable confirmation email template
- `email_events`:
  - stores email lifecycle timeline events

## Local Notes

- Current runtime persistence is filesystem-based (`MEDIA_DIR`) and does not execute SQL migrations yet.
- `DB_URL` is reserved for future SQL-backed persistence wiring.
- Apply migrations using your preferred SQL migration runner or psql:
  - `psql "$DB_URL" -f backend/db/migrations/001_init.sql`
  - `psql "$DB_URL" -f backend/db/migrations/002_seed_published.sql`
  - `psql "$DB_URL" -f backend/db/migrations/003_email_core.sql`

No ORM is required at this stage; raw SQL is intentional to keep the contract stable.
