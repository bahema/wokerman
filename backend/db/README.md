# Database Setup (Step 3)

This folder contains SQL migrations for the backend data model.

## Migration Order

1. `migrations/001_init.sql`
2. `migrations/002_seed_published.sql`

## Tables

- `site_content`:
  - stores `draft` and `published` JSON documents
- `media_assets`:
  - stores uploaded image metadata and URL
- `analytics_events`:
  - stores tracked event payloads

## Local Notes

- Configure `DB_URL` in `backend/.env`.
- Apply migrations using your preferred SQL migration runner or psql:
  - `psql "$DB_URL" -f backend/db/migrations/001_init.sql`
  - `psql "$DB_URL" -f backend/db/migrations/002_seed_published.sql`

No ORM is required at this stage; raw SQL is intentional to keep the contract stable.
