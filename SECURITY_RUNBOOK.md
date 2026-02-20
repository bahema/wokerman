# Security & Recovery Runbook

This runbook defines baseline operational procedures for production security, backup/restore, and incident response.

## 1. Scope

- Backend service data in `MEDIA_DIR` (filesystem persistence).
- Auth/session state, content state, email state, media uploads, analytics, and cookie-consent records under storage.
- Deployment secrets and auth controls.

## 2. Backup Policy

- Frequency: daily full backup + pre-deploy backup.
- Retention:
  - Daily backups: 14 days
  - Weekly backups: 8 weeks
  - Monthly backups: 6 months
- Storage: encrypted backup location outside app host.

## 3. Backup Procedure (Filesystem Storage)

Run on the backend host where `MEDIA_DIR` is mounted.

```bash
ts=$(date -u +%Y%m%dT%H%M%SZ)
src="/var/data/storage"
out="/var/backups/autohub"
mkdir -p "$out"
tar -czf "$out/storage-$ts.tar.gz" -C /var/data storage
sha256sum "$out/storage-$ts.tar.gz" > "$out/storage-$ts.sha256"
```

Validate backup integrity:

```bash
sha256sum -c "/var/backups/autohub/storage-$ts.sha256"
tar -tzf "/var/backups/autohub/storage-$ts.tar.gz" >/dev/null
```

## 4. Restore Procedure

1. Stop backend service.
2. Take a safety snapshot of current storage.
3. Restore chosen backup archive.
4. Start backend service.
5. Run health and auth checks.

```bash
systemctl stop autohub-backend || true
cp -a /var/data/storage "/var/data/storage.pre-restore.$(date -u +%Y%m%dT%H%M%SZ)"
tar -xzf /var/backups/autohub/storage-<timestamp>.tar.gz -C /var/data
systemctl start autohub-backend || true
curl -fsS http://localhost:4000/api/health
```

Post-restore validation checklist:

- `GET /api/health` returns `200`.
- Admin login works.
- `GET /api/site/published` returns expected content.
- Admin media list loads.
- Email subscriber/analytics endpoints load for admin.

## 5. Incident Response (Minimum)

Severity P1 indicators:

- Unauthorized admin action
- Data tampering or deletion
- Secret exposure
- Repeated auth abuse beyond expected traffic

Immediate containment:

1. Rotate `AUTH_COOKIE_SIGNING_KEY`.
2. Rotate `OWNER_BOOTSTRAP_KEY`.
3. Rotate SMTP credentials.
4. Force admin logout-all.
5. Temporarily restrict CORS to known production origin only.

Eradication & recovery:

1. Patch root cause.
2. Rebuild/redeploy.
3. Restore affected data from verified backup if needed.
4. Verify auth, content integrity, and email operations.

## 6. Secret Rotation Checklist

Rotate and redeploy in this order:

1. `AUTH_COOKIE_SIGNING_KEY`
2. `OWNER_BOOTSTRAP_KEY`
3. `SMTP_PASS` (and SMTP app password)
4. Any provider/API credentials used by deployment platform

After rotation:

- Confirm admin can log in.
- Confirm old sessions are invalid.
- Confirm no startup security-config errors.

## 7. Production Security Baseline

Must be true in production:

- `ALLOW_DEV_OTP=false`
- `AUTH_COOKIE_SIGNING_KEY` is strong/random (32+ chars)
- `CORS_ORIGIN` is explicit (no `*`)
- Owner bootstrap controls configured:
  - `OWNER_BOOTSTRAP_EMAIL`
  - `OWNER_BOOTSTRAP_KEY`

## 8. Verification Commands

```bash
npm --prefix backend run build
npm --prefix backend run test:auth-flows
npm --prefix backend run test:site-validation
npm --prefix backend run test:auth-rate-limit
npm --prefix backend run test:email-subscription
```

## 9. Audit Review

- Review `admin_action` events in analytics storage regularly.
- Keep at least 90 days of audit history.
- Flag high-risk actions:
  - password change
  - logout-all
  - site reset
  - sender profile changes
