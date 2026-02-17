import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  returnFocusTo: HTMLElement | null;
  labelledBy: string;
  title: string;
  closeAriaLabel: string;
  children: ReactNode;
  maxWidthClassName?: string;
};

let lockCount = 0;
let lockedScrollY = 0;
let originalPosition = "";
let originalTop = "";
let originalLeft = "";
let originalRight = "";
let originalWidth = "";
let originalOverflow = "";

const lockBodyForModal = () => {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => {};
  }

  lockCount += 1;
  if (lockCount === 1) {
    const body = document.body;
    lockedScrollY = window.scrollY;
    originalPosition = body.style.position;
    originalTop = body.style.top;
    originalLeft = body.style.left;
    originalRight = body.style.right;
    originalWidth = body.style.width;
    originalOverflow = body.style.overflow;

    body.style.position = "fixed";
    body.style.top = `-${lockedScrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
  }

  let released = false;
  return () => {
    if (released || typeof document === "undefined") return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);

    if (lockCount === 0) {
      const body = document.body;
      body.style.position = originalPosition;
      body.style.top = originalTop;
      body.style.left = originalLeft;
      body.style.right = originalRight;
      body.style.width = originalWidth;
      body.style.overflow = originalOverflow;
      window.scrollTo(0, lockedScrollY);
    }
  };
};

const ModalShell = ({
  open,
  onClose,
  returnFocusTo,
  labelledBy,
  title,
  closeAriaLabel,
  children,
  maxWidthClassName = "max-w-md"
}: ModalShellProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

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
    return lockBodyForModal();
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[120]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label={closeAriaLabel}
      />

      <div className="relative z-[121] flex min-h-dvh items-center justify-center p-4">
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          className={`w-full min-w-0 ${maxWidthClassName} rounded-2xl border border-white/10 bg-slate-900/85 text-white shadow-xl outline-none`}
        >
          <div className="flex items-start justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
            <h3 id={labelledBy} className="min-w-0 break-words text-xl font-bold">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10"
              aria-label={closeAriaLabel}
            >
              ✕
            </button>
          </div>

          <div className="max-h-[85dvh] overflow-y-auto overscroll-contain px-4 pb-4 pt-3 sm:px-6 sm:pb-6">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ModalShell;
