import type { FashionPublishedSource } from "../utils/fashionDraft";

type FashionContentStatusProps = {
  source: FashionPublishedSource;
  className?: string;
};

const sourceCopy: Record<FashionPublishedSource, { label: string; note: string; className: string }> = {
  loading: {
    label: "Loading",
    note: "Checking the published Fashion backend before rendering page content.",
    className: "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700/60 dark:bg-slate-900/30 dark:text-slate-100"
  },
  live: {
    label: "Live",
    note: "Rendering current published Fashion content.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-200"
  },
  cache: {
    label: "Cached",
    note: "Showing last synced Fashion content from this browser.",
    className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200"
  },
  fallback: {
    label: "Fallback defaults",
    note: "Backend content is unavailable, so default Fashion content is being shown.",
    className: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-200"
  },
  unavailable: {
    label: "Unavailable",
    note: "Published Fashion content could not be loaded from the backend.",
    className: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-200"
  }
};

const FashionContentStatus = ({ source, className = "" }: FashionContentStatusProps) => {
  const copy = sourceCopy[source];

  return (
    <div className={`border-b border-black/6 px-4 py-2 text-xs dark:border-white/8 ${className}`}>
      <div className={`mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-2xl border px-3 py-2 ${copy.className}`}>
        <span className="font-bold uppercase tracking-[0.18em]">{copy.label}</span>
        <span className="text-right">{copy.note}</span>
      </div>
    </div>
  );
};

export default FashionContentStatus;
