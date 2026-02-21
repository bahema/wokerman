import { FormEvent, useMemo, useState } from "react";
import { apiJson } from "../api/client";
import { useI18n } from "../i18n/provider";

type StatusMode = "success" | "error" | "loading";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const UnsubscribeResultPage = () => {
  const { t } = useI18n();
  const params = new URLSearchParams(window.location.search);
  const statusParam = (params.get("status") || "").toLowerCase();
  const mode: StatusMode = statusParam === "success" ? "success" : statusParam === "error" ? "error" : "loading";

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [alreadySubscribedInfo, setAlreadySubscribedInfo] = useState("");
  const [submitDone, setSubmitDone] = useState(false);

  const copy = useMemo(() => {
    if (mode === "success") {
      return {
        icon: "✅",
        title: t("unsubscribe.successTitle"),
        body: t("unsubscribe.successBody"),
        next: t("unsubscribe.successNext")
      };
    }
    if (mode === "error") {
      return {
        icon: "⚠️",
        title: t("unsubscribe.errorTitle"),
        body: t("unsubscribe.errorBody"),
        next: t("unsubscribe.errorNext")
      };
    }
    return {
      icon: "⏳",
      title: t("unsubscribe.loadingTitle"),
      body: t("unsubscribe.loadingBody"),
      next: t("unsubscribe.loadingNext")
    };
  }, [mode, t]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setSubmitError(t("unsubscribe.invalidEmail"));
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    setAlreadySubscribedInfo("");
    setSubmitDone(false);
    try {
      await apiJson<{ ok: boolean; subscriberId: string; status: string; delivery?: "sent" | "queued"; messageId?: string }>(
        "/api/email/subscribe",
        "POST",
        { name: "Subscriber", email: normalizedEmail, source: "unsubscribe-page" }
      );
      setSubmitDone(true);
      setEmail(normalizedEmail);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("unsubscribe.failedSubscribe");
      if (/already subscribed|already_subscribed/i.test(message)) {
        setAlreadySubscribedInfo(t("unsubscribe.alreadySubscribed"));
      } else if (/confirmation_send_failed|couldn.?t send the confirmation email|smtp/i.test(message)) {
        setSubmitError(t("unsubscribe.couldNotSend"));
      } else {
        setSubmitError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl" aria-hidden="true">
            {copy.icon}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{copy.body}</p>
          <p className="mt-3 text-xs font-medium text-slate-500">{copy.next}</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">{t("unsubscribe.resubscribeTitle")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("unsubscribe.resubscribeBody")}</p>

          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              {t("unsubscribe.emailLabel")}
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("unsubscribe.emailPlaceholder")}
                className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-blue-500 transition focus:border-blue-400 focus:ring-2"
              />
            </label>

            {submitError ? <p className="text-sm text-rose-600">{submitError}</p> : null}
            {alreadySubscribedInfo ? <p className="text-sm text-blue-700">{alreadySubscribedInfo}</p> : null}
            {submitDone ? <p className="text-sm font-medium text-emerald-700">{t("unsubscribe.doneCheckInbox")}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t("unsubscribe.sending") : t("unsubscribe.sendConfirmation")}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default UnsubscribeResultPage;
