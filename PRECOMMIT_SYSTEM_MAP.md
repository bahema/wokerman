# Pre-Commit System Map And Validation

Generated: 2026-02-20

## 1) System Mapping

### Frontend (Vite + React + TypeScript)
- Entry and routing shell: `src/App.tsx`
- Main routes:
  - `/` home
  - `/signup` auth page
  - `/admin` admin dashboard
  - `/confirm` email confirmation proof page
  - `/unsubscribe` unsubscribe proof/resubscribe page
  - policy pages: `/privacy`, `/terms`, `/affiliate-disclosure`, `/earnings-disclaimer`
- Key pages/components:
  - `src/pages/ConfirmResultPage.tsx`
  - `src/pages/UnsubscribeResultPage.tsx`
  - `src/pages/Signup.tsx`
  - `src/components/admin/*` (admin editors, analytics, sender config, system health)

### Backend (Express + TypeScript)
- Server bootstrap: `backend/src/index.ts`
- Core modules:
  - Auth: `backend/src/auth/*`
  - Email subscription/campaign/store: `backend/src/email/*`
  - Media: `backend/src/media/store.ts`
  - Site content: `backend/src/site/store.ts`
  - Analytics: `backend/src/analytics/store.ts`
  - Cookie consent: `backend/src/cookies/store.ts`
- Important API domains:
  - Auth/session/account/password endpoints
  - Site draft/publish/reset endpoints
  - Email subscribe/confirm/unsubscribe/resend/campaign/analytics endpoints
  - Media upload/list/delete endpoints

### Email/Unsubscribe Flow Mapping
- Subscribe: `POST /api/email/subscribe`
- Confirm link: `GET /api/email/confirm?token=...` -> redirects to frontend proof page
- Unsubscribe link: `GET /api/email/unsubscribe?token=...` -> redirects to frontend proof page
- Repeat unsubscribe rule:
  - if unsubscribe occurs after a resend confirmation event, subscriber is auto-deleted
  - analytics notification event emitted
  - admin alert email sent when recipient is configured

## 2) Validation Matrix

### Frontend
- `npm run build` (root): PASS
- `npm run test:frontend-flows`: PASS (10/10)

### Backend
- `npm run build` (`backend/`): PASS
- `npm run test:email-subscription`: PASS
- `npm run test:unsubscribe-repeat`: PASS
- `npm run test:auth-flows`: PASS
- `npm run test:site-validation`: PASS
- `npm run test:auth-rate-limit`: PASS

### Runtime Smoke Checks
- Backend:
  - `GET http://localhost:4000/api/health`: 200 PASS
  - `GET /api/email/confirm?token=invalid`: 303 redirect PASS
  - `GET /api/email/unsubscribe?token=invalid`: 303 redirect PASS
- Frontend:
  - `GET http://localhost:5180/`: 200 PASS
  - `GET http://localhost:5180/confirm?status=success`: 200 PASS
  - `GET http://localhost:5180/unsubscribe?status=success`: 200 PASS
  - `GET http://localhost:5180/admin`: 200 PASS
  - `GET http://localhost:5180/signup`: 200 PASS

## 3) Commit Readiness

- Result: READY TO COMMIT
- All executed build/tests/smoke checks passed.
