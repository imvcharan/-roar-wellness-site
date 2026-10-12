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

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function ActivityPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await cmsRequest<{ data: AuditEvent[] }>("/api/cms/activity?limit=100");
      setEvents(result.data);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the activity log.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-cms-primary">Workspace oversight</p>
        <h1 className="mt-1 text-3xl font-bold text-cms-text">Activity log</h1>
        <p className="mt-2 text-sm text-cms-muted">Recent successful CMS changes by staff accounts.</p>
      </header>
      <p className="rounded-lg border border-cms-border bg-[#ede9dd] p-3 text-sm text-cms-text">
        The log records admin actions, not visitor browsing. Approximate location appears only when a trusted hosting proxy is configured; exact device location and IP addresses are not stored.
      </p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <section className="overflow-hidden rounded-xl border border-cms-border bg-cms-surface shadow-sm">
        {loading ? <p role="status" className="p-8 text-center text-sm text-cms-muted">Loading activity…</p>
          : events.length ? <ol className="divide-y divide-cms-border">
            {events.map((event) => <li key={event.id} className="flex gap-3 px-5 py-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cms-background text-cms-primary"><Activity size={17} /></span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-cms-text">{event.summary}</p>
                <p className="mt-1 text-sm text-cms-muted">{event.actor_name} · {event.resource_type}</p>
              </div>
              <div className="shrink-0 text-right">
                <time className="text-xs text-cms-muted">{dateLabel(event.created_at)}</time>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-cms-muted">{event.location ? <><MapPin size={12} />{event.location}</> : "Location not collected"}</p>
              </div>
            </li>)}
          </ol> : <p className="p-10 text-center text-sm text-cms-muted">No staff activity has been recorded yet.</p>}
      </section>
    </div>
  );
}
