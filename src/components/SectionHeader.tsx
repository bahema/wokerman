import type { SortOption } from "../utils/useProductFilters";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  searchValue: string;
  sortValue: SortOption;
  onSearchChange: (value: string) => void;
  onSortChange: (value: SortOption) => void;
  updatedAt?: string | null;
};

const SectionHeader = ({
  eyebrow,
  title,
  description,
  searchValue,
  sortValue,
  onSearchChange,
  onSortChange,
  updatedAt
}: SectionHeaderProps) => {
  let updatedLabel = "Update time unavailable";
  if (updatedAt) {
    const parsed = new Date(updatedAt);
    if (!Number.isNaN(parsed.getTime())) {
      updatedLabel = `Updated ${new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(parsed)}`;
    }
  }

  return (
    <div className="mb-8 min-w-0 space-y-4">
    <div className="space-y-2">
      <span className="inline-flex rounded-full bg-gradient-to-r from-blue-100 via-sky-100 to-cyan-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-700 dark:rounded-none dark:bg-none dark:px-0 dark:py-0 dark:text-blue-400">
        {eyebrow}
      </span>
      <h2 className="break-words text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl">{title}</h2>
      <p className="max-w-2xl break-words text-sm text-slate-700 dark:text-slate-300 md:text-base">{description}</p>
    </div>

    <div className="grid gap-3 rounded-2xl border border-slate-200/90 bg-gradient-to-r from-white via-slate-50 to-blue-50/60 p-4 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.28)] dark:border-slate-600 dark:bg-none dark:bg-slate-900 dark:shadow-sm md:grid-cols-[1fr,220px,auto] md:items-center">
      <label className="sr-only" htmlFor={`${eyebrow}-search`}>
        Search products
      </label>
      <input
        id={`${eyebrow}-search`}
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search tools..."
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none ring-blue-500 transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 dark:border-slate-500 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-300"
      />
      <label className="sr-only" htmlFor={`${eyebrow}-sort`}>
        Sort products
      </label>
      <select
        id={`${eyebrow}-sort`}
        value={sortValue}
        onChange={(event) => onSortChange(event.target.value as SortOption)}
        className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none ring-blue-500 transition focus:border-blue-400 focus:ring-2 dark:border-slate-500 dark:bg-slate-800 dark:text-white"
      >
        <option value="position">Manual order</option>
        <option value="rating">Highest rating</option>
        <option value="newest">Newest first</option>
        <option value="az">A-Z</option>
      </select>
      <span className="flex min-w-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
        {updatedLabel}
      </span>
    </div>
  </div>
  );
};

export default SectionHeader;
