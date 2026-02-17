import { FormEvent, useEffect, useRef, useState } from "react";

type QuickGrabsModalProps = {
  open: boolean;
  onClose: () => void;
  returnFocusTo: HTMLElement | null;
};

const QuickGrabsModal = ({ open, onClose, returnFocusTo }: QuickGrabsModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (open) return;
    returnFocusTo?.focus();
  }, [open, returnFocusTo]);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setName("");
    setEmail("");
    setContact("");
  }, [open]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/70 p-3 sm:flex sm:items-center sm:justify-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-grabs-title"
        className="mx-auto my-4 w-full max-w-[calc(100vw-1.5rem)] min-w-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl outline-none sm:my-8 sm:max-w-lg sm:max-h-[88vh] sm:p-6 dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 id="quick-grabs-title" className="text-xl font-bold text-slate-900 dark:text-white">
            Quick Grabs
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Close quick grabs modal"
          >
            ✕
          </button>
        </div>

        {!submitted ? (
          <>
            <p className="mb-5 text-sm text-slate-600 dark:text-slate-300">
              Subscribe to receive quick releases and fresh updates.
            </p>
            <form className="space-y-4" onSubmit={onSubmit}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Name <span className="text-red-600">*</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 h-11 min-w-0 w-full max-w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none ring-blue-500 transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-300"
                  placeholder="Enter your name"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Email <span className="text-red-600">*</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 h-11 min-w-0 w-full max-w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none ring-blue-500 transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-300"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Contact <span className="text-xs font-normal text-slate-500">(optional)</span>
                <input
                  type="text"
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  className="mt-1 h-11 min-w-0 w-full max-w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none ring-blue-500 transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-300"
                  placeholder="Phone or WhatsApp"
                />
              </label>

              <div className="pt-1">
                <button
                  type="submit"
                  className="mt-2 inline-flex w-auto rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
                >
                  Subscribe
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Subscription received.</p>
            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
              Please confirm your email to complete the process.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickGrabsModal;
