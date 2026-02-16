import { useEffect, useRef } from "react";
import type { Product } from "../data/siteData";

type CheckoutModalProps = {
  product: Product | null;
  onClose: () => void;
  returnFocusTo: HTMLElement | null;
};

const CheckoutModal = ({ product, onClose, returnFocusTo }: CheckoutModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!product) return;
    panelRef.current?.focus();
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, product]);

  useEffect(() => {
    if (product) return;
    returnFocusTo?.focus();
  }, [product, returnFocusTo]);

  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4"
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
        aria-labelledby="checkout-modal-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl outline-none dark:border-slate-700 dark:bg-slate-900"
      >
        <h3 id="checkout-modal-title" className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
          Proceed to Checkout
        </h3>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
          Confirm checkout for <span className="font-semibold">{product.title}</span>.
        </p>
        <div className="flex gap-2">
          <a
            href={product.checkoutLink}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            onClick={onClose}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Continue
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
