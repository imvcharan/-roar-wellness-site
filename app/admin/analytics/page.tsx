"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Eye, MailCheck } from "lucide-react";
import { AnalyticsTrendCharts, PopularPageBars } from "@/components/analytics/AnalyticsVisuals";
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
    {
      label: "Anonymous page views",
      value: data?.totals.page_views ?? 0,
      comparison: changeLabel(data?.change.page_views),
      current: data?.totals.page_views ?? 0,
      previous: data?.previous.page_views ?? 0,
      icon: Eye,
      tone: "text-[#695f53] bg-[#ede9dd]",
    },
    {
      label: "Appointment requests",
      value: data?.totals.appointment_requests ?? 0,
      comparison: changeLabel(data?.change.appointment_requests),
      current: data?.totals.appointment_requests ?? 0,
      previous: data?.previous.appointment_requests ?? 0,
      icon: MailCheck,
      tone: "text-emerald-700 bg-emerald-50",
    },
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
        {metrics.map(({ label, value, comparison, current, previous, icon: Icon, tone }) => <article key={label} className="rounded-xl border border-cms-border bg-cms-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-cms-muted">{label}</p><span className={`rounded-xl p-2 ${tone}`}><Icon size={19} /></span>
          </div>
          <p className="mt-4 text-3xl font-bold text-cms-text">{loading ? "—" : value}</p>
          <p className="mt-2 text-xs text-cms-muted">{comparison}</p>
          {typeof current === "number" && typeof previous === "number" && <div className="mt-4 space-y-2" aria-label={`${label} period comparison`}>
            {[
              { name: `Current ${rangeDays} days`, amount: current, color: "bg-cms-primary" },
              { name: `Previous ${rangeDays} days`, amount: previous, color: "bg-[#c9c0b5]" },
            ].map((period) => {
              const scale = Math.max(1, current, previous);
              return <div key={period.name} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-2 text-[11px] text-cms-muted">
                <span>{period.name}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-cms-background">
                  <span className={`block h-full rounded-full ${period.color}`} style={{ width: `${(period.amount / scale) * 100}%` }} />
                </span>
                <span className="text-right font-medium text-cms-text">{period.amount}</span>
              </div>;
            })}
          </div>}
        </article>)}
      </section>
      <div className="space-y-6">
        <section className="rounded-xl border border-cms-border bg-cms-surface shadow-sm">
          <div className="flex items-center gap-2 border-b border-cms-border px-5 py-4"><BarChart3 size={18} className="text-cms-primary" /><div><h2 className="font-semibold text-cms-text">Daily activity</h2><p className="mt-1 text-sm text-cms-muted">Trends for the last {rangeDays} days. Each chart uses its own scale.</p></div></div>
          <AnalyticsTrendCharts days={data?.days ?? []} />
        </section>
        <section className="rounded-xl border border-cms-border bg-cms-surface shadow-sm">
          <div className="border-b border-cms-border px-5 py-4"><h2 className="font-semibold text-cms-text">Popular pages</h2><p className="mt-1 text-sm text-cms-muted">Share of opted-in page views over the last {rangeDays} days.</p></div>
          <PopularPageBars pages={data?.popularPages ?? []} totalViews={data?.totals.page_views ?? 0} />
        </section>
      </div>
    </div>
  );
}
