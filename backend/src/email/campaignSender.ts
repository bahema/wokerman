import nodemailer from "nodemailer";
import type { EmailCampaignRecipient } from "./store.js";

type CampaignSendInput = {
  recipients: EmailCampaignRecipient[];
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
  apiPublicBaseUrl: string;
  includeUnsubscribeFooter: boolean;
  checks: {
    subjectSafe: boolean;
    addressIncluded: boolean;
    unsubscribeLink: boolean;
  };
};

export class CampaignDeliveryError extends Error {
  code: "SMTP_NOT_CONFIGURED" | "SMTP_SEND_FAILED";

  constructor(code: "SMTP_NOT_CONFIGURED" | "SMTP_SEND_FAILED", message: string) {
    super(message);
    this.code = code;
    this.name = "CampaignDeliveryError";
  }
}

const smtpReady = (input: CampaignSendInput) => Boolean(input.smtpHost && input.smtpPort && input.smtpUser && input.smtpPass);

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
const toFirstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || "there";
const mailingAddress = (process.env.MAILING_ADDRESS ?? "").trim();
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
const stripHtml = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const buildComplianceFooter = (unsubscribeUrl: string) => {
  const addressLine = mailingAddress ? `Mailing address: ${mailingAddress}` : "";
  const textFooter = [addressLine, `Unsubscribe: ${unsubscribeUrl}`].filter(Boolean).join("\n");
  const htmlFooter = `<hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;" /><p style="font-size:12px;color:#64748b;line-height:1.5;">${
    mailingAddress ? `Mailing address: ${mailingAddress}<br/>` : ""
  }Unsubscribe: <a href="${unsubscribeUrl}">${unsubscribeUrl}</a></p>`;
  return { textFooter, htmlFooter };
};
const appendFooter = (textContent: string, htmlContent: string, unsubscribeUrl: string) => {
  const footer = buildComplianceFooter(unsubscribeUrl);
  return {
    text: `${textContent}\n\n${footer.textFooter}`.trim(),
    html: `${htmlContent}${footer.htmlFooter}`
  };
};
const hasUnsubscribeLink = (textContent: string, htmlContent: string, unsubscribeUrl: string) => {
  return textContent.includes(unsubscribeUrl) || htmlContent.includes(unsubscribeUrl);
};
const validateSubject = (subject: string) => {
  if (subject.includes("\r") || subject.includes("\n")) return false;
  return subject.trim().length > 0;
};

const renderTemplate = (value: string, recipient: EmailCampaignRecipient, apiPublicBaseUrl: string) => {
  const unsubscribeUrl = `${apiPublicBaseUrl}/api/email/unsubscribe?token=${encodeURIComponent(recipient.unsubscribeToken)}`;
  return value
    .replaceAll("{{first_name}}", toFirstName(recipient.name))
    .replaceAll("{{email}}", recipient.email)
    .replaceAll("{{unsubscribe_link}}", unsubscribeUrl);
};

export const sendCampaignEmails = async (input: CampaignSendInput) => {
  if (process.env.NODE_ENV === "test") {
    return { attempted: input.recipients.length, delivered: 0, failed: 0, failures: [] as Array<{ email: string; error: string }>, provider: "console" as const };
  }
  if (!smtpReady(input)) {
    throw new CampaignDeliveryError("SMTP_NOT_CONFIGURED", "SMTP is not configured for campaign email sending.");
  }
  if (input.checks.addressIncluded && !mailingAddress) {
    throw new CampaignDeliveryError("SMTP_SEND_FAILED", "MAILING_ADDRESS is required by compliance checks.");
  }

  const rejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false";
  const effectiveFromEmail = resolveEffectiveFromEmail(input.fromEmail, input.smtpUser);
  if (effectiveFromEmail !== input.fromEmail) {
    // eslint-disable-next-line no-console
    console.log(`[email] campaign sender adjusted from=${input.fromEmail} to=${effectiveFromEmail} for smtpUser=${input.smtpUser}`);
  }
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

  let delivered = 0;
  const failures: Array<{ email: string; error: string }> = [];
  for (const recipient of input.recipients) {
    const renderedSubject = renderTemplate(input.subject, recipient, input.apiPublicBaseUrl);
    const renderedPreview = renderTemplate(input.previewText, recipient, input.apiPublicBaseUrl);
    const renderedRich = renderTemplate(input.bodyRich, recipient, input.apiPublicBaseUrl);
    const renderedHtml = renderTemplate(input.bodyHtml, recipient, input.apiPublicBaseUrl);
    if (input.checks.subjectSafe && !validateSubject(renderedSubject)) {
      failures.push({ email: recipient.email, error: "Invalid campaign subject." });
      continue;
    }
    const unsubscribeUrl = `${input.apiPublicBaseUrl}/api/email/unsubscribe?token=${encodeURIComponent(recipient.unsubscribeToken)}`;
    const htmlContentBase =
      input.bodyMode === "html" ? renderedHtml : `<div style="font-family:Arial,sans-serif;line-height:1.6">${toHtmlFromRich(renderedRich)}</div>`;
    const textContentBase = input.bodyMode === "html" ? stripHtml(renderedHtml) : renderedRich;
    const composed =
      input.includeUnsubscribeFooter ? appendFooter(textContentBase, htmlContentBase, unsubscribeUrl) : { text: textContentBase, html: htmlContentBase };
    const textContent = composed.text;
    const htmlContent = composed.html;
    if (input.checks.unsubscribeLink && !hasUnsubscribeLink(textContent, htmlContent, unsubscribeUrl)) {
      failures.push({ email: recipient.email, error: "Unsubscribe link is required in campaign email." });
      continue;
    }

    try {
      await transport.sendMail({
        from: asFrom(input.fromName, effectiveFromEmail),
        to: recipient.email,
        replyTo: input.replyTo || effectiveFromEmail,
        subject: renderedSubject,
        text: renderedPreview ? `${renderedPreview}\n\n${textContent}` : textContent,
        html: renderedPreview
          ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${renderedPreview}</div>${htmlContent}`
          : htmlContent,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:${input.replyTo || effectiveFromEmail}?subject=unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
        }
      });
      delivered += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "SMTP send failed.";
      failures.push({ email: recipient.email, error: message });
    }
  }

  if (delivered === 0 && failures.length > 0) {
    throw new CampaignDeliveryError("SMTP_SEND_FAILED", failures[0]?.error ?? "SMTP send failed.");
  }

  return {
    attempted: input.recipients.length,
    delivered,
    failed: failures.length,
    failures,
    provider: "smtp" as const
  };
};
