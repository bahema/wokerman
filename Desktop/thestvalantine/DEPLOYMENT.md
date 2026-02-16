# Deployment Checklist

## 1. Preflight (local)

Run these from project root:

```bash
npm run build
npm --prefix backend run build
npm run test:frontend-flows
npm --prefix backend run test:auth-flows
npm --prefix backend run test:auth-rate-limit
npm --prefix backend run test:site-validation
```

## 2. Environment Setup

### Frontend (`.env`)

```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

### Backend (`backend/.env`)

Use `backend/.env.example` and set at minimum:

```env
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://yourdomain.com
API_PUBLIC_BASE_URL=https://api.yourdomain.com
MEDIA_DIR=/var/lib/autohub/storage
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
```

## 3. Persistent Storage

`MEDIA_DIR` must be a persistent volume. This stores:
- auth state
- site draft/published content
- analytics events
- uploaded media metadata/files

Without a persistent volume, data resets on restart.

## 4. Start Services

Backend:

```bash
npm --prefix backend run build
npm --prefix backend run start
```

Frontend:

```bash
npm run build
npm run preview
```

## 5. Smoke Verification

With backend running:

```bash
npm --prefix backend run verify:endpoints
```

If owner already exists, set:

```env
API_BASE_URL=https://api.yourdomain.com
VERIFY_OWNER_EMAIL=owner@yourdomain.com
VERIFY_OWNER_PASSWORD=your_owner_password
```

## 6. Manual UAT

- Signup is available only before first account creation.
- After signup verification, page returns to login mode.
- Login works with/without OTP based on account settings.
- Account email/role are immutable.
- Draft save, publish, and reset work.
- Media upload/delete works.
- Analytics events + summary work.

## 7. Production Hardening

- Serve frontend and backend over HTTPS.
- Keep `CORS_ORIGIN` exact (no wildcard).
- Restrict server/network access to required ports only.
- Back up `MEDIA_DIR` periodically.
