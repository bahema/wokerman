import { useEffect, useState } from "react";
import type { Product } from "../data/siteData";

type ProductCardProps = {
  product: Product;
  onCheckout: (product: Product, trigger: HTMLButtonElement) => void;
  onMoreInfo: (product: Product, trigger: HTMLButtonElement) => void;
  labels?: {
    newBadgeLabel: string;
    newReleaseLabel: string;
    keyFeaturesSuffix: string;
    checkoutLabel: string;
    moreInfoLabel: string;
    affiliateDisclosure: string;
  };
};

const gradientByCategory: Record<Product["category"], string> = {
  Forex: "from-cyan-500 via-blue-600 to-indigo-700",
  Betting: "from-emerald-500 via-green-600 to-teal-700",
  Software: "from-violet-500 via-fuchsia-600 to-pink-700",
  Social: "from-orange-500 via-rose-600 to-red-700"
};

const priceBadgeClassByCategory: Record<Product["category"], string> = {
  Forex:
    "border-cyan-500/20 bg-cyan-600 text-white dark:border-cyan-400/40 dark:bg-cyan-500 dark:text-white",
  Betting:
    "border-emerald-500/20 bg-emerald-600 text-white dark:border-emerald-400/40 dark:bg-emerald-500 dark:text-white",
  Software:
    "border-violet-500/20 bg-violet-600 text-white dark:border-violet-400/40 dark:bg-violet-500 dark:text-white",
  Social:
    "border-rose-500/20 bg-rose-600 text-white dark:border-rose-400/40 dark:bg-rose-500 dark:text-white"
};

const priceBadgeShadowByCategory: Record<Product["category"], string> = {
  Forex: "shadow-[0_10px_20px_-10px_rgba(8,145,178,0.9)]",
  Betting: "shadow-[0_10px_20px_-10px_rgba(5,150,105,0.9)]",
  Software: "shadow-[0_10px_20px_-10px_rgba(124,58,237,0.9)]",
  Social: "shadow-[0_10px_20px_-10px_rgba(225,29,72,0.9)]"
};

const fallbackPriceBadgeByCategory: Record<Product["category"], string> = {
  Forex: "$79",
  Betting: "$69",
  Software: "$99",
  Social: "$59"
};

const normalizePriceLabel = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[\d]/.test(trimmed) && !/^[\$€£¥]/.test(trimmed)) return `$${trimmed}`;
  return trimmed;
};

const ProductCard = ({ product, onCheckout, onMoreInfo, labels }: ProductCardProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const roundedRating = Math.round(product.rating);
  const trustLabel = product.isNew ? (labels?.newReleaseLabel ?? "New release") : `${product.features.length} ${labels?.keyFeaturesSuffix ?? "key features"}`;
  const priceBadgeText =
    (typeof product.price === "number" && Number.isFinite(product.price) && product.price >= 0
      ? `$${product.price.toFixed(0)}`
      : typeof product.priceLabel === "string" && product.priceLabel.trim()
        ? normalizePriceLabel(product.priceLabel)
        : fallbackPriceBadgeByCategory[product.category]);

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
            <span className="rounded-full border border-blue-700/30 bg-white px-2.5 py-1 text-[11px] font-extrabold text-blue-700 shadow-sm">
              {labels?.newBadgeLabel ?? "NEW"}
            </span>
          )}
          <span className="rounded-full border border-white/25 bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
            {product.category}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 break-words text-lg font-bold text-slate-900 dark:text-slate-50">{product.title}</h3>
          <span
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-black leading-none tracking-wide ${priceBadgeClassByCategory[product.category]} ${priceBadgeShadowByCategory[product.category]}`}
            aria-label={`Price ${priceBadgeText}`}
          >
            {priceBadgeText}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-slate-700 dark:text-slate-200">{product.shortDescription}</p>
        <div className="mt-3 flex min-w-0 items-center justify-between gap-2">
          <div className="flex shrink-0 items-center gap-1 text-amber-500" aria-label={`Rated ${product.rating} out of 5`}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <span key={`${product.id}-star-${idx}`} className={`text-base leading-none ${idx < roundedRating ? "" : "text-slate-400"}`}>
                ★
              </span>
            ))}
            <span className="ml-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{product.rating.toFixed(1)}</span>
          </div>
          <span className="min-w-0 truncate text-xs text-slate-600 dark:text-slate-300">{trustLabel}</span>
        </div>
      </div>
      <div className="mt-auto grid grid-cols-1 justify-items-start gap-3 px-4 pb-4 sm:grid-cols-2 sm:justify-items-stretch">
        <button
          type="button"
          onClick={(event) => onCheckout(product, event.currentTarget)}
          className="h-10 w-fit max-w-full rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-4 text-sm font-semibold text-white transition hover:brightness-110 sm:w-full dark:bg-none dark:bg-blue-600 dark:hover:bg-blue-500 dark:hover:brightness-100"
        >
          {labels?.checkoutLabel ?? "Proceed to Checkout"}
        </button>
        <button
          type="button"
          onClick={(event) => onMoreInfo(product, event.currentTarget)}
          className="h-10 w-fit max-w-full rounded-xl border-2 border-slate-400 bg-slate-50 px-4 text-sm font-semibold text-slate-800 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)] transition hover:bg-slate-100 sm:w-full dark:border-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          {labels?.moreInfoLabel ?? "Get More Info"}
        </button>
      </div>
      <p className="px-4 pb-4 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
        {labels?.affiliateDisclosure ?? "Affiliate disclosure: we may earn a commission if you buy through this link, at no extra cost to you."}
      </p>
    </article>
  );
};

export default ProductCard;
