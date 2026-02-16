# Auth + OTP

This project uses a **single-owner auth model**:

- First successful signup creates the only boss account.
- Any further signup attempts are blocked.
- Login OTP is optional and controlled by Account Settings.
- Owner email and role are immutable after first signup.

## SMTP wiring points

Configure SMTP env values in:

- `backend/.env`
- `backend/.env.example` (template)

Current OTP sender entry point:

- `backend/src/auth/otpSender.ts`

If SMTP is not configured, OTP falls back to backend console logs (dev mode behavior).

## Gmail setup

Use Gmail SMTP with an App Password (not your normal account password):

1. Enable 2-Step Verification on your Google account.
2. Create an App Password from Google Account Security settings.
3. Set these in `backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youremail@gmail.com
SMTP_PASS=your_16_char_gmail_app_password
SMTP_FROM="AutoHub Security <youremail@gmail.com>"
```

OTP sending code lives in:

- `backend/src/auth/otpSender.ts`
