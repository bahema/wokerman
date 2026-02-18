import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiJson } from "../../api/client";

type ComposerMode = "rich" | "html";
type SendMode = "now" | "schedule";
type CampaignStatus = "Draft" | "Scheduled" | "Sent";

const statusBadgeClass: Record<CampaignStatus, string> = {
  Draft: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  Sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
};

const segmentOptions = ["new", "active", "inactive", "geography", "tag"];
const unsubscribeTag = "{{unsubscribe_link}}";
const richUnsubscribeFooter = `\n\nUnsubscribe: ${unsubscribeTag}`;
const htmlUnsubscribeFooter = `<p style="margin-top:16px;font-size:12px;color:#64748b;">Unsubscribe: <a href="${unsubscribeTag}">${unsubscribeTag}</a></p>`;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toRichPreviewHtml = (value: string) => {
  if (!value.trim()) return "";
  const body = escapeHtml(value).replace(/\n/g, "<br/>");
  return `<div style="padding:24px;font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;">${body}</div>`;
};

const buildPreviewHtml = (rawHtml: string, previewMode: "mobile" | "desktop") => {
  const deviceWidth = previewMode === "mobile" ? 360 : 680;
  const safe = rawHtml.trim() || "<div style='padding:24px;font-family:Arial,sans-serif;color:#0f172a;'>Nothing to preview yet.</div>";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html, body { margin:0; padding:0; width:100%; height:auto; overflow-x:hidden; background:#0b1220; }
  * { box-sizing:border-box; }
  .frame { width:100%; display:flex; justify-content:center; padding:0; }
  .email { width:100%; max-width:${deviceWidth}px; background:transparent; margin:0 auto; }
  .email, .email * { max-width:100% !important; }
  table { max-width:100% !important; width:100% !important; table-layout:fixed; }
  img { max-width:100% !important; height:auto !important; }
  a { word-break:break-word; }
  p, td, div, span { overflow-wrap:anywhere; word-break:break-word; }
</style>
</head>
<body>
  <div class="frame">
    <div class="email">${safe}</div>
  </div>
</body>
</html>`;
};

type EmailTemplateResponse = {
  template: {
    id: "default";
    mode: ComposerMode;
    subject: string;
    previewText: string;
    bodyRich: string;
    bodyHtml: string;
    updatedAt: string;
  };
};

type PagedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

type SubscriberRecord = {
  id: string;
  email: string;
};

type CampaignListItem = {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  bodyMode: ComposerMode;
  bodyRich: string;
  bodyHtml: string;
  audienceMode: "all" | "segments";
  segments: string[];
  exclusions: string[];
  sendMode: SendMode;
  scheduleAt: string | null;
  timezone: string;
  status: "draft" | "scheduled" | "sent";
};

type CampaignResponse = {
  ok: boolean;
  campaign: {
    id: string;
    status: "draft" | "scheduled" | "sent";
  };
};

type TestCampaignResponse = {
  ok: boolean;
  queuedTo: string;
};

type SenderProfileResponse = {
  profile: {
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
    updatedAt: string;
  };
};

const EmailSenderEditor = () => {
  const [campaignName, setCampaignName] = useState("March Promo Wave");
  const [subject, setSubject] = useState("Hi {{first_name}}, your next edge is ready");
  const [previewText, setPreviewText] = useState("New tools, sharper workflows, better outcomes.");
  const [mode, setMode] = useState<ComposerMode>("rich");
  const [richBody, setRichBody] = useState("Hello {{first_name}},\n\nWe just published fresh tools tailored to your workflow.\n\n- Faster setup\n- Better analytics\n- Lower friction\n\nBest,\nAutoHub Team");
  const [htmlBody, setHtmlBody] = useState("<h2>Hello {{first_name}},</h2><p>We just published fresh tools tailored to your workflow.</p><ul><li>Faster setup</li><li>Better analytics</li><li>Lower friction</li></ul><p>Best,<br/>AutoHub Team</p>");
  const [audienceMode, setAudienceMode] = useState<"all" | "segments">("all");
  const [segments, setSegments] = useState<string[]>(["active"]);
  const [exclusionInput, setExclusionInput] = useState("");
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [sendMode, setSendMode] = useState<SendMode>("now");
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [timezone, setTimezone] = useState("UTC");
  const [bestTime, setBestTime] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [testEmail, setTestEmail] = useState("");
  const [fromName, setFromName] = useState("AutoHub Team");
  const [fromEmail, setFromEmail] = useState("support@example.com");
  const [replyTo, setReplyTo] = useState("support@example.com");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [includeUnsub, setIncludeUnsub] = useState(true);
  const [checks, setChecks] = useState({
    subjectSafe: true,
    addressIncluded: false,
    unsubscribeLink: true
  });
  const [complianceMessage, setComplianceMessage] = useState("");
  const [status, setStatus] = useState<CampaignStatus>("Draft");
  const [campaignId, setCampaignId] = useState<string>("");
  const [confirmAction, setConfirmAction] = useState<"schedule" | "send" | null>(null);
  const [confirmTemplateMode, setConfirmTemplateMode] = useState<ComposerMode>("rich");
  const [confirmTemplateSubject, setConfirmTemplateSubject] = useState("Confirm your subscription, {{first_name}}");
  const [confirmTemplatePreviewText, setConfirmTemplatePreviewText] = useState("Please verify your email to receive updates.");
  const [confirmTemplateRichBody, setConfirmTemplateRichBody] = useState(
    "Hi {{first_name}},\n\nThanks for subscribing. Please confirm your subscription by clicking the link below:\n\n{{confirm_subscription_link}}\n\nIf this was not you, you can ignore this email.\n\nUnsubscribe: {{unsubscribe_link}}"
  );
  const [confirmTemplateHtmlBody, setConfirmTemplateHtmlBody] = useState(
    "<h2>Hi {{first_name}},</h2><p>Thanks for subscribing. Please confirm your subscription by clicking the link below:</p><p><a href='{{confirm_subscription_link}}'>Confirm subscription</a></p><p>If this was not you, you can ignore this email.</p><p>Unsubscribe: <a href='{{unsubscribe_link}}'>{{unsubscribe_link}}</a></p>"
  );
  const [confirmTemplatePreviewDevice, setConfirmTemplatePreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [subscribersBaseTotal, setSubscribersBaseTotal] = useState(0);
  const [confirmedSubscribers, setConfirmedSubscribers] = useState<SubscriberRecord[]>([]);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isSavingCompliance, setIsSavingCompliance] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);

  const richRef = useRef<HTMLTextAreaElement>(null);
  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const confirmTemplateRichRef = useRef<HTMLTextAreaElement>(null);
  const confirmTemplateHtmlRef = useRef<HTMLTextAreaElement>(null);

  const goToLogin = () => {
    const next = encodeURIComponent(`${window.location.pathname}${window.location.search}${window.location.hash}`);
    window.history.replaceState({}, "", `/boss/login?next=${next}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const resolveErrorMessage = (error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : fallback;
    if (/unauthorized|login required/i.test(message)) {
      setAuthRequired(true);
      return "Admin login required.";
    }
    return message;
  };

  const complianceValidation = useMemo(() => {
    const fieldErrors: Partial<Record<"fromName" | "fromEmail" | "replyTo" | "smtpHost" | "smtpPort" | "smtpUser" | "smtpPass", string>> = {};
    const fromNameTrimmed = fromName.trim();
    const fromEmailTrimmed = fromEmail.trim();
    const replyToTrimmed = replyTo.trim();
    const smtpHostTrimmed = smtpHost.trim();
    const smtpUserTrimmed = smtpUser.trim();
    const smtpPassTrimmed = smtpPass.trim();
    const smtpPortNumber = Number(smtpPort);

    if (!fromNameTrimmed) fieldErrors.fromName = "From name is required.";
    if (!fromEmailTrimmed) {
      fieldErrors.fromEmail = "From email is required.";
    } else if (!emailPattern.test(fromEmailTrimmed)) {
      fieldErrors.fromEmail = "From email must be a valid email address.";
    }
    if (!replyToTrimmed) {
      fieldErrors.replyTo = "Reply-to is required.";
    } else if (!emailPattern.test(replyToTrimmed)) {
      fieldErrors.replyTo = "Reply-to must be a valid email address.";
    }
    if (!smtpHostTrimmed) fieldErrors.smtpHost = "SMTP host is required.";
    if (!Number.isFinite(smtpPortNumber) || smtpPortNumber < 1 || smtpPortNumber > 65535) {
      fieldErrors.smtpPort = "SMTP port must be between 1 and 65535.";
    }
    if (!smtpUserTrimmed) fieldErrors.smtpUser = "SMTP username is required.";
    if (!smtpPassTrimmed) fieldErrors.smtpPass = "SMTP password/app password is required.";

    return {
      fieldErrors,
      hasErrors: Object.keys(fieldErrors).length > 0
    };
  }, [fromEmail, fromName, replyTo, smtpHost, smtpPass, smtpPort, smtpUser]);

  const estimatedRecipients = useMemo(() => {
    if (!confirmedSubscribers.length) return 0;
    const exclusionSet = new Set(exclusions.map((item) => item.trim().toLowerCase()).filter(Boolean));
    const excludedCount = confirmedSubscribers.reduce((count, item) => (exclusionSet.has(item.email.toLowerCase()) ? count + 1 : count), 0);
    const base = Math.max(0, subscribersBaseTotal - excludedCount);
    return base;
  }, [confirmedSubscribers, exclusions, subscribersBaseTotal]);

  const previewRawHtml = useMemo(() => (mode === "html" ? htmlBody : toRichPreviewHtml(richBody)), [htmlBody, mode, richBody]);
  const previewDoc = useMemo(() => buildPreviewHtml(previewRawHtml, previewDevice), [previewDevice, previewRawHtml]);
  const previewIsEmpty = !previewRawHtml.trim();
  const previewHasInvalidHtml = mode === "html" && /<script[\s>]/i.test(htmlBody);

  const confirmTemplatePreviewRawHtml = useMemo(
    () => (confirmTemplateMode === "html" ? confirmTemplateHtmlBody : toRichPreviewHtml(confirmTemplateRichBody)),
    [confirmTemplateHtmlBody, confirmTemplateMode, confirmTemplateRichBody]
  );
  const confirmTemplatePreviewDoc = useMemo(
    () => buildPreviewHtml(confirmTemplatePreviewRawHtml, confirmTemplatePreviewDevice),
    [confirmTemplatePreviewDevice, confirmTemplatePreviewRawHtml]
  );

  const insertIntoField = (
    value: string,
    setter: (next: string) => void,
    input: HTMLInputElement | HTMLTextAreaElement | null,
    text: string
  ) => {
    if (!input) {
      setter(`${value}${text}`);
      return;
    }
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${text}${value.slice(end)}`;
    setter(next);
    window.setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const insertMergeTag = (tag: string) => {
    if (document.activeElement === subjectRef.current) {
      insertIntoField(subject, setSubject, subjectRef.current, tag);
      return;
    }
    if (mode === "html") {
      insertIntoField(htmlBody, setHtmlBody, htmlRef.current, tag);
      return;
    }
    insertIntoField(richBody, setRichBody, richRef.current, tag);
  };

  const toggleSegment = (segment: string) => {
    setSegments((prev) => (prev.includes(segment) ? prev.filter((s) => s !== segment) : [...prev, segment]));
  };

  const addExclusion = () => {
    const next = exclusionInput.trim();
    if (!next || exclusions.includes(next)) return;
    setExclusions((prev) => [...prev, next]);
    setExclusionInput("");
  };

  const onToolbarInsert = (snippet: string) => {
    if (mode === "html") {
      insertIntoField(htmlBody, setHtmlBody, htmlRef.current, snippet);
      return;
    }
    insertIntoField(richBody, setRichBody, richRef.current, snippet);
  };

  const ensureUnsubscribeInContent = () => {
    const nextRich = richBody.includes(unsubscribeTag) ? richBody : `${richBody}${richUnsubscribeFooter}`;
    const nextHtml = htmlBody.includes(unsubscribeTag) ? htmlBody : `${htmlBody}${htmlUnsubscribeFooter}`;
    if (nextRich !== richBody) setRichBody(nextRich);
    if (nextHtml !== htmlBody) setHtmlBody(nextHtml);
    if (!includeUnsub) setIncludeUnsub(true);
    if (!checks.unsubscribeLink) {
      setChecks((prev) => ({ ...prev, unsubscribeLink: true }));
    }
  };

  const buildScheduleAtIso = () => {
    if (sendMode !== "schedule") return null;
    if (!scheduleDate || !scheduleTime) return null;
    const localValue = `${scheduleDate}T${scheduleTime}:00`;
    const parsed = new Date(localValue);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  };

  const buildCampaignPayload = (target: "draft" | "scheduled" | "sent") => ({
    id: campaignId || undefined,
    name: campaignName,
    subject,
    previewText,
    bodyMode: mode,
    bodyRich: richBody,
    bodyHtml: htmlBody,
    audienceMode,
    segments,
    exclusions,
    sendMode: target === "scheduled" ? "schedule" : "now",
    scheduleAt: target === "scheduled" ? buildScheduleAtIso() : null,
    timezone,
    estimatedRecipients
  });

  const saveConfirmationTemplateToBackend = async () => {
    await apiJson<EmailTemplateResponse>("/api/email/templates/confirmation", "PUT", {
      mode: confirmTemplateMode,
      subject: confirmTemplateSubject,
      previewText: confirmTemplatePreviewText,
      bodyRich: confirmTemplateRichBody,
      bodyHtml: confirmTemplateHtmlBody
    });
  };

  const onSaveDraft = async () => {
    ensureUnsubscribeInContent();
    setActionError("");
    setActionMessage("");
    setIsSavingCampaign(true);
    try {
      const [campaignResp] = await Promise.all([
        apiJson<CampaignResponse>("/api/email/campaigns/draft", "POST", buildCampaignPayload("draft")),
        saveConfirmationTemplateToBackend()
      ]);
      setCampaignId(campaignResp.campaign.id);
      setStatus("Draft");
      setActionMessage("Draft saved.");
    } catch (error) {
      setActionError(resolveErrorMessage(error, "Failed to save draft."));
    } finally {
      setIsSavingCampaign(false);
    }
  };

  useEffect(() => {
    if (!includeUnsub) setIncludeUnsub(true);
    if (!checks.unsubscribeLink) {
      setChecks((prev) => ({ ...prev, unsubscribeLink: true }));
    }
  }, [checks.unsubscribeLink, includeUnsub]);

  useEffect(() => {
    let cancelled = false;
    const loadBackendData = async () => {
      try {
        const [confirmed, templateResp, recentCampaigns, senderProfileResp] = await Promise.all([
          apiGet<PagedResponse<SubscriberRecord>>("/api/email/subscribers?status=confirmed&page=1&pageSize=1000"),
          apiGet<EmailTemplateResponse>("/api/email/templates/confirmation"),
          apiGet<PagedResponse<CampaignListItem>>("/api/email/campaigns?page=1&pageSize=1"),
          apiGet<SenderProfileResponse>("/api/email/settings/sender-profile")
        ]);
        if (cancelled) return;
        setSubscribersBaseTotal(Math.max(0, confirmed.total));
        setConfirmedSubscribers(confirmed.items);
        const latest = recentCampaigns.items[0];
        if (latest) {
          setCampaignId(latest.id);
          setCampaignName(latest.name || campaignName);
          setSubject(latest.subject || subject);
          setPreviewText(latest.previewText || previewText);
          setMode(latest.bodyMode);
          setRichBody(latest.bodyRich || richBody);
          setHtmlBody(latest.bodyHtml || htmlBody);
          setAudienceMode(latest.audienceMode);
          setSegments(Array.isArray(latest.segments) ? latest.segments : []);
          setExclusions(Array.isArray(latest.exclusions) ? latest.exclusions : []);
          setSendMode(latest.sendMode);
          if (latest.scheduleAt) {
            const nextDate = new Date(latest.scheduleAt);
            if (!Number.isNaN(nextDate.getTime())) {
              setScheduleDate(nextDate.toISOString().slice(0, 10));
              setScheduleTime(nextDate.toISOString().slice(11, 16));
            }
          }
          setTimezone(latest.timezone || "UTC");
          setStatus(latest.status === "draft" ? "Draft" : latest.status === "scheduled" ? "Scheduled" : "Sent");
        }
        const template = templateResp.template;
        setConfirmTemplateMode(template.mode);
        setConfirmTemplateSubject(template.subject);
        setConfirmTemplatePreviewText(template.previewText);
        setConfirmTemplateRichBody(template.bodyRich);
        setConfirmTemplateHtmlBody(template.bodyHtml);
        const senderProfile = senderProfileResp.profile;
        setFromName(senderProfile.fromName);
        setFromEmail(senderProfile.fromEmail);
        setReplyTo(senderProfile.replyTo);
        setSmtpHost(senderProfile.smtpHost);
        setSmtpPort(String(senderProfile.smtpPort));
        setSmtpUser(senderProfile.smtpUser);
        setSmtpPass(senderProfile.smtpPass);
        setSmtpSecure(senderProfile.smtpSecure);
        setIncludeUnsub(senderProfile.includeUnsubscribeFooter);
        setChecks({
          subjectSafe: senderProfile.checks.subjectSafe,
          addressIncluded: senderProfile.checks.addressIncluded,
          unsubscribeLink: senderProfile.checks.unsubscribeLink
        });
      } catch (error) {
        if (cancelled) return;
        setActionError(resolveErrorMessage(error, "Failed to load email sender data."));
      }
    };
    void loadBackendData();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSaveCompliance = () => {
    void (async () => {
      if (complianceValidation.hasErrors) {
        setActionError("Fix compliance checklist errors before saving.");
        setComplianceMessage("");
        return;
      }
      setIsSavingCompliance(true);
      setActionError("");
      setActionMessage("");
      setComplianceMessage("");
      try {
        await apiJson<SenderProfileResponse>("/api/email/settings/sender-profile", "PUT", {
          fromName,
          fromEmail,
          replyTo,
          smtpHost,
          smtpPort: Number(smtpPort),
          smtpUser,
          smtpPass,
          smtpSecure,
          includeUnsubscribeFooter: true,
          checks
        });
        setComplianceMessage("Compliance checklist saved.");
        window.setTimeout(() => setComplianceMessage(""), 2000);
      } catch (error) {
        const message = resolveErrorMessage(error, "Failed to save compliance information.");
        setActionError(`Could not save Compliance Checklist: ${message}`);
      } finally {
        setIsSavingCompliance(false);
      }
    })();
  };

  const onSaveTemplate = async () => {
    setActionError("");
    setActionMessage("");
    setIsSavingTemplate(true);
    try {
      await saveConfirmationTemplateToBackend();
      setActionMessage("Confirmation template saved.");
    } catch (error) {
      setActionError(resolveErrorMessage(error, "Failed to save confirmation template."));
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const onConfirmCampaignAction = async () => {
    if (!confirmAction) return;
    ensureUnsubscribeInContent();
    setActionError("");
    setActionMessage("");
    setIsSavingCampaign(true);
    try {
      await saveConfirmationTemplateToBackend();
      if (confirmAction === "schedule") {
        const campaignResp = await apiJson<CampaignResponse>("/api/email/campaigns/schedule", "POST", buildCampaignPayload("scheduled"));
        setCampaignId(campaignResp.campaign.id);
        setStatus("Scheduled");
        setActionMessage("Campaign scheduled.");
      } else {
        const campaignResp = await apiJson<CampaignResponse>("/api/email/campaigns/send", "POST", buildCampaignPayload("sent"));
        setCampaignId(campaignResp.campaign.id);
        setStatus("Sent");
        setActionMessage("Campaign sent.");
      }
      setConfirmAction(null);
    } catch (error) {
      setActionError(resolveErrorMessage(error, "Failed to process campaign action."));
    } finally {
      setIsSavingCampaign(false);
    }
  };

  if (authRequired) {
    return (
      <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/30">
        <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Admin login required.</p>
        <button
          type="button"
          onClick={goToLogin}
          className="mt-3 rounded-lg border border-rose-300 px-3 py-1.5 text-sm text-rose-700 dark:border-rose-700 dark:text-rose-300"
        >
          Go to login
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        {(["Draft", "Scheduled", "Sent"] as CampaignStatus[]).map((item) => (
          <span
            key={item}
            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass[item]} ${status === item ? "ring-2 ring-blue-400/60" : ""}`}
          >
            {item}
          </span>
        ))}
      </div>
      {actionError ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
          {actionError}
        </div>
      ) : null}
      {!actionError && actionMessage ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
          {actionMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
            <h3 className="mb-3 text-lg font-bold">Composer</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block font-medium">Campaign name</span>
                <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950" />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block font-medium">Subject</span>
                <input ref={subjectRef} value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950" />
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  Fully editable. Put <code>{"{{first_name}}"}</code> anywhere to personalize per recipient.
                </span>
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block font-medium">Preview text</span>
                <input value={previewText} onChange={(e) => setPreviewText(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950" />
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMode("rich")} className={`rounded-lg px-3 py-1.5 text-sm ${mode === "rich" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>
                    Rich Text
                  </button>
                  <button type="button" onClick={() => setMode("html")} className={`rounded-lg px-3 py-1.5 text-sm ${mode === "html" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>
                    HTML
                  </button>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!navigator.clipboard?.readText) return;
                    const text = await navigator.clipboard.readText();
                    if (text.trim()) {
                      setMode("html");
                      setHtmlBody(text);
                    }
                  }}
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-600"
                >
                  Paste HTML
                </button>
              </div>

              <div className="mb-2 flex flex-wrap gap-2">
                {[
                  { id: "bold", label: "Bold", value: "**bold**" },
                  { id: "italic", label: "Italic", value: "_italic_" },
                  { id: "link", label: "Link", value: "[title](https://example.com)" },
                  { id: "bullet", label: "Bullets", value: "\n- item one\n- item two\n" }
                ].map((tool) => (
                  <button key={tool.id} type="button" onClick={() => onToolbarInsert(tool.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-600">
                    {tool.label}
                  </button>
                ))}
              </div>

              {mode === "rich" ? (
                <textarea ref={richRef} value={richBody} onChange={(e) => setRichBody(e.target.value)} rows={12} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950" />
              ) : (
                <textarea ref={htmlRef} value={htmlBody} onChange={(e) => setHtmlBody(e.target.value)} rows={12} className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs dark:border-slate-600 dark:bg-slate-950" />
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
            <h3 className="mb-3 text-lg font-bold">Audience Builder</h3>
            <div className="space-y-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={audienceMode === "all"} onChange={() => setAudienceMode("all")} />
                All subscribers
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={audienceMode === "segments"} onChange={() => setAudienceMode("segments")} />
                Segments
              </label>
              <div className="flex flex-wrap gap-2">
                {segmentOptions.map((segment) => (
                  <button key={segment} type="button" onClick={() => toggleSegment(segment)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${segments.includes(segment) ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-300" : "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"}`}>
                    {segment}
                  </button>
                ))}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Exclusions</p>
                <div className="flex gap-2">
                  <input value={exclusionInput} onChange={(e) => setExclusionInput(e.target.value)} placeholder="Add exclusion tag" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950" />
                  <button type="button" onClick={addExclusion} className="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-600">
                    Add
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {exclusions.map((item) => (
                    <span key={item} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
                      {item}
                      <button type="button" onClick={() => setExclusions((prev) => prev.filter((v) => v !== item))} className="text-slate-500">
                        x
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                Estimated recipients: <span className="font-bold">{estimatedRecipients.toLocaleString()}</span>
                <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">(confirmed subscribers: {subscribersBaseTotal.toLocaleString()})</span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
            <h3 className="mb-3 text-lg font-bold">Send Settings</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="mb-2 text-sm font-medium">Delivery mode</p>
                <label className="mr-4 inline-flex items-center gap-2 text-sm">
                  <input type="radio" checked={sendMode === "now"} onChange={() => setSendMode("now")} />
                  Send now
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="radio" checked={sendMode === "schedule"} onChange={() => setSendMode("schedule")} />
                  Schedule
                </label>
              </div>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Timezone</span>
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950">
                  {["UTC", "America/New_York", "Europe/London", "Asia/Dubai"].map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </label>
              {sendMode === "schedule" ? (
                <>
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">Schedule date</span>
                    <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950" />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-medium">Schedule time</span>
                    <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950" />
                  </label>
                </>
              ) : null}
              <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" checked={bestTime} onChange={(e) => setBestTime(e.target.checked)} />
                Best time optimization
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold">Personalization</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">Estimated recipients: {estimatedRecipients.toLocaleString()}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {["{{first_name}}", "{{email}}", "{{unsubscribe_link}}"].map((tag) => (
                <button key={tag} type="button" onClick={() => insertMergeTag(tag)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-600">
                  {tag}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">Preview</h3>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPreviewDevice("desktop")} className={`rounded-lg px-3 py-1.5 text-xs ${previewDevice === "desktop" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>
                  Desktop
                </button>
                <button type="button" onClick={() => setPreviewDevice("mobile")} className={`rounded-lg px-3 py-1.5 text-xs ${previewDevice === "mobile" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>
                  Mobile
                </button>
              </div>
            </div>
            {previewHasInvalidHtml ? (
              <div className="mb-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
                Invalid HTML preview content. Please remove unsupported tags/scripts.
              </div>
            ) : null}
            <div className="rounded-2xl border border-slate-200/70 bg-slate-900/40 p-3 dark:border-slate-700/80">
              <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/20">
                <div className="scrollbar-none h-[70dvh] max-h-[70dvh] overflow-auto">
                  <div className="border-b border-slate-700/60 bg-slate-900/80 p-3 text-xs text-slate-200">
                    <p className="font-semibold">{subject || "(No subject yet)"}</p>
                    <p className="text-slate-400">{previewText || "(No preview text yet)"}</p>
                  </div>
                  {previewIsEmpty ? (
                    <div className="p-5 text-sm text-slate-300">Nothing to preview yet.</div>
                  ) : (
                    <iframe title="Email preview" sandbox="" srcDoc={previewDoc} className="block h-[70dvh] max-h-[70dvh] w-full border-0" />
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="Send test to email" className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950" />
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    const email = testEmail.trim();
                    if (!email) {
                      setActionError("Enter a test email address first.");
                      return;
                    }
                    setActionError("");
                    setActionMessage("");
                    try {
                      const preparedRich = richBody.includes(unsubscribeTag) ? richBody : `${richBody}${richUnsubscribeFooter}`;
                      const preparedHtml = htmlBody.includes(unsubscribeTag) ? htmlBody : `${htmlBody}${htmlUnsubscribeFooter}`;
                      if (preparedRich !== richBody) setRichBody(preparedRich);
                      if (preparedHtml !== htmlBody) setHtmlBody(preparedHtml);
                      await apiJson<TestCampaignResponse>("/api/email/campaigns/test", "POST", {
                        email,
                        subject,
                        bodyMode: mode,
                        bodyRich: preparedRich,
                        bodyHtml: preparedHtml
                      });
                      setActionMessage(`Test email queued to ${email}.`);
                    } catch (error) {
                      setActionError(resolveErrorMessage(error, "Failed to send test email."));
                    }
                  })();
                }}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-100"
              >
                Send test
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
            <h3 className="mb-3 text-lg font-bold">Compliance Checklist</h3>
            <div className="space-y-3 text-sm">
              <label>
                <span className="mb-1 block font-medium">From name</span>
                <input value={fromName} onChange={(e) => setFromName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950" />
                {complianceValidation.fieldErrors.fromName ? <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{complianceValidation.fieldErrors.fromName}</span> : null}
              </label>
              <label>
                <span className="mb-1 block font-medium">From email</span>
                <input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950" />
                {complianceValidation.fieldErrors.fromEmail ? <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{complianceValidation.fieldErrors.fromEmail}</span> : null}
              </label>
              <label>
                <span className="mb-1 block font-medium">Reply-to</span>
                <input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950" />
                {complianceValidation.fieldErrors.replyTo ? <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{complianceValidation.fieldErrors.replyTo}</span> : null}
              </label>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">SMTP Settings</p>
                <div className="space-y-3">
                  <label>
                    <span className="mb-1 block font-medium">SMTP Host</span>
                    <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950" />
                    {complianceValidation.fieldErrors.smtpHost ? <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{complianceValidation.fieldErrors.smtpHost}</span> : null}
                  </label>
                  <label>
                    <span className="mb-1 block font-medium">SMTP Port</span>
                    <input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value.replace(/[^\d]/g, ""))} placeholder="587" className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950" />
                    {complianceValidation.fieldErrors.smtpPort ? <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{complianceValidation.fieldErrors.smtpPort}</span> : null}
                  </label>
                  <label>
                    <span className="mb-1 block font-medium">SMTP Username</span>
                    <input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="your@gmail.com" className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950" />
                    {complianceValidation.fieldErrors.smtpUser ? <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{complianceValidation.fieldErrors.smtpUser}</span> : null}
                  </label>
                  <label>
                    <span className="mb-1 block font-medium">SMTP Password / App Password</span>
                    <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="Google app password" className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950" />
                    {complianceValidation.fieldErrors.smtpPass ? <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{complianceValidation.fieldErrors.smtpPass}</span> : null}
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)} />
                    Use secure SMTP (SSL/TLS, usually port 465)
                  </label>
                </div>
              </div>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={includeUnsub} onChange={() => setIncludeUnsub(true)} />
                Include unsubscribe footer (required)
              </label>
              <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={checks.subjectSafe} onChange={(e) => setChecks((prev) => ({ ...prev, subjectSafe: e.target.checked }))} />
                  Subject not misleading
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={checks.addressIncluded} onChange={(e) => setChecks((prev) => ({ ...prev, addressIncluded: e.target.checked }))} />
                  Includes physical address (placeholder)
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={checks.unsubscribeLink} onChange={() => setChecks((prev) => ({ ...prev, unsubscribeLink: true }))} />
                  Includes unsubscribe link (required)
                </label>
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onSaveCompliance}
                  disabled={isSavingCompliance || complianceValidation.hasErrors}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100"
                >
                  {isSavingCompliance ? "Saving..." : "Save information"}
                </button>
                {complianceMessage ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-300">{complianceMessage}</span> : null}
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="sticky bottom-3 z-20 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-md backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/95">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={() => void onSaveDraft()} disabled={isSavingCampaign} className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-60 dark:border-slate-600">
            {isSavingCampaign ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={() => {
              ensureUnsubscribeInContent();
              setConfirmAction("schedule");
            }}
            disabled={isSavingCampaign}
            className="rounded-xl border border-blue-300 px-4 py-2 text-sm text-blue-700 disabled:opacity-60 dark:border-blue-700 dark:text-blue-300"
          >
            Schedule
          </button>
          <button
            type="button"
            onClick={() => {
              ensureUnsubscribeInContent();
              setConfirmAction("send");
            }}
            disabled={isSavingCampaign}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Send Campaign
          </button>
        </div>
      </div>

      {confirmAction ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4" role="presentation">
          <button type="button" className="absolute inset-0 bg-black/45" onClick={() => setConfirmAction(null)} aria-label="Close confirmation" />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h4 className="text-lg font-bold">{confirmAction === "schedule" ? "Confirm schedule" : "Confirm send"}</h4>
            <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <p>Audience: {estimatedRecipients.toLocaleString()} recipients</p>
              <p>Subject: {subject || "(No subject)"}</p>
              <p>Time: {sendMode === "schedule" ? `${scheduleDate} ${scheduleTime} (${timezone})` : "Send now"}</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmAction(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600">
                Close
              </button>
              <button type="button" onClick={() => void onConfirmCampaignAction()} disabled={isSavingCampaign} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60">
                {isSavingCampaign ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold">Subscriber Confirmation Email (Auto-send)</h3>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              Editable template
            </span>
            <button
              type="button"
              onClick={() => void onSaveTemplate()}
              disabled={isSavingTemplate}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200"
            >
              {isSavingTemplate ? "Saving..." : "Save Template"}
            </button>
          </div>
        </div>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          This email is sent automatically when someone subscribes. Edit and preview it here.
        </p>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Subject</span>
              <input
                value={confirmTemplateSubject}
                onChange={(e) => setConfirmTemplateSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
              />
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                You can change this subject freely. Merge tags like <code>{"{{first_name}}"}</code> are replaced automatically.
              </span>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Preview text</span>
              <input
                value={confirmTemplatePreviewText}
                onChange={(e) => setConfirmTemplatePreviewText(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
              />
            </label>

            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmTemplateMode("rich")}
                  className={`rounded-lg px-3 py-1.5 text-sm ${confirmTemplateMode === "rich" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}
                >
                  Rich Text
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmTemplateMode("html")}
                  className={`rounded-lg px-3 py-1.5 text-sm ${confirmTemplateMode === "html" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}
                >
                  HTML
                </button>
              </div>
              <div className="mb-2 flex flex-wrap gap-2">
                {["{{first_name}}", "{{email}}", "{{confirm_subscription_link}}", "{{unsubscribe_link}}"].map((tag) => (
                  <button
                    key={`confirm-template-${tag}`}
                    type="button"
                    onClick={() => {
                      if (confirmTemplateMode === "html") {
                        insertIntoField(confirmTemplateHtmlBody, setConfirmTemplateHtmlBody, confirmTemplateHtmlRef.current, tag);
                        return;
                      }
                      insertIntoField(confirmTemplateRichBody, setConfirmTemplateRichBody, confirmTemplateRichRef.current, tag);
                    }}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-600"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {confirmTemplateMode === "rich" ? (
                <textarea
                  ref={confirmTemplateRichRef}
                  value={confirmTemplateRichBody}
                  onChange={(e) => setConfirmTemplateRichBody(e.target.value)}
                  rows={11}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                />
              ) : (
                <textarea
                  ref={confirmTemplateHtmlRef}
                  value={confirmTemplateHtmlBody}
                  onChange={(e) => setConfirmTemplateHtmlBody(e.target.value)}
                  rows={11}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs dark:border-slate-600 dark:bg-slate-950"
                />
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold">Confirmation Email Preview</h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmTemplatePreviewDevice("desktop")}
                  className={`rounded-lg px-3 py-1.5 text-xs ${confirmTemplatePreviewDevice === "desktop" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmTemplatePreviewDevice("mobile")}
                  className={`rounded-lg px-3 py-1.5 text-xs ${confirmTemplatePreviewDevice === "mobile" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}
                >
                  Mobile
                </button>
              </div>
            </div>
            <div className={`mx-auto overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 ${confirmTemplatePreviewDevice === "mobile" ? "max-w-[360px]" : "max-w-full"}`}>
              <div className="border-b border-slate-200 p-3 text-xs dark:border-slate-700">
                <p className="font-semibold">{confirmTemplateSubject || "(No subject yet)"}</p>
                <p className="text-slate-500 dark:text-slate-400">{confirmTemplatePreviewText || "(No preview text yet)"}</p>
              </div>
              <div className="scrollbar-none h-[70dvh] max-h-[70dvh] overflow-auto">
                <iframe title="Subscriber confirmation preview" sandbox="" srcDoc={confirmTemplatePreviewDoc} className="block h-[70dvh] max-h-[70dvh] w-full border-0" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EmailSenderEditor;
