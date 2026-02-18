import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiJson } from "../../api/client";

type DataState = "loaded" | "loading" | "empty" | "error";
type CampaignStatus = "Draft" | "Scheduled" | "Sent";
type RangePreset = "7d" | "30d" | "90d";

type SubscriberLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  status: "pending" | "confirmed" | "unsubscribed";
};

type SubscribersResponse = {
  items: SubscriberLead[];
  total: number;
  page: number;
  pageSize: number;
};

type CampaignApiRow = {
  id: string;
  name: string;
  audienceMode: "all" | "segments";
  segments: string[];
  estimatedRecipients: number;
  status: "draft" | "scheduled" | "sent";
  updatedAt: string;
};

type CampaignsResponse = {
  items: CampaignApiRow[];
  total: number;
  page: number;
  pageSize: number;
};

type EmailSummaryResponse = {
  totals: {
    subscribers: number;
    pending: number;
    confirmed: number;
    unsubscribed: number;
    campaignsDraft: number;
    campaignsScheduled: number;
    campaignsSent: number;
  };
  timeline: Array<{
    id: string;
    eventType:
      | "lead_subscribed"
      | "lead_confirmed"
      | "lead_unsubscribed"
      | "lead_confirmation_resent"
      | "lead_deleted"
      | "campaign_saved"
      | "campaign_test_sent"
      | "campaign_scheduled"
      | "campaign_sent";
    campaignId: string | null;
    subscriberId: string | null;
    meta: Record<string, unknown>;
    createdAt: string;
  }>;
};

type CampaignRow = {
  id: string;
  name: string;
  audience: string;
  recipients: number;
  status: CampaignStatus;
  updatedAt: string;
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const today = new Date();
const defaultEnd = toIsoDate(today);
const defaultStart = toIsoDate(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000));

const eventLabel = (event: EmailSummaryResponse["timeline"][number]) => {
  const subject = typeof event.meta?.subject === "string" ? event.meta.subject : "";
  if (event.eventType === "lead_subscribed") return "New subscriber from Quick Grabs";
  if (event.eventType === "lead_confirmed") return "Subscriber confirmed";
  if (event.eventType === "lead_unsubscribed") return "Subscriber unsubscribed";
  if (event.eventType === "lead_confirmation_resent") return "Confirmation email resent";
  if (event.eventType === "lead_deleted") return "Subscriber deleted";
  if (event.eventType === "campaign_saved") return `Campaign saved${subject ? `: ${subject}` : ""}`;
  if (event.eventType === "campaign_test_sent") return `Test email sent${subject ? `: ${subject}` : ""}`;
  if (event.eventType === "campaign_scheduled") return `Campaign scheduled${subject ? `: ${subject}` : ""}`;
  return `Campaign sent${subject ? `: ${subject}` : ""}`;
};

const statusBadgeClass = (status: CampaignStatus) => {
  if (status === "Sent") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (status === "Scheduled") return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
  return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
};

const subscriberStatusBadgeClass = (status: SubscriberLead["status"]) => {
  if (status === "confirmed") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (status === "unsubscribed") return "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
  return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
};

const inRange = (isoValue: string, startDate: string, endDate: string) => {
  const time = new Date(isoValue).getTime();
  if (!Number.isFinite(time)) return false;
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T23:59:59.999Z`).getTime();
  return time >= start && time <= end;
};

const downloadText = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const toCsvRow = (values: Array<string | number>) =>
  values
    .map((value) => String(value).replace(/"/g, "\"\""))
    .map((value) => `"${value}"`)
    .join(",");

const EmailAnalyticsEditor = () => {
  const [rangePreset, setRangePreset] = useState<RangePreset>("30d");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [query, setQuery] = useState("");
  const [dataState, setDataState] = useState<DataState>("loading");
  const [sortKey, setSortKey] = useState<"name" | "recipients" | "updatedAt">("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [subscriberLeads, setSubscriberLeads] = useState<SubscriberLead[]>([]);
  const [campaignRows, setCampaignRows] = useState<CampaignRow[]>([]);
  const [summary, setSummary] = useState<EmailSummaryResponse["totals"] | null>(null);
  const [timeline, setTimeline] = useState<EmailSummaryResponse["timeline"]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("");
  const [authRequired, setAuthRequired] = useState(false);
  const [subscriberActionError, setSubscriberActionError] = useState("");
  const [subscriberActionNotice, setSubscriberActionNotice] = useState("");
  const [subscriberActionBusyId, setSubscriberActionBusyId] = useState("");
  const pageSize = 8;

  const goToLogin = () => {
    const next = encodeURIComponent(`${window.location.pathname}${window.location.search}${window.location.hash}`);
    window.history.replaceState({}, "", `/boss/login?next=${next}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setDataState("loading");
    }
    setAuthRequired(false);
    try {
      const [subscribers, campaigns, nextSummary] = await Promise.all([
        apiGet<SubscribersResponse>("/api/email/subscribers?page=1&pageSize=1000"),
        apiGet<CampaignsResponse>("/api/email/campaigns?page=1&pageSize=1000"),
        apiGet<EmailSummaryResponse>("/api/email/analytics/summary")
      ]);

      const mappedCampaigns: CampaignRow[] = campaigns.items.map((item) => ({
        id: item.id,
        name: item.name || "Untitled campaign",
        audience: item.audienceMode === "segments" ? `Segments (${item.segments.length})` : "All confirmed subscribers",
        recipients: item.estimatedRecipients,
        status: item.status === "draft" ? "Draft" : item.status === "scheduled" ? "Scheduled" : "Sent",
        updatedAt: item.updatedAt
      }));

      setSubscriberLeads(subscribers.items);
      setCampaignRows(mappedCampaigns);
      setSummary(nextSummary.totals);
      setTimeline(nextSummary.timeline);
      setLastUpdatedAt(new Date().toISOString());
      setDataState(mappedCampaigns.length || subscribers.items.length ? "loaded" : "empty");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/unauthorized|login required/i.test(message)) {
        setAuthRequired(true);
      }
      if (!silent) {
        setDataState("error");
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load(true);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const now = new Date();
    const days = rangePreset === "7d" ? 6 : rangePreset === "30d" ? 29 : 89;
    setEndDate(toIsoDate(now));
    setStartDate(toIsoDate(new Date(now.getTime() - days * 24 * 60 * 60 * 1000)));
    setPage(1);
  }, [rangePreset]);

  const filteredCampaigns = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = campaignRows.filter((row) => {
      if (!inRange(row.updatedAt, startDate, endDate)) return false;
      if (!q) return true;
      return row.name.toLowerCase().includes(q) || row.audience.toLowerCase().includes(q);
    });
    const sorted = [...base].sort((a, b) => {
      const factor = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return a.name.localeCompare(b.name) * factor;
      if (sortKey === "updatedAt") return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * factor;
      return (a.recipients - b.recipients) * factor;
    });
    return sorted;
  }, [campaignRows, endDate, query, sortDir, sortKey, startDate]);

  const filteredSubscribers = useMemo(
    () => subscriberLeads.filter((lead) => inRange(lead.createdAt, startDate, endDate)),
    [endDate, startDate, subscriberLeads]
  );

  const filteredTimeline = useMemo(
    () => timeline.filter((event) => inRange(event.createdAt, startDate, endDate)),
    [endDate, startDate, timeline]
  );

  const eventBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of filteredTimeline) {
      counts.set(event.eventType, (counts.get(event.eventType) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([eventType, count]) => ({ eventType, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredTimeline]);

  const lifecycleFunnel = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Subscribed", count: summary.subscribers },
      { label: "Confirmed", count: summary.confirmed },
      { label: "Unsubscribed", count: summary.unsubscribed },
      { label: "Draft campaigns", count: summary.campaignsDraft },
      { label: "Sent campaigns", count: summary.campaignsSent }
    ];
  }, [summary]);

  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / pageSize));
  const pagedCampaigns = filteredCampaigns.slice((page - 1) * pageSize, page * pageSize);

  const onToggleSort = (key: typeof sortKey) => {
    setPage(1);
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("desc");
  };

  const onExportCsv = () => {
    const header = toCsvRow(["Campaign", "Audience", "Recipients", "Status", "Updated At"]);
    const rows = filteredCampaigns.map((row) =>
      toCsvRow([row.name, row.audience, row.recipients, row.status, new Date(row.updatedAt).toISOString()])
    );
    downloadText(`email-campaigns-${startDate}-to-${endDate}.csv`, [header, ...rows].join("\n"), "text/csv;charset=utf-8");
  };

  const onExportJson = () => {
    downloadText(
      `email-analytics-${startDate}-to-${endDate}.json`,
      JSON.stringify(
        {
          range: { startDate, endDate },
          totals: summary,
          campaigns: filteredCampaigns,
          subscribers: filteredSubscribers,
          timeline: filteredTimeline
        },
        null,
        2
      ),
      "application/json;charset=utf-8"
    );
  };

  const resendConfirmationEmail = async (lead: SubscriberLead) => {
    setSubscriberActionError("");
    setSubscriberActionNotice("");
    setSubscriberActionBusyId(lead.id);
    try {
      await apiJson<{ ok: boolean; queued?: boolean; subscriberId: string }>(`/api/email/subscribers/${encodeURIComponent(lead.id)}/resend-confirmation`, "POST");
      setSubscriberActionNotice(`Confirmation email queued for ${lead.email}.`);
      await load();
    } catch (error) {
      setSubscriberActionError(error instanceof Error ? error.message : "Failed to resend confirmation email.");
    } finally {
      setSubscriberActionBusyId("");
    }
  };

  const deleteSubscriber = async (lead: SubscriberLead) => {
    const confirmed = window.confirm(`Delete subscriber ${lead.email}? This action cannot be undone.`);
    if (!confirmed) return;
    setSubscriberActionError("");
    setSubscriberActionNotice("");
    setSubscriberActionBusyId(lead.id);
    try {
      await apiJson<{ ok: boolean; deletedId: string }>(`/api/email/subscribers/${encodeURIComponent(lead.id)}`, "DELETE");
      await load();
    } catch (error) {
      setSubscriberActionError(error instanceof Error ? error.message : "Failed to delete subscriber.");
    } finally {
      setSubscriberActionBusyId("");
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">Start</span>
              <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">End</span>
              <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950" />
            </label>
            <div className="flex flex-wrap gap-2">
              {(["7d", "30d", "90d"] as RangePreset[]).map((preset) => (
                <button key={preset} type="button" onClick={() => setRangePreset(preset)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${rangePreset === preset ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-300" : "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"}`}>
                  {preset}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onExportCsv} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-100">
              Export CSV
            </button>
            <button type="button" onClick={onExportJson} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-100">
              Export JSON
            </button>
            <button type="button" onClick={() => void load()} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-100">
              Refresh
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Last updated: {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString() : "n/a"}
            </span>
          </div>
        </div>
      </div>

      {summary ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            { key: "subscribers", label: "Subscribers", value: summary.subscribers },
            { key: "pending", label: "Pending Confirm", value: summary.pending },
            { key: "confirmed", label: "Confirmed", value: summary.confirmed },
            { key: "unsubscribed", label: "Unsubscribed", value: summary.unsubscribed },
            { key: "drafts", label: "Campaign Drafts", value: summary.campaignsDraft },
            { key: "scheduled", label: "Scheduled", value: summary.campaignsScheduled }
          ].map((card) => (
            <article key={card.key} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{card.label}</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{card.value.toLocaleString()}</p>
            </article>
          ))}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">Campaign Performance</h3>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
            placeholder="Search campaign or audience"
            className="w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
        </div>

        {dataState === "loading" ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={`load-row-${idx}`} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : null}

        {dataState === "error" ? (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/30">
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
              {authRequired ? "Admin login required." : "Unable to load campaign analytics."}
            </p>
            {authRequired ? (
              <button
                type="button"
                onClick={goToLogin}
                className="mt-3 rounded-lg border border-rose-300 px-3 py-1.5 text-sm text-rose-700 dark:border-rose-700 dark:text-rose-300"
              >
                Go to login
              </button>
            ) : null}
          </div>
        ) : null}

        {dataState === "loaded" || dataState === "empty" ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                    <th className="py-2 pr-3">
                      <button type="button" onClick={() => onToggleSort("name")} className="font-semibold">Campaign</button>
                    </th>
                    <th className="py-2 pr-3 font-semibold">Audience</th>
                    <th className="py-2 pr-3">
                      <button type="button" onClick={() => onToggleSort("recipients")} className="font-semibold">Recipients</button>
                    </th>
                    <th className="py-2 pr-3">
                      <button type="button" onClick={() => onToggleSort("updatedAt")} className="font-semibold">Updated</button>
                    </th>
                    <th className="py-2 pr-1 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 dark:text-slate-400">
                        No campaigns in selected range.
                      </td>
                    </tr>
                  ) : (
                    pagedCampaigns.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-3 font-medium">{row.name}</td>
                        <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{row.audience}</td>
                        <td className="py-2 pr-3">{row.recipients.toLocaleString()}</td>
                        <td className="py-2 pr-3">{new Date(row.updatedAt).toLocaleString()}</td>
                        <td className="py-2 pr-1">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(row.status)}`}>{row.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <p className="text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50 dark:border-slate-600">
                  Prev
                </button>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50 dark:border-slate-600">
                  Next
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
          <h3 className="mb-3 text-lg font-bold">Lifecycle Funnel</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {lifecycleFunnel.map((step) => (
              <div key={step.label} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{step.label}</p>
                <p className="mt-1 text-lg font-bold">{step.count.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
          <h3 className="mb-3 text-lg font-bold">Event Breakdown</h3>
          {eventBreakdown.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No events in selected range.</p>
          ) : (
            <div className="space-y-2">
              {eventBreakdown.map((item) => (
                <div key={item.eventType} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                  <span>{item.eventType}</span>
                  <span className="font-semibold">{item.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <h3 className="mb-3 text-lg font-bold">Subscriber Leads (Quick Grabs)</h3>
        {subscriberActionError ? (
          <p className="mb-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
            {subscriberActionError}
          </p>
        ) : null}
        {subscriberActionNotice ? (
          <p className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            {subscriberActionNotice}
          </p>
        ) : null}
        {filteredSubscribers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            No subscriber info in selected range.
          </div>
        ) : (
          <div className={filteredSubscribers.length > 6 ? "max-h-72 overflow-y-auto pr-1" : ""}>
            <div className="grid grid-cols-1 gap-2">
              {filteredSubscribers.map((lead) => (
                <article key={lead.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-4 sm:gap-3">
                    <p><span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Name:</span><span className="font-medium">{lead.name || "-"}</span></p>
                    <p className="break-all"><span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email:</span><span>{lead.email || "-"}</span></p>
                    <p><span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Phone:</span><span>{lead.phone || "-"}</span></p>
                    <p>
                      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status:</span>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${subscriberStatusBadgeClass(lead.status)}`}>
                        {lead.status}
                      </span>
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {lead.status === "pending" ? (
                      <button
                        type="button"
                        disabled={subscriberActionBusyId === lead.id}
                        onClick={() => { void resendConfirmationEmail(lead); }}
                        className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-700 dark:text-blue-300"
                      >
                        Resend confirmation email
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={subscriberActionBusyId === lead.id}
                      onClick={() => { void deleteSubscriber(lead); }}
                      className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-700 dark:text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <h3 className="mb-3 text-lg font-bold">Activity Timeline</h3>
        {filteredTimeline.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No timeline events in selected range.</p>
        ) : (
          <div className={filteredTimeline.length > 5 ? "max-h-80 space-y-3 overflow-y-auto pr-1" : "space-y-3"}>
            {filteredTimeline.slice(0, 30).map((event) => (
              <div key={event.id} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${event.eventType === "campaign_sent" || event.eventType === "lead_confirmed" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                  {event.eventType === "campaign_sent" || event.eventType === "lead_confirmed" ? "i" : "!"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{eventLabel(event)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(event.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default EmailAnalyticsEditor;
