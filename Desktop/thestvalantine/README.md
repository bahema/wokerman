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

The workflow automatically:

1. Derives Vite `base` from `SITE_URL`.
2. Builds frontend.
3. Replaces `__SITE_URL__` placeholders in `sitemap.xml` and `robots.txt`.
4. Deploys `dist/` to GitHub Pages.

## Affiliate Compliance (Implemented)

- Product cards include visible affiliate disclosure text.
- Checkout affiliate links use:
  - `rel="sponsored nofollow noopener noreferrer"`

