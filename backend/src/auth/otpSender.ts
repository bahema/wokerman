import nodemailer from "nodemailer";

type OtpPurpose = "signup" | "login";

type SendOtpInput = {
  email: string;
  code: string;
  purpose: OtpPurpose;
};

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = process.env.SMTP_PORT ?? "";
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
const SMTP_FROM = process.env.SMTP_FROM ?? "";
const DISABLE_SMTP = process.env.DISABLE_SMTP === "true" || process.env.NODE_ENV === "test";

const smtpReady = () => Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM);

export const sendOtp = async ({ email, code, purpose }: SendOtpInput) => {
  if (DISABLE_SMTP || !smtpReady()) {
    // Dev fallback: OTP is visible in backend logs until SMTP is configured.
    // eslint-disable-next-line no-console
    console.log(`[OTP:${purpose}] ${email} -> ${code}`);
    return { delivered: false, provider: "console" as const };
  }

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  const action = purpose === "signup" ? "Complete your boss account signup" : "Complete your boss account login";
  await transport.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: `AutoHub OTP: ${purpose === "signup" ? "Signup" : "Login"} Verification`,
    text: `Your OTP is ${code}. It expires in 5 minutes. ${action}.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2 style="margin:0 0 12px">AutoHub Security Code</h2>
      <p>Your one-time code is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:8px 0">${code}</p>
      <p>This code expires in <strong>5 minutes</strong>.</p>
      <p style="color:#64748b">${action}</p>
    </div>`
  });

  return { delivered: true, provider: "smtp" as const };
};
