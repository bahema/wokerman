import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Product } from "../data/siteData";
import { acquireBodyScrollLock } from "../utils/scrollLock";
import { useI18n } from "../i18n/provider";

type ProductModalProps = {
  product: Product | null;
  onClose: () => void;
  returnFocusTo: HTMLElement | null;
};

const ProductModal = ({ product, onClose, returnFocusTo }: ProductModalProps) => {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const supportsBackdropBlur =
    typeof CSS !== "undefined" &&
    (CSS.supports("backdrop-filter", "blur(10px)") || CSS.supports("-webkit-backdrop-filter", "blur(10px)"));

  useEffect(() => {
    if (!product) return;
    panelRef.current?.focus();
  }, [product]);

  useEffect(() => {
    setImageFailed(false);
  }, [product?.imageUrl, product?.id]);

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

  useEffect(() => {
    if (!product) return;
    return acquireBodyScrollLock();
  }, [product]);

  if (!product) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]"
      style={{
        background: supportsBackdropBlur
          ? "radial-gradient(circle at top, rgba(0,0,0,0.22), rgba(0,0,0,0.40))"
          : "rgba(0,0,0,0.55)",
        backdropFilter: supportsBackdropBlur ? "blur(12px)" : undefined,
        WebkitBackdropFilter: supportsBackdropBlur ? "blur(12px)" : undefined
      }}
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
        aria-labelledby="product-modal-title"
        className="flex max-h-[calc(100dvh-32px)] w-[min(420px,92vw)] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,24,39,0.92)] text-white shadow-[0_20px_70px_rgba(0,0,0,0.55)] outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex flex-none items-start justify-between gap-4 border-b border-white/10 bg-[rgba(17,24,39,0.92)] px-4 py-3">
          <h3 id="product-modal-title" className="min-w-0 break-words text-xl font-bold text-white">
            {product.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10"
            aria-label={t("productModal.closeAria")}
          >
            ✕
          </button>
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [overflow-wrap:anywhere] [word-break:break-word] [-webkit-overflow-scrolling:touch]">
          <p className="mb-4 break-words text-sm text-slate-200">{product.longDescription}</p>
          {product.imageUrl && !imageFailed ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="mb-4 h-40 w-full rounded-xl object-cover object-center sm:h-56"
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          ) : null}
          <ul className="space-y-2">
            {product.features.map((feature, index) => (
              <li key={`${product.id}-feature-${index}-${feature}`} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProductModal;
