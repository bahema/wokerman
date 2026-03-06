const normalizeBadgeKey = (badgeType?: string, badgeLabel?: string) => {
  const explicit = badgeType?.trim().toLowerCase();
  if (explicit) return explicit;
  return (badgeLabel ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
};

export const getFashionBadgeClassName = (badgeType?: string, badgeLabel?: string) => {
  const badgeKey = normalizeBadgeKey(badgeType, badgeLabel);
  const baseClass =
    "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]";

  switch (badgeKey) {
    case "new":
      return `${baseClass} border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-200`;
    case "used":
      return `${baseClass} border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-300/15 dark:text-amber-100`;
    case "limited":
      return `${baseClass} border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/15 dark:text-rose-100`;
    case "best-seller":
      return `${baseClass} border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/15 dark:text-sky-100`;
    case "trending":
    case "hot":
      return `${baseClass} border-fuchsia-200 bg-fuchsia-100 text-fuchsia-800 dark:border-fuchsia-400/30 dark:bg-fuchsia-400/15 dark:text-fuchsia-100`;
    case "editor-pick":
      return `${baseClass} border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-400/30 dark:bg-violet-400/15 dark:text-violet-100`;
    default:
      return `${baseClass} border-slate-200 bg-slate-100 text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-white`;
  }
};

export const getFashionPriceChipClassName = (badgeType?: string, badgeLabel?: string) => {
  const badgeKey = normalizeBadgeKey(badgeType, badgeLabel);
  const baseClass = "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-black";

  switch (badgeKey) {
    case "new":
      return `${baseClass} border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-100`;
    case "used":
      return `${baseClass} border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-300/15 dark:text-amber-100`;
    case "limited":
      return `${baseClass} border-rose-200 bg-rose-100 text-rose-900 dark:border-rose-400/30 dark:bg-rose-400/15 dark:text-rose-100`;
    case "best-seller":
      return `${baseClass} border-sky-200 bg-sky-100 text-sky-900 dark:border-sky-400/30 dark:bg-sky-400/15 dark:text-sky-100`;
    case "trending":
    case "hot":
      return `${baseClass} border-fuchsia-200 bg-fuchsia-100 text-fuchsia-900 dark:border-fuchsia-400/30 dark:bg-fuchsia-400/15 dark:text-fuchsia-100`;
    case "editor-pick":
      return `${baseClass} border-violet-200 bg-violet-100 text-violet-900 dark:border-violet-400/30 dark:bg-violet-400/15 dark:text-violet-100`;
    default:
      return `${baseClass} border-stone-200 bg-stone-100 text-stone-900 dark:border-white/10 dark:bg-white/10 dark:text-white`;
  }
};
