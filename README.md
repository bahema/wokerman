# AutoHub Landing

Frontend + backend project for AutoHub product promotion and admin content management.

## Local Run

```bash
npm ci
npm run dev
```

Backend (separate terminal):

```bash
npm --prefix backend ci
npm --prefix backend run dev
```

## GitHub Pages Deployment

This repo includes a Pages workflow at `.github/workflows/deploy-pages.yml`.

### Required GitHub setting

Set repository variable:

- `SITE_URL`
  - Example (project pages): `https://username.github.io/repo`
  - Example (custom domain): `https://yourdomain.com`
- `VITE_API_BASE_URL`
  - Example: `https://autohub-backend.onrender.com`
  - For Railway: `https://<your-service>.up.railway.app`

The workflow automatically:

1. Derives Vite `base` from `SITE_URL`.
2. Builds frontend.
3. Replaces `__SITE_URL__` placeholders in `sitemap.xml` and `robots.txt`.
4. Deploys `dist/` to GitHub Pages.

## Affiliate Compliance (Implemented)

- Product cards include visible affiliate disclosure text.
- Checkout affiliate links use:
  - `rel="sponsored nofollow noopener noreferrer"`

## Backend Deployment (Render)

This repo includes `render.yaml` for backend deployment.

### Steps

1. In Render, create a **Blueprint** deployment from this repository.
2. Select service `autohub-backend`.
3. Fill required env vars:
   - `CORS_ORIGIN` (origin only, no path, e.g. `https://username.github.io`)
   - `API_PUBLIC_BASE_URL`
   - `SMTP_HOST`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `SMTP_FROM`
4. Deploy and confirm health endpoint:
   - `https://<your-backend-domain>/api/health`

`MEDIA_DIR` is preconfigured to `/var/data/storage` and persistent disk is defined in `render.yaml`.
