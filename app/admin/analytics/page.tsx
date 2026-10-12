"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Eye, MailCheck } from "lucide-react";
import { cmsRequest } from "@/services/cms-api";

interface Analytics {
  totals: { page_views: number; appointment_requests: number; conversion_rate: number | null };
  previous: { page_views: number; appointment_requests: number; conversion_rate: number | null };
  change: { page_views: number | null; appointment_requests: number | null };
  popularPages: { page_path: string; views: number }[];
  days: { day: string; page_views: number; appointment_requests: number }[];
  rangeDays: number;
  retention: string;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [rangeDays, setRangeDays] = useState(30);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await cmsRequest<{ data: Analytics }>(`/api/cms/analytics?days=${rangeDays}`);
      setData(result.data);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  useEffect(() => { void load(); }, [load]);

  const maximum = Math.max(1, ...(data?.days.map((day) => day.page_views) ?? []));
  const comparisonLabel = `vs previous ${rangeDays}-day period`;
  const changeLabel = (change: number | null | undefined) => change === null || change === undefined
    ? "No prior-period baseline"
    : `${change > 0 ? "+" : ""}${change}% ${comparisonLabel}`;
  const metrics = [
    { label: "Anonymous page views", value: data?.totals.page_views ?? 0, comparison: changeLabel(data?.change.page_views), icon: Eye, tone: "text-[#695f53] bg-[#ede9dd]" },
    { label: "Appointment requests", value: data?.totals.appointment_requests ?? 0, comparison: changeLabel(data?.change.appointment_requests), icon: MailCheck, tone: "text-emerald-700 bg-emerald-50" },
    { label: "Appointment requests / views", value: data?.totals.conversion_rate == null ? "—" : `${data.totals.conversion_rate}%`, comparison: "Anonymous opted-in events, not unique visitors", icon: BarChart3, tone: "text-cms-primary bg-cms-background" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-cms-primary">Website insights</p>
        <h1 className="mt-1 text-3xl font-bold text-cms-text">Analytics</h1>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-cms-muted">Consent-based, anonymous totals with a previous-period comparison.</p>
          <label className="text-sm font-medium text-cms-text">
            <span className="sr-only">Analytics date range</span>
            <select value={rangeDays} onChange={(event) => setRangeDays(Number(event.target.value))} className="rounded-lg border border-cms-border bg-cms-surface px-3 py-2">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
        </div>
      </header>
      <p className="rounded-lg border border-cms-border bg-[#ede9dd] p-3 text-sm text-cms-text">
        Only visitors who opt in are counted. No IP address, advertising or tracking cookies, precise location, referrer, or individual visitor profile is stored. Raw anonymous events are deleted after 12 months.
      </p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <section aria-label="Website metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(({ label, value, comparison, icon: Icon, tone }) => <article key={label} className="rounded-xl border border-cms-border bg-cms-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-cms-muted">{label}</p><span className={`rounded-xl p-2 ${tone}`}><Icon size={19} /></span>
          </div>
          <p className="mt-4 text-3xl font-bold text-cms-text">{loading ? "—" : value}</p>
          <p className="mt-2 text-xs text-cms-muted">{comparison}</p>
        </article>)}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-cms-border bg-cms-surface shadow-sm">
          <div className="border-b border-cms-border px-5 py-4"><h2 className="font-semibold text-cms-text">Popular pages</h2><p className="mt-1 text-sm text-cms-muted">Opted-in views over the last {rangeDays} days.</p></div>
          {data?.popularPages.length ? <ol className="divide-y divide-cms-border">
            {data.popularPages.map((page) => <li key={page.page_path} className="flex justify-between gap-3 px-5 py-3 text-sm"><span className="truncate text-cms-text">{page.page_path}</span><span className="shrink-0 font-semibold text-cms-text">{page.views}</span></li>)}
          </ol> : <p className="p-5 text-sm text-cms-muted">No opted-in page views have been recorded yet.</p>}
        </section>
        <section className="rounded-xl border border-cms-border bg-cms-surface shadow-sm">
          <div className="flex items-center gap-2 border-b border-cms-border px-5 py-4"><BarChart3 size={18} className="text-cms-primary" /><div><h2 className="font-semibold text-cms-text">Daily page views</h2><p className="mt-1 text-sm text-cms-muted">Last {rangeDays} days.</p></div></div>
          {data?.days.length ? <ol className="space-y-3 p-5">
            {data.days.map((day) => <li key={day.day} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 text-xs text-cms-muted">
              <time>{day.day}</time><span className="h-2 overflow-hidden rounded-full bg-cms-background"><span className="block h-full rounded-full bg-cms-primary" style={{ width: `${Math.max(3, day.page_views / maximum * 100)}%` }} /></span><span className="text-right font-medium text-cms-text">{day.page_views}</span>
            </li>)}
          </ol> : <p className="p-5 text-sm text-cms-muted">No opted-in analytics to display.</p>}
        </section>
      </div>
    </div>
  );
}
