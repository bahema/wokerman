# Site Content API

## Endpoints

- `GET /api/site/published`
  - Response: `{ content: SiteContent }`

- `GET /api/site/draft`
  - Response: `{ content: SiteContent | null }`

- `PUT /api/site/draft`
  - Body: `{ content: SiteContent }`
  - Response: `{ content: SiteContent }`

- `POST /api/site/publish`
  - Body (optional): `{ content: SiteContent }`
  - Behavior:
    - if body content is provided, publish that content
    - else publish existing draft if present
    - else keep published as-is
  - Response: `{ content: SiteContent }`

- `POST /api/site/reset`
  - Response: `{ published: SiteContent, draft: null }`

## Storage

Persisted in local JSON file:

- `<MEDIA_DIR>/site/content.json`
