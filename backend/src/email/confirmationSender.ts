import nodemailer from "nodemailer";

type ConfirmationInput = {
  toEmail: string;
  firstName: string;
  confirmUrl: string;
  unsubscribeUrl: string;
  subject: string;
  previewText: string;
  bodyMode: "rich" | "html";
  bodyRich: string;
  bodyHtml: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
};

export class EmailDeliveryError extends Error {
  code: "SMTP_NOT_CONFIGURED" | "SMTP_SEND_FAILED";

  constructor(code: "SMTP_NOT_CONFIGURED" | "SMTP_SEND_FAILED", message: string) {
    super(message);
    this.code = code;
    this.name = "EmailDeliveryError";
  }
}

const smtpReady = (input: ConfirmationInput) => Boolean(input.smtpHost && input.smtpPort && input.smtpUser && input.smtpPass);

const renderTemplate = (value: string, input: ConfirmationInput) =>
  value
    .replaceAll("{{first_name}}", input.firstName)
    .replaceAll("{{email}}", input.toEmail)
    .replaceAll("{{confirm_subscription_link}}", input.confirmUrl)
    .replaceAll("{{unsubscribe_link}}", input.unsubscribeUrl);

const toHtmlFromRich = (value: string) => {
  const escaped = value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
  return escaped.replaceAll("\n", "<br/>");
};

const asFrom = (name: string, email: string) => `${name} <${email}>`;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const extractEmail = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/<([^<>]+)>/);
  const candidate = (match?.[1] ?? trimmed).trim().toLowerCase();
  return EMAIL_PATTERN.test(candidate) ? candidate : "";
};
const resolveEffectiveFromEmail = (fromEmail: string, smtpUser: string) => {
  const preferred = extractEmail(fromEmail);
  const auth = extractEmail(smtpUser);
  if (!auth) return preferred || fromEmail;
  if (!preferred || preferred !== auth) return auth;
  return preferred;
};

export const sendConfirmationEmail = async (input: ConfirmationInput) => {
  const renderedSubject = renderTemplate(input.subject, input);
  const renderedPreview = renderTemplate(input.previewText, input);
  const renderedRich = renderTemplate(input.bodyRich, input);
  const renderedHtml = renderTemplate(input.bodyHtml, input);
  const htmlContent = input.bodyMode === "html" ? renderedHtml : `<div style="font-family:Arial,sans-serif;line-height:1.6">${toHtmlFromRich(renderedRich)}</div>`;
  const textContent = input.bodyMode === "html" ? renderedHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : renderedRich;

  if (process.env.NODE_ENV === "test") {
    return { delivered: false, provider: "console" as const };
  }
  if (!smtpReady(input)) {
    throw new EmailDeliveryError("SMTP_NOT_CONFIGURED", "SMTP is not configured for confirmation email sending.");
  }

  try {
    const rejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false";
    const effectiveFromEmail = resolveEffectiveFromEmail(input.fromEmail, input.smtpUser);
    if (effectiveFromEmail !== input.fromEmail) {
      // eslint-disable-next-line no-console
      console.log(`[email] sender adjusted from=${input.fromEmail} to=${effectiveFromEmail} for smtpUser=${input.smtpUser}`);
    }
    // eslint-disable-next-line no-console
    console.log(`[email] smtp transport host=${input.smtpHost} port=${String(input.smtpPort)} secure=${String(input.smtpSecure)} tlsRejectUnauthorized=${String(rejectUnauthorized)}`);
    const transport = nodemailer.createTransport({
      host: input.smtpHost,
      port: Number(input.smtpPort),
      secure: input.smtpSecure,
      auth: {
        user: input.smtpUser,
        pass: input.smtpPass
      },
      tls: {
        rejectUnauthorized
      }
    });

    await transport.sendMail({
      from: asFrom(input.fromName, effectiveFromEmail),
      to: input.toEmail,
      replyTo: input.replyTo || effectiveFromEmail,
      subject: renderedSubject,
      text: renderedPreview ? `${renderedPreview}\n\n${textContent}` : textContent,
      html: renderedPreview
        ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${renderedPreview}</div>${htmlContent}`
        : htmlContent
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP send failed.";
    // eslint-disable-next-line no-console
    console.error(`[email] smtp send failed: ${message}`);
    throw new EmailDeliveryError("SMTP_SEND_FAILED", message);
  }

  return { delivered: true, provider: "smtp" as const };
};
