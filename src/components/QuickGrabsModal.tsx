import { FormEvent, useEffect, useState } from "react";
import ModalShell from "./ModalShell";
import { apiJson } from "../api/client";

type QuickGrabsModalProps = {
  open: boolean;
  onClose: () => void;
  returnFocusTo: HTMLElement | null;
};

const QuickGrabsModal = ({ open, onClose, returnFocusTo }: QuickGrabsModalProps) => {
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
      await apiJson<{ ok: boolean; subscriberId: string; status: string }>(
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
      const message = error instanceof Error ? error.message : "Failed to subscribe. Please try again.";
      if (/already subscribed|already_subscribed/i.test(message)) {
        setAlreadySubscribedInfo("This email is already subscribed. Check your inbox for past emails, or use unsubscribe if you want to stop emails.");
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
      title="Quick Grabs"
      closeAriaLabel="Close quick grabs modal"
      maxWidthClassName="max-w-xl"
    >
      {!submitted ? (
        <>
          <p className="mb-5 text-sm text-slate-300">Subscribe to receive quick releases and fresh updates.</p>
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm font-medium text-slate-200">
              Name <span className="text-red-400">*</span>
              <input
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 h-11 min-w-0 w-full max-w-full rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-white outline-none ring-blue-500 transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-2"
                placeholder="Enter your name"
              />
            </label>

            <label className="block text-sm font-medium text-slate-200">
              Email <span className="text-red-400">*</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 h-11 min-w-0 w-full max-w-full rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-white outline-none ring-blue-500 transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-2"
                placeholder="you@example.com"
              />
            </label>

            <label className="block text-sm font-medium text-slate-200">
              Contact <span className="text-xs font-normal text-slate-400">(optional)</span>
              <input
                type="text"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                className="mt-1 h-11 min-w-0 w-full max-w-full rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-white outline-none ring-blue-500 transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-2"
                placeholder="Phone or WhatsApp"
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
                className="mt-2 inline-flex w-full justify-center rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-500 sm:w-auto"
              >
                {submitting ? "Subscribing..." : "Subscribe"}
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4">
          <p className="text-sm font-semibold text-emerald-300">Subscription received.</p>
          <p className="mt-2 text-sm text-emerald-300">Check your inbox and use the confirmation email to complete your subscription.</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      )}
    </ModalShell>
  );
};

export default QuickGrabsModal;
