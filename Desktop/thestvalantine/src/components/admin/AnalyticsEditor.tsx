import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../api/client";
import type { SiteContent } from "../../data/siteData";

type AnalyticsEditorProps = {
  content: SiteContent;
};

type AnalyticsSummary = {
  totalEvents: number;
  byEvent: Record<string, number>;
  byDay: Record<string, number>;
  productClicks: Record<string, number>;
};

const eventLabelByName: Record<string, string> = {
  product_link_click: "Product Link Clicks",
  product_more_info_click: "More Info Clicks",
  product_modal_open: "Product Modal Opens",
  checkout_modal_open: "Checkout Modal Opens",
  product_search: "Product Search",
  product_sort: "Product Sort",
  section_tab_switch: "Section Tab Switches",
  section_view: "Section Views"
};

const emptySummary: AnalyticsSummary = {
  totalEvents: 0,
  byEvent: {},
  byDay: {},
  productClicks: {}
};

const AnalyticsEditor = ({ content }: AnalyticsEditorProps) => {
  const [summary, setSummary] = useState<AnalyticsSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadSummary = async () => {
      try {
        setLoadError("");
        const next = await apiGet<AnalyticsSummary>("/api/analytics/summary");
        if (!cancelled) setSummary(next);
      } catch (error) {
        if (!cancelled) {
          setSummary(emptySummary);
          setLoadError(error instanceof Error ? error.message : "Failed to load analytics summary.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalProducts =
    content.products.forex.length + content.products.betting.length + content.products.software.length + content.products.social.length;
  const avgRating =
    [
      ...content.products.forex,
      ...content.products.betting,
      ...content.products.software,
      ...content.products.social
    ].reduce((sum, item) => sum + item.rating, 0) / Math.max(totalProducts, 1);

  const eventTypes = useMemo(() => Object.entries(summary.byEvent).sort((a, b) => b[1] - a[1]), [summary.byEvent]);
  const topProductClicks = useMemo(() => Object.entries(summary.productClicks).sort((a, b) => b[1] - a[1]), [summary.productClicks]);
  const totalProductClicks = useMemo(() => Object.values(summary.productClicks).reduce((sum, count) => sum + count, 0), [summary.productClicks]);
  const latestEventDay = useMemo(() => {
    const sortedDays = Object.keys(summary.byDay).sort();
    return sortedDays.length ? sortedDays[sortedDays.length - 1] : "No events yet";
  }, [summary.byDay]);

  const weeklyByDay = useMemo(() => {
    const list: Array<{ day: string; count: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const day = date.toISOString().slice(0, 10);
      list.push({ day, count: summary.byDay[day] ?? 0 });
    }
    return list;
  }, [summary.byDay]);

  const maxWeeklyCount = Math.max(...weeklyByDay.map((entry) => entry.count), 1);
  const productTitleById = useMemo(() => {
    const allProducts = [...content.products.forex, ...content.products.betting, ...content.products.software, ...content.products.social];
    return allProducts.reduce<Record<string, string>>((acc, product) => {
      acc[product.id] = product.title;
      return acc;
    }, {});
  }, [content.products.betting, content.products.forex, content.products.social, content.products.software]);

  const formatEventLabel = (eventName: string) => {
    if (eventLabelByName[eventName]) return eventLabelByName[eventName];
    return eventName
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Events</p>
          <p className="mt-1 text-2xl font-bold">{loading ? "..." : summary.totalEvents}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Event Types</p>
          <p className="mt-1 text-2xl font-bold">{loading ? "..." : eventTypes.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Product Link Clicks</p>
          <p className="mt-1 text-2xl font-bold">{loading ? "..." : totalProductClicks}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Latest Event Day</p>
          <p className="mt-1 text-2xl font-bold">{loading ? "..." : latestEventDay}</p>
        </article>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
          {loadError}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Products</p>
          <p className="mt-1 text-2xl font-bold">{totalProducts}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Average Rating</p>
          <p className="mt-1 text-2xl font-bold">{avgRating.toFixed(2)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Testimonials</p>
          <p className="mt-1 text-2xl font-bold">{content.testimonials.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Industries</p>
          <p className="mt-1 text-2xl font-bold">{content.industries.length}</p>
        </article>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h4 className="text-sm font-semibold">Category Breakdown</h4>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">Forex: {content.products.forex.length}</div>
          <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">Betting: {content.products.betting.length}</div>
          <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">Software: {content.products.software.length}</div>
          <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">Social: {content.products.social.length}</div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h5 className="text-sm font-semibold">Events in Last 7 Days</h5>
          <div className="mt-3 space-y-2">
            {weeklyByDay.map((entry) => (
              <div key={entry.day} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{entry.day}</span>
                  <span>{entry.count}</span>
                </div>
                <div className="h-2 rounded bg-slate-100 dark:bg-slate-800">
                  <div className="h-2 rounded bg-blue-600" style={{ width: `${(entry.count / maxWeeklyCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h5 className="text-sm font-semibold">Event Breakdown</h5>
          <div className="mt-3 space-y-2">
            {eventTypes.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No events recorded yet.</p>
            ) : (
              eventTypes.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                  <span className="truncate pr-3">{formatEventLabel(name)}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h5 className="text-sm font-semibold">Top Product Clicks</h5>
          <div className="mt-3 space-y-2">
            {topProductClicks.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No product clicks recorded yet.</p>
            ) : (
              topProductClicks.slice(0, 8).map(([productId, count]) => (
                <div key={productId} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                  <span className="truncate pr-3">{productTitleById[productId] ?? `Unknown product (${productId})`}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </div>
  );
};

export default AnalyticsEditor;
