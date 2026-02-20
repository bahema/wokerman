# Pre-Commit System Map And Validation

Generated: 2026-02-20

## 1) Full System Mapping

### Frontend Architecture (Vite + React + TypeScript)
- App shell and route normalization: `src/App.tsx`
- API client and base URL strategy: `src/api/client.ts`
- Admin control surface: `src/pages/Admin.tsx`
- Shared content schema defaults: `src/data/siteData.ts`

### Frontend Public Route Map
- `/` -> `Home`
- `/forex` -> `Home` section: forex
- `/betting` -> `Home` section: betting
- `/software` -> `Home` section: software
- `/social` -> `Home` section: social
- `/signup` -> `Signup`
- `/admin` -> `Admin` (requires session)
- `/confirm` -> `ConfirmResultPage`
- `/unsubscribe` -> `UnsubscribeResultPage`
- `/affiliate-disclosure` -> `PolicyPage(kind="affiliate-disclosure")`
- `/earnings-disclaimer` -> `PolicyPage(kind="earnings-disclaimer")`
- `/privacy` -> `PolicyPage(kind="privacy")`
- `/terms` -> `PolicyPage(kind="terms")`
- `/404` -> inline not-found page

### Frontend Admin Deep-Link Map
- `/boss/login` -> normalized to `/signup`
- `/boss/*` -> normalized to `/admin`
- Section deep links:
  - `/boss/pre-deploy-checklist`
  - `/boss/system-health`
  - `/boss/email-analytics`
  - `/boss/email-sender`
  - `/boss/adsection-man`
  - `/boss/account-settings`

### Frontend Admin Section Inventory
- `pre-deploy-checklist`
- `system-health`
- `account-settings`
- `email-analytics`
- `email-sender`
- `product-media`
- `analytics`
- `branding`
- `social-links`
- `hero`
- `adsection-man`
- `testimonials`
- `industries`
- `footer`
- `products-forex`
- `products-betting`
- `products-software`
- `products-social`

### Backend Architecture (Express + TypeScript)
- Bootstrap and middleware: `backend/src/index.ts`
- Persistence model: filesystem stores under `storage`/`MEDIA_DIR`
- Modules:
  - Auth: `backend/src/auth/*`
  - Email: `backend/src/email/*`
  - Site content: `backend/src/site/*`
  - Media: `backend/src/media/*`
  - Analytics: `backend/src/analytics/*`
  - Cookie consent: `backend/src/cookies/*`

### Backend Full API Route Inventory (42 endpoints)

#### Health
- `GET /api/health`

#### Auth
- `GET /api/auth/status`
- `POST /api/auth/signup/start`
- `POST /api/auth/signup/verify`
- `POST /api/auth/login/start`
- `POST /api/auth/login/verify`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `GET /api/auth/account`
- `PUT /api/auth/account`
- `PUT /api/auth/password`

#### Media
- `GET /api/media`
- `POST /api/media`
- `DELETE /api/media/:id`

#### Site Content
- `GET /api/site/published`
- `GET /api/site/draft`
- `GET /api/site/meta`
- `PUT /api/site/draft`
- `POST /api/site/publish`
- `POST /api/site/reset`

#### Analytics
- `POST /api/analytics/events`
- `GET /api/analytics/summary`

#### Cookies/Consent
- `POST /api/cookies/consent`
- `GET /api/cookies/consent/:id`

#### Email Subscription/Lifecycle
- `POST /api/email/subscribe`
- `POST /api/email/subscribers/:id/resend-confirmation`
- `DELETE /api/email/subscribers/:id`
- `GET /api/email/confirm`
- `GET /api/email/unsubscribe`

#### Email Admin Operations
- `POST /api/email/test-smtp`
- `GET /api/email/subscribers`
- `GET /api/email/campaigns`
- `POST /api/email/campaigns/draft`
- `POST /api/email/campaigns/test`
- `POST /api/email/campaigns/schedule`
- `POST /api/email/campaigns/send`
- `GET /api/email/templates/confirmation`
- `PUT /api/email/templates/confirmation`
- `GET /api/email/settings/sender-profile`
- `PUT /api/email/settings/sender-profile`
- `GET /api/email/analytics/summary`

### Security And Runtime Controls
- Auth session cookies + CSRF enforcement for cookie-auth state changes
- CORS allowlist via `CORS_ORIGIN`
- IP rate limiting:
  - auth endpoints
  - email subscribe endpoint
- Rate-limiter bucket cleanup + cap (`RATE_LIMIT_BUCKET_LIMIT`)
- `trust proxy` support (`TRUST_PROXY`)
- Production security config checks for weak secrets and wildcard CORS
- Startup fallback for cookie signing key:
  - preferred: `AUTH_COOKIE_SIGNING_KEY`
  - fallback names: `AUTH_COOKIE_SECRET`, `SESSION_SECRET`
  - if missing in production: ephemeral key with warning (service still starts)

## 2) Validation Matrix

### Local Build Validation
- `npm run build` (root): PASS
- `npm --prefix backend run build`: PASS

### Frontend Runtime Smoke (local preview)
- `GET /`: 200 PASS
- `GET /signup`: 200 PASS
- `GET /admin`: 200 PASS
- `GET /confirm?status=success`: 200 PASS
- `GET /unsubscribe?status=success`: 200 PASS
- `GET /privacy`: 200 PASS

### Backend Runtime Smoke (local production mode)
- `GET /api/health` with production env and secret present: 200 PASS
- `GET /api/health` with production env and no secret present: 200 PASS (ephemeral-key fallback)
- SMTP unset/invalid does not block startup health: PASS
- Locale/env variation does not block startup health: PASS

### Live Deployment Spot-Checks
- Frontend: `https://bahema.github.io/wokerman/` -> 200 PASS
- Backend (active): `https://autohub-backend-production-5a29.up.railway.app/api/health` -> 200 PASS

## 3) Commit Readiness

- Mapping coverage result: COMPLETE (frontend routes, admin sections, backend endpoints all enumerated).
- Build/runtime status: PASS.
