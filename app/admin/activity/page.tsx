"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, MapPin } from "lucide-react";
import { cmsRequest } from "@/services/cms-api";

interface AuditEvent {
  id: string;
  actor_name: string;
  action: string;
  resource_type: string;
  summary: string;
  location: string | null;
  created_at: string;
}
interface ActivityResponse {
  data: AuditEvent[];
  actions: string[];
  pagination: { page: number; pageSize: number; total: number; pages: number };
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function ActivityPage() {
  const [result, setResult] = useState<ActivityResponse | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("q", search);
      if (action) params.set("action", action);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const response = await cmsRequest<ActivityResponse>(`/api/cms/activity?${params.toString()}`);
      setResult(response);
      setError("");
      if (response.pagination.page !== page) setPage(response.pagination.page);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the activity log.");
    } finally {
      setLoading(false);
    }
  }, [action, from, page, search, to]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-cms-primary">Workspace oversight</p>
        <h1 className="mt-1 text-3xl font-bold text-cms-text">Activity log</h1>
        <p className="mt-2 text-sm text-cms-muted">Staff actions and sampled security events, retained for up to 12 months.</p>
      </header>
      <p className="rounded-lg border border-cms-border bg-[#ede9dd] p-3 text-sm text-cms-text">
        The log records admin actions, not visitor browsing. Failed sign-ins are sampled without storing the submitted email. Approximate location appears only when a trusted hosting proxy is configured; exact device location and IP addresses are not stored.
      </p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <form onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }} className="grid gap-3 rounded-xl border border-cms-border bg-cms-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="sm:col-span-2">
          <span className="sr-only">Search activity</span>
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} maxLength={100} placeholder="Search staff, action, resource, or details" className="w-full rounded-lg border border-cms-border bg-white px-3 py-2 text-sm text-cms-text" />
        </label>
        <label>
          <span className="sr-only">Filter activity by action</span>
          <select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} className="w-full rounded-lg border border-cms-border bg-white px-3 py-2 text-sm text-cms-text">
            <option value="">All actions</option>
            {result?.actions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Activity from date</span>
          <input type="date" value={from} max={to || undefined} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="w-full rounded-lg border border-cms-border bg-white px-3 py-2 text-sm text-cms-text" />
        </label>
        <div className="flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Activity through date</span>
            <input type="date" value={to} min={from || undefined} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="w-full rounded-lg border border-cms-border bg-white px-3 py-2 text-sm text-cms-text" />
          </label>
          <button type="submit" className="rounded-lg bg-cms-primary px-4 py-2 text-sm font-medium text-white hover:bg-cms-primary-hover">Search</button>
        </div>
      </form>
      <section className="overflow-hidden rounded-xl border border-cms-border bg-cms-surface shadow-sm">
        {loading ? <p role="status" className="p-8 text-center text-sm text-cms-muted">Loading activity…</p>
          : result?.data.length ? <ol className="divide-y divide-cms-border">
            {result.data.map((event) => <li key={event.id} className="flex gap-3 px-5 py-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cms-background text-cms-primary"><Activity size={17} /></span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-cms-text">{event.summary}</p>
                <p className="mt-1 text-sm text-cms-muted">{event.actor_name} · {event.action} · {event.resource_type}</p>
              </div>
              <div className="shrink-0 text-right">
                <time className="text-xs text-cms-muted">{dateLabel(event.created_at)}</time>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-cms-muted">{event.location ? <><MapPin size={12} />{event.location}</> : "Location not collected"}</p>
              </div>
            </li>)}
          </ol> : <p className="p-10 text-center text-sm text-cms-muted">{result?.pagination.total ? "No activity matches these filters." : "No staff activity has been recorded yet."}</p>}
        {result && result.pagination.total > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cms-border px-5 py-3 text-sm text-cms-muted">
          <span>Showing {Math.min((result.pagination.page - 1) * result.pagination.pageSize + 1, result.pagination.total)}–{Math.min(result.pagination.page * result.pagination.pageSize, result.pagination.total)} of {result.pagination.total}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="rounded-md border border-cms-border px-3 py-1.5 disabled:opacity-50">Previous</button>
            <span className="self-center">Page {result.pagination.page} of {result.pagination.pages}</span>
            <button type="button" disabled={page >= result.pagination.pages || loading} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-cms-border px-3 py-1.5 disabled:opacity-50">Next</button>
          </div>
        </div>}
      </section>
    </div>
  );
}
