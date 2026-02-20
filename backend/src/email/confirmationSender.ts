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
  includeUnsubscribeFooter: boolean;
  checks: {
    subjectSafe: boolean;
    addressIncluded: boolean;
    unsubscribeLink: boolean;
  };
};

type SmtpSendSummary = {
  messageId: string;
  accepted: string[];
  rejected: string[];
};

export type ConfirmationDeliveryResult = {
  ok: true;
  delivered: true;
  provider: "smtp" | "console";
  messageId: string;
  accepted: string[];
  rejected: string[];
};

export class EmailDeliveryError extends Error {
  code: "SMTP_NOT_CONFIGURED" | "SMTP_SEND_FAILED";
  detailCode?: string;

  constructor(code: "SMTP_NOT_CONFIGURED" | "SMTP_SEND_FAILED", message: string, detailCode?: string) {
    super(message);
    this.code = code;
    this.detailCode = detailCode;
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

const toStringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((item) => String(item).trim())
        .filter(Boolean)
    : [];

const summarizeInfo = (info: unknown): SmtpSendSummary => {
  const payload = (info ?? {}) as { messageId?: unknown; accepted?: unknown; rejected?: unknown };
  return {
    messageId: typeof payload.messageId === "string" && payload.messageId.trim() ? payload.messageId.trim() : "unknown",
    accepted: toStringList(payload.accepted),
    rejected: toStringList(payload.rejected)
  };
};

const toSmtpErrorLog = (error: unknown) => {
  const payload = (error ?? {}) as {
    name?: unknown;
    code?: unknown;
    message?: unknown;
    response?: unknown;
    command?: unknown;
  };
  const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : "Error";
  const code = typeof payload.code === "string" ? payload.code : "UNKNOWN";
  const message = typeof payload.message === "string" ? payload.message : "SMTP send failed.";
  const response = typeof payload.response === "string" ? payload.response.trim() : "";
  const command = typeof payload.command === "string" ? payload.command.trim() : "";
  return { name, code, message, response, command };
};

const createSmtpTransport = (input: {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
}) => {
  const rejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false";
  // eslint-disable-next-line no-console
  console.log(
    `[email] smtp transport host=${input.smtpHost} port=${String(input.smtpPort)} secure=${String(input.smtpSecure)} tlsRejectUnauthorized=${String(
      rejectUnauthorized
    )}`
  );
  return nodemailer.createTransport({
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
};

export const sendConfirmationEmail = async (input: ConfirmationInput): Promise<ConfirmationDeliveryResult> => {
  const renderedSubject = renderTemplate(input.subject, input);
  const renderedPreview = renderTemplate(input.previewText, input);
  const renderedRich = renderTemplate(input.bodyRich, input);
  const renderedHtml = renderTemplate(input.bodyHtml, input);
  const htmlContentBase = input.bodyMode === "html" ? renderedHtml : `<div style="font-family:Arial,sans-serif;line-height:1.6">${toHtmlFromRich(renderedRich)}</div>`;
  const textContentBase = input.bodyMode === "html" ? stripHtml(renderedHtml) : renderedRich;
  const composed =
    input.includeUnsubscribeFooter ? appendFooter(textContentBase, htmlContentBase, input.unsubscribeUrl) : { text: textContentBase, html: htmlContentBase };
  const textContent = composed.text;
  const htmlContent = composed.html;

  if (process.env.NODE_ENV === "test") {
    return {
      ok: true,
      delivered: true,
      provider: "console",
      messageId: "test-message-id",
      accepted: [input.toEmail],
      rejected: []
    };
  }
  if (!smtpReady(input)) {
    throw new EmailDeliveryError("SMTP_NOT_CONFIGURED", "SMTP is not configured for confirmation email sending.");
  }
  if (input.checks.subjectSafe && !validateSubject(renderedSubject)) {
    throw new EmailDeliveryError("SMTP_SEND_FAILED", "Subject is invalid for safe delivery.");
  }
  if (input.checks.unsubscribeLink && !hasUnsubscribeLink(textContent, htmlContent, input.unsubscribeUrl)) {
    throw new EmailDeliveryError("SMTP_SEND_FAILED", "Unsubscribe link is required in confirmation email.");
  }
  if (input.checks.addressIncluded && !mailingAddress) {
    throw new EmailDeliveryError("SMTP_SEND_FAILED", "MAILING_ADDRESS is required by compliance checks.");
  }

  try {
    const effectiveFromEmail = resolveEffectiveFromEmail(input.fromEmail, input.smtpUser);
    if (effectiveFromEmail !== input.fromEmail) {
      // eslint-disable-next-line no-console
      console.log(`[email] sender adjusted from=${input.fromEmail} to=${effectiveFromEmail} for smtpUser=${input.smtpUser}`);
    }
    const transport = createSmtpTransport({
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpSecure: input.smtpSecure,
      smtpUser: input.smtpUser,
      smtpPass: input.smtpPass
    });

    const info = await transport.sendMail({
      from: asFrom(input.fromName, effectiveFromEmail),
      to: input.toEmail,
      replyTo: input.replyTo || effectiveFromEmail,
      subject: renderedSubject,
      text: renderedPreview ? `${renderedPreview}\n\n${textContent}` : textContent,
      html: renderedPreview
        ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${renderedPreview}</div>${htmlContent}`
        : htmlContent,
      headers: {
        "List-Unsubscribe": `<${input.unsubscribeUrl}>, <mailto:${input.replyTo || effectiveFromEmail}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
      }
    });
    const summary = summarizeInfo(info);
    // eslint-disable-next-line no-console
    console.log(
      `CONFIRMATION_SENT messageId=${summary.messageId} to=${input.toEmail} accepted=${summary.accepted.join(";") || "(none)"} rejected=${
        summary.rejected.join(";") || "(none)"
      }`
    );
    return {
      ok: true,
      delivered: true,
      provider: "smtp",
      messageId: summary.messageId,
      accepted: summary.accepted,
      rejected: summary.rejected
    };
  } catch (error) {
    const smtpError = toSmtpErrorLog(error);
    // eslint-disable-next-line no-console
    console.error(
      `EMAIL_FAILED name=${smtpError.name} code=${smtpError.code} message=${smtpError.message} command=${
        smtpError.command || "(none)"
      } response=${smtpError.response || "(none)"}`
    );
    throw new EmailDeliveryError("SMTP_SEND_FAILED", smtpError.message, smtpError.code);
  }
};

export const sendSmtpTestEmail = async (input: {
  toEmail: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
}): Promise<ConfirmationDeliveryResult> => {
  if (process.env.NODE_ENV === "test") {
    return {
      ok: true,
      delivered: true,
      provider: "console",
      messageId: "test-message-id",
      accepted: [input.toEmail],
      rejected: []
    };
  }

  if (!input.smtpHost || !input.smtpPort || !input.smtpUser || !input.smtpPass) {
    throw new EmailDeliveryError("SMTP_NOT_CONFIGURED", "SMTP is not configured for test email sending.");
  }

  try {
    const effectiveFromEmail = resolveEffectiveFromEmail(input.fromEmail, input.smtpUser);
    const transport = createSmtpTransport({
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpSecure: input.smtpSecure,
      smtpUser: input.smtpUser,
      smtpPass: input.smtpPass
    });
    const info = await transport.sendMail({
      from: asFrom(input.fromName || "AutoHub", effectiveFromEmail),
      to: input.toEmail,
      replyTo: input.replyTo || effectiveFromEmail,
      subject: "SMTP test from AutoHub",
      text: "SMTP test successful.",
      html: "<p>SMTP test successful.</p>"
    });
    const summary = summarizeInfo(info);
    // eslint-disable-next-line no-console
    console.log(
      `SMTP_TEST_SENT messageId=${summary.messageId} to=${input.toEmail} accepted=${summary.accepted.join(";") || "(none)"} rejected=${
        summary.rejected.join(";") || "(none)"
      }`
    );
    return {
      ok: true,
      delivered: true,
      provider: "smtp",
      messageId: summary.messageId,
      accepted: summary.accepted,
      rejected: summary.rejected
    };
  } catch (error) {
    const smtpError = toSmtpErrorLog(error);
    // eslint-disable-next-line no-console
    console.error(
      `EMAIL_FAILED name=${smtpError.name} code=${smtpError.code} message=${smtpError.message} command=${
        smtpError.command || "(none)"
      } response=${smtpError.response || "(none)"}`
    );
    throw new EmailDeliveryError("SMTP_SEND_FAILED", smtpError.message, smtpError.code);
  }
};

export const sendAdminAlertEmail = async (input: {
  toEmail: string;
  subject: string;
  text: string;
  html?: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
}): Promise<ConfirmationDeliveryResult> => {
  if (process.env.NODE_ENV === "test") {
    return {
      ok: true,
      delivered: true,
      provider: "console",
      messageId: "test-message-id",
      accepted: [input.toEmail],
      rejected: []
    };
  }

  if (!input.smtpHost || !input.smtpPort || !input.smtpUser || !input.smtpPass) {
    throw new EmailDeliveryError("SMTP_NOT_CONFIGURED", "SMTP is not configured for admin alert email sending.");
  }

  try {
    const effectiveFromEmail = resolveEffectiveFromEmail(input.fromEmail, input.smtpUser);
    const transport = createSmtpTransport({
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpSecure: input.smtpSecure,
      smtpUser: input.smtpUser,
      smtpPass: input.smtpPass
    });
    const info = await transport.sendMail({
      from: asFrom(input.fromName || "AutoHub", effectiveFromEmail),
      to: input.toEmail,
      replyTo: input.replyTo || effectiveFromEmail,
      subject: input.subject,
      text: input.text,
      html: input.html
    });
    const summary = summarizeInfo(info);
    // eslint-disable-next-line no-console
    console.log(
      `ADMIN_ALERT_SENT messageId=${summary.messageId} to=${input.toEmail} accepted=${summary.accepted.join(";") || "(none)"} rejected=${
        summary.rejected.join(";") || "(none)"
      }`
    );
    return {
      ok: true,
      delivered: true,
      provider: "smtp",
      messageId: summary.messageId,
      accepted: summary.accepted,
      rejected: summary.rejected
    };
  } catch (error) {
    const smtpError = toSmtpErrorLog(error);
    // eslint-disable-next-line no-console
    console.error(
      `EMAIL_FAILED name=${smtpError.name} code=${smtpError.code} message=${smtpError.message} command=${
        smtpError.command || "(none)"
      } response=${smtpError.response || "(none)"}`
    );
    throw new EmailDeliveryError("SMTP_SEND_FAILED", smtpError.message, smtpError.code);
  }
};
