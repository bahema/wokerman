import { FormEvent, useEffect, useState } from "react";
import ModalShell from "./ModalShell";
import { apiJson } from "../api/client";
import { useI18n } from "../i18n/provider";

type QuickGrabsModalProps = {
  open: boolean;
  onClose: () => void;
  returnFocusTo: HTMLElement | null;
};

const QuickGrabsModal = ({ open, onClose, returnFocusTo }: QuickGrabsModalProps) => {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [alreadySubscribedInfo, setAlreadySubscribedInfo] = useState("");

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setSubmitting(false);
    setSubmitError("");
    setAlreadySubscribedInfo("");
    setName("");
    setEmail("");
    setContact("");
  }, [open]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    setAlreadySubscribedInfo("");
    try {
      await apiJson<{ ok: boolean; subscriberId: string; status: string; delivery?: "sent" | "queued"; messageId?: string }>(
        "/api/email/subscribe",
        "POST",
        {
        name,
        email,
        phone: contact
        }
      );
      setSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("quickGrabs.failedSubscribe");
      if (/already subscribed|already_subscribed/i.test(message)) {
        setAlreadySubscribedInfo(t("quickGrabs.alreadySubscribed"));
      } else if (/confirmation_send_failed|couldn.?t send the confirmation email|smtp/i.test(message)) {
        setSubmitError(t("quickGrabs.couldNotSend"));
      } else {
        setSubmitError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      returnFocusTo={returnFocusTo}
      labelledBy="quick-grabs-title"
      title={t("quickGrabs.title")}
      closeAriaLabel={t("quickGrabs.closeAria")}
      maxWidthClassName="max-w-xl"
    >
      {!submitted ? (
        <>
          <p className="mb-5 text-sm text-slate-300">{t("quickGrabs.intro")}</p>
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm font-medium text-slate-200">
              {t("quickGrabs.nameLabel")} <span className="text-red-400">*</span>
              <input
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 h-11 min-w-0 w-full max-w-full rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-white outline-none ring-blue-500 transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-2"
                placeholder={t("quickGrabs.namePlaceholder")}
              />
            </label>

            <label className="block text-sm font-medium text-slate-200">
              {t("quickGrabs.emailLabel")} <span className="text-red-400">*</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 h-11 min-w-0 w-full max-w-full rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-white outline-none ring-blue-500 transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-2"
                placeholder={t("quickGrabs.emailPlaceholder")}
              />
            </label>

            <label className="block text-sm font-medium text-slate-200">
              {t("quickGrabs.contactLabel")} <span className="text-xs font-normal text-slate-400">({t("quickGrabs.optional")})</span>
              <input
                type="text"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                className="mt-1 h-11 min-w-0 w-full max-w-full rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-white outline-none ring-blue-500 transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-2"
                placeholder={t("quickGrabs.contactPlaceholder")}
              />
            </label>

            <div className="pt-1">
              {alreadySubscribedInfo ? (
                <p className="mb-2 rounded-lg border border-blue-700 bg-blue-950/40 px-3 py-2 text-sm text-blue-200">{alreadySubscribedInfo}</p>
              ) : null}
              {submitError ? <p className="mb-2 text-sm text-rose-300">{submitError}</p> : null}
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 inline-flex w-fit max-w-full justify-center rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                {submitting ? t("quickGrabs.subscribing") : t("quickGrabs.subscribe")}
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4">
          <p className="text-sm font-semibold text-emerald-300">{t("quickGrabs.subscriptionReceived")}</p>
          <p className="mt-2 text-sm text-emerald-300">{t("quickGrabs.checkInbox")}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 inline-flex w-fit max-w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
          >
            {t("quickGrabs.close")}
          </button>
        </div>
      )}
    </ModalShell>
  );
};

export default QuickGrabsModal;
