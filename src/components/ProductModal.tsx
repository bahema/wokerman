import { useEffect, useRef, useState } from "react";
import type { Product } from "../data/siteData";
import { acquireBodyScrollLock } from "../utils/scrollLock";

type ProductModalProps = {
  product: Product | null;
  onClose: () => void;
  returnFocusTo: HTMLElement | null;
};

const ProductModal = ({ product, onClose, returnFocusTo }: ProductModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [imageFailed, setImageFailed] = useState(false);

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

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/65 p-3 sm:flex sm:items-center sm:justify-center sm:p-4"
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
        className="my-4 w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl outline-none sm:my-8 sm:max-h-[88vh] sm:p-6 dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 id="product-modal-title" className="min-w-0 break-words text-xl font-bold text-slate-900 dark:text-white">
            {product.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Close details modal"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 break-words text-sm text-slate-600 dark:text-slate-300">{product.longDescription}</p>
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
            <li key={`${product.id}-feature-${index}-${feature}`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ProductModal;
