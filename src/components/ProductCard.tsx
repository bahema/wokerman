import { useEffect, useState } from "react";
import type { Product } from "../data/siteData";

type ProductCardProps = {
  product: Product;
  onCheckout: (product: Product, trigger: HTMLButtonElement) => void;
  onMoreInfo: (product: Product, trigger: HTMLButtonElement) => void;
};

const gradientByCategory: Record<Product["category"], string> = {
  Forex: "from-cyan-500 via-blue-600 to-indigo-700",
  Betting: "from-emerald-500 via-green-600 to-teal-700",
  Software: "from-violet-500 via-fuchsia-600 to-pink-700",
  Social: "from-orange-500 via-rose-600 to-red-700"
};

const ProductCard = ({ product, onCheckout, onMoreInfo }: ProductCardProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const roundedRating = Math.round(product.rating);
  const trustLabel = product.isNew ? "New release" : `${product.features.length} key features`;

  useEffect(() => {
    setImageFailed(false);
  }, [product.imageUrl, product.id]);

  return (
    <article className="group relative z-0 flex h-full min-w-0 w-full max-w-[380px] justify-self-center flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_18px_32px_-20px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_-20px_rgba(37,99,235,0.35)] dark:border-transparent dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_22px_48px_-24px_rgba(2,6,23,0.95),0_0_0_1px_rgba(30,41,59,0.35)] dark:hover:shadow-[0_30px_56px_-24px_rgba(2,6,23,0.98),0_0_0_1px_rgba(59,130,246,0.35)]">
      <div className={`relative h-[190px] overflow-hidden rounded-t-2xl bg-gradient-to-br sm:h-[220px] ${gradientByCategory[product.category]}`}>
        {product.imageUrl && !imageFailed ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        <div className="absolute left-3 top-3 flex gap-2">
          {product.isNew && (
            <span className="rounded-full bg-white/95 px-2 py-0.5 text-xs font-bold text-blue-700">NEW</span>
          )}
          <span className="rounded-full bg-black/40 px-2 py-0.5 text-xs font-semibold text-white">{product.category}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="min-w-0 break-words text-lg font-bold text-slate-900 dark:text-slate-50">{product.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-slate-700 dark:text-slate-200">{product.shortDescription}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1 text-amber-500" aria-label={`Rated ${product.rating} out of 5`}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <span key={`${product.id}-star-${idx}`} className={`text-base leading-none ${idx < roundedRating ? "" : "text-slate-400"}`}>
                ★
              </span>
            ))}
            <span className="ml-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{product.rating.toFixed(1)}</span>
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-300">{trustLabel}</span>
        </div>
      </div>
      <div className="mt-auto grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={(event) => onCheckout(product, event.currentTarget)}
          className="h-10 w-full rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-3 text-sm font-semibold text-white transition hover:brightness-110 dark:bg-none dark:bg-blue-600 dark:hover:bg-blue-500 dark:hover:brightness-100"
        >
          Proceed to Checkout
        </button>
        <button
          type="button"
          onClick={(event) => onMoreInfo(product, event.currentTarget)}
          className="h-10 w-full rounded-xl border-2 border-slate-400 bg-slate-50 px-3 text-sm font-semibold text-slate-800 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)] transition hover:bg-slate-100 dark:border-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          Get More Info
        </button>
      </div>
      <p className="px-4 pb-4 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
        Affiliate disclosure: we may earn a commission if you buy through this link, at no extra cost to you.
      </p>
    </article>
  );
};

export default ProductCard;
