# Media API

## Endpoints

- `GET /api/media`
  - Response: `{ items: StoredMediaItem[] }`
- `POST /api/media`
  - Content-Type: `multipart/form-data`
  - Field name: `files` (supports multiple files, up to 20)
  - Response: `{ items: StoredMediaItem[] }`
- `DELETE /api/media/:id`
  - Response: `{ ok: true, removedId: string }`

## Public File URLs

Uploaded files are served from:

- `/uploads/:filename`

URL in response is built using `API_PUBLIC_BASE_URL`.

## Limits

- Max file size: 10 MB per file.
