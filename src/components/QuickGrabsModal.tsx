import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === first || active === panel) {
          event.preventDefault();
          last.focus();
        }
        return;
      }
      if (active === last) {
        event.preventDefault();
        first.focus();
      }
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
    const body = document.body;
    const scrollY = window.scrollY;
    const originalPosition = body.style.position;
    const originalTop = body.style.top;
    const originalLeft = body.style.left;
    const originalRight = body.style.right;
    const originalWidth = body.style.width;
    const originalOverflow = body.style.overflow;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = originalPosition;
      body.style.top = originalTop;
      body.style.left = originalLeft;
      body.style.right = originalRight;
      body.style.width = originalWidth;
      body.style.overflow = originalOverflow;
      window.scrollTo(0, scrollY);
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
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[120]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close quick grabs modal"
      />
      <div
        className="relative z-10 flex min-h-dvh items-center justify-center p-4"
      >
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-grabs-title"
          className="w-full max-w-xl min-w-0 max-h-[85dvh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/85 p-4 text-white shadow-xl outline-none sm:p-6"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <h3 id="quick-grabs-title" className="text-xl font-bold">
              Quick Grabs
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10"
              aria-label="Close quick grabs modal"
            >
              ✕
            </button>
          </div>

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
                  <button
                    type="submit"
                    className="mt-2 inline-flex w-full justify-center rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-500 sm:w-auto"
                  >
                    Subscribe
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4">
              <p className="text-sm font-semibold text-emerald-300">Subscription received.</p>
              <p className="mt-2 text-sm text-emerald-300">Please confirm your email to complete the process.</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default QuickGrabsModal;
