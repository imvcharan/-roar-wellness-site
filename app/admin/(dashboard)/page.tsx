"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowRight, BookOpen, BriefcaseBusiness, Clock3, FileText, Mail, Plus, Server } from "lucide-react";
import { cmsRequest } from "@/services/cms-api";

interface CmsEntry {
  id: string;
  title: string;
  slug: string;
  category_name: string;
  status: "draft" | "published" | "archived";
  scheduled_publish_at: string | null;
  updated_at: string;
}

interface CmsOverviewActivity {
  id: string;
  actor_name: string;
  summary: string;
  created_at: string;
}

interface CmsOperations {
  mediaAvailable: boolean;
  notifications: { configured: boolean; pending: number; due: number; exhausted: number };
  publishing: { scheduled: number; overdue: number; nextAt: string | null };
  jobs: { job_key: string; status: "running" | "succeeded" | "failed"; started_at: string; finished_at: string | null; summary: string | null }[];
}

type CmsRole = "admin" | "editor" | "viewer";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function AdminOverviewPage() {
  const [entries, setEntries] = useState<CmsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newEnquiries, setNewEnquiries] = useState(0);
  const [overdueFollowUps, setOverdueFollowUps] = useState(0);
  const [unassignedEnquiries, setUnassignedEnquiries] = useState(0);
  const [activities, setActivities] = useState<CmsOverviewActivity[]>([]);
  const [role, setRole] = useState<CmsRole>("viewer");
  const [operations, setOperations] = useState<CmsOperations | null>(null);
  const [retryingNotifications, setRetryingNotifications] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [operationsNotice, setOperationsNotice] = useState("");
  const [operationsError, setOperationsError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [contentResult, sessionResult] = await Promise.all([
        cmsRequest<{ data: CmsEntry[] }>("/api/cms/content?all=1"),
        cmsRequest<{ data: { role: CmsRole } }>("/api/cms/session"),
      ]);
      setEntries(contentResult.data);
      const currentRole = sessionResult.data.role;
      setRole(currentRole);
      if (currentRole === "admin") {
        const [enquiriesResult, activityResult, operationsResult] = await Promise.all([
          cmsRequest<{ summary: { new: number; overdue: number; unassigned: number } }>("/api/cms/enquiries?summary=1"),
          cmsRequest<{ data: CmsOverviewActivity[] }>("/api/cms/activity?limit=5"),
          cmsRequest<{ data: CmsOperations }>("/api/cms/operations"),
        ]);
        setNewEnquiries(enquiriesResult.summary.new);
        setOverdueFollowUps(enquiriesResult.summary.overdue);
        setUnassignedEnquiries(enquiriesResult.summary.unassigned);
        setActivities(activityResult.data);
        setOperations(operationsResult.data);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the admin overview.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const retryNotifications = async () => {
    if (!window.confirm("Requeue all exhausted enquiry alerts? They will be retried by the next notification processor run.")) return;
    setRetryingNotifications(true);
    setOperationsNotice("");
    setOperationsError("");
    try {
      const result = await cmsRequest<{ data: { retried: number } }>("/api/cms/operations", {
        method: "POST",
        body: JSON.stringify({ action: "retry-exhausted-notifications" }),
      });
      setOperationsNotice(`${result.data.retried} exhausted alert${result.data.retried === 1 ? "" : "s"} requeued.`);
      await load();
    } catch (retryError) {
      setOperationsError(retryError instanceof Error ? retryError.message : "Unable to requeue enquiry alerts.");
    } finally {
      setRetryingNotifications(false);
    }
  };

  const testSmtpConnection = async () => {
    setTestingSmtp(true);
    setOperationsNotice("");
    setOperationsError("");
    try {
      await cmsRequest("/api/cms/operations", {
        method: "POST",
        body: JSON.stringify({ action: "test-smtp-connection" }),
      });
      setOperationsNotice("SMTP connection and authentication were verified. This test did not send an email.");
    } catch (testError) {
      setOperationsError(testError instanceof Error ? testError.message : "SMTP connection verification failed.");
    } finally {
      setTestingSmtp(false);
    }
  };

  const published = entries.filter((entry) => entry.status === "published").length;
  const drafts = entries.filter((entry) => entry.status === "draft" && !entry.scheduled_publish_at).length;
  const scheduled = entries.filter((entry) => entry.scheduled_publish_at).length;
  const archived = entries.filter((entry) => entry.status === "archived").length;
  const recentEntries = entries.slice(0, 6);
  const nextScheduled = entries
    .filter((entry) => entry.scheduled_publish_at && Date.parse(entry.scheduled_publish_at) >= Date.now())
    .sort((left, right) => Date.parse(left.scheduled_publish_at!) - Date.parse(right.scheduled_publish_at!))
    .slice(0, 5);
  const staleDraftCount = entries.filter((entry) => entry.status === "draft"
    && Date.now() - Date.parse(entry.updated_at) > 30 * 24 * 60 * 60 * 1000).length;

  const stats = [
    { label: "Published", value: published, icon: FileText, color: "text-emerald-700 bg-emerald-50" },
    { label: "Drafts", value: drafts, icon: BookOpen, color: "text-amber-700 bg-amber-50" },
    { label: "Scheduled", value: scheduled, icon: Clock3, color: "text-[#695f53] bg-[#ede9dd]" },
    { label: "Archived", value: archived, icon: BriefcaseBusiness, color: "text-slate-600 bg-slate-100" },
  ];

  return (
    <div className="w-full space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cms-primary">Admin workspace</p>
          <h1 className="mt-1 text-3xl font-bold text-cms-text">Overview</h1>
          <p className="mt-2 text-cms-muted">A quick view of your website content and what needs attention.</p>
        </div>
        {role !== "viewer" && <Link href="/admin/posts" className="inline-flex items-center justify-center gap-2 rounded-lg bg-cms-primary px-4 py-2 text-base font-medium text-white transition-colors hover:bg-cms-primary-hover">
          <Plus size={17} /> Create content
        </Link>}
      </header>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="font-semibold underline">Try again</button>
        </div>
      )}
      {operationsNotice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{operationsNotice}</p>}
      {operationsError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{operationsError}</p>}
      {!loading && staleDraftCount > 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>{staleDraftCount} draft{staleDraftCount === 1 ? "" : "s"}</strong> {staleDraftCount === 1 ? "has" : "have"} not been updated for over 30 days. <Link href="/admin/posts" className="font-semibold underline">Review content</Link>
      </p>}

      <section aria-label="Content summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="rounded-xl border border-cms-border bg-cms-surface p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-cms-muted">{label}</p>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon size={19} /></span>
            </div>
            <p className="mt-4 text-3xl font-bold text-cms-text">{loading ? "—" : value}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
        <section className="rounded-xl border border-cms-border bg-cms-surface shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cms-border px-5 py-4">
            <div>
              <h2 className="font-semibold text-cms-text">Recently updated</h2>
              <p className="mt-1 text-sm text-cms-muted">Your latest content changes.</p>
            </div>
            <Link href="/admin/posts" className="inline-flex items-center gap-1 text-sm font-medium text-cms-primary hover:underline">
              Browse content <ArrowRight size={15} />
            </Link>
          </div>
          {loading ? <p role="status" className="p-5 text-sm text-cms-muted">Loading content…</p>
            : recentEntries.length ? <ul className="divide-y divide-cms-border">
              {recentEntries.map((entry) => (
                <li key={entry.id}>
                  <Link href={role === "viewer" ? "/admin/posts" : `/admin/posts?edit=${encodeURIComponent(entry.id)}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-cms-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-cms-primary">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-cms-text">{entry.title}</p>
                    <p className="mt-1 text-xs text-cms-muted">{entry.category_name} · Updated {formatDate(entry.updated_at)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    entry.scheduled_publish_at ? "bg-[#ede9dd] text-[#695f53]"
                      : entry.status === "published" ? "bg-emerald-50 text-emerald-700"
                        : entry.status === "draft" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {entry.scheduled_publish_at ? "Scheduled" : entry.status}
                  </span>
                  </Link>
                </li>
              ))}
            </ul> : <p className="p-5 text-sm text-cms-muted">No content yet. Create a page, service, or blog post to get started.</p>}
        </section>

        <section className="rounded-xl border border-cms-border bg-cms-surface p-5 shadow-sm">
          <h2 className="font-semibold text-cms-text">Quick links</h2>
          <p className="mt-1 text-sm text-cms-muted">Jump to a section of your workspace.</p>
          <div className="mt-4 space-y-2">
            {([
              { href: "/admin/posts", label: "All content", roles: ["admin", "editor", "viewer"] },
              { href: "/admin/categories", label: "Categories", roles: ["admin", "editor", "viewer"] },
              { href: "/admin/pages", label: "Pages", roles: ["admin", "editor", "viewer"] },
              { href: "/admin/services", label: "Services", roles: ["admin", "editor", "viewer"] },
              { href: "/admin/blog", label: "Blog", roles: ["admin", "editor", "viewer"] },
              { href: "/admin/testimonials", label: "Testimonials", roles: ["admin", "editor"] },
              { href: "/admin/team", label: "Team", roles: ["admin", "editor"] },
              { href: "/admin/homepage", label: "Homepage sections", roles: ["admin", "editor"] },
              { href: "/admin/gallery", label: "Gallery", roles: ["admin", "editor"] },
              { href: "/admin/media", label: "Media library", roles: ["admin", "editor"] },
              { href: "/admin/enquiries", label: "Enquiries", roles: ["admin"] },
              { href: "/admin/activity", label: "Activity log", roles: ["admin"] },
              { href: "/admin/analytics", label: "Analytics", roles: ["admin"] },
              { href: "/admin/settings", label: "Settings", roles: ["admin"] },
            ] satisfies { href: string; label: string; roles: readonly CmsRole[] }[])
              .filter((item) => item.roles.includes(role)).map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-cms-text transition-colors hover:bg-cms-background">
                {item.label}<ArrowRight size={15} className="text-cms-muted" />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-cms-border bg-cms-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-cms-border px-5 py-4">
            <div><h2 className="font-semibold text-cms-text">Upcoming publishing</h2><p className="mt-1 text-sm text-cms-muted">Next scheduled content items.</p></div>
            <Clock3 size={18} className="text-cms-primary" />
          </div>
          {nextScheduled.length ? <ul className="divide-y divide-cms-border">
            {nextScheduled.map((entry) => <li key={entry.id}>
              <Link href={role === "viewer" ? "/admin/posts" : `/admin/posts?edit=${encodeURIComponent(entry.id)}`} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-cms-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-cms-primary">
              <div className="min-w-0"><p className="truncate text-sm font-medium text-cms-text">{entry.title}</p><p className="mt-1 text-xs text-cms-muted">{entry.category_name} · {formatDate(entry.scheduled_publish_at!)}</p></div>
              <span className="rounded-full bg-[#ede9dd] px-2.5 py-1 text-xs font-medium text-[#695f53]">Scheduled</span>
              </Link>
            </li>)}
          </ul> : <p className="p-5 text-sm text-cms-muted">No content is scheduled for publication.</p>}
        </section>
        {role === "admin" && <section className="rounded-xl border border-cms-border bg-cms-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-cms-border px-5 py-4">
            <div>
              <h2 className="font-semibold text-cms-text">Enquiry follow-up</h2>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <Link href="/admin/enquiries?status=new" className="font-medium text-cms-primary hover:underline">{newEnquiries} new</Link>
                <Link href="/admin/enquiries?queue=unassigned" className="font-medium text-cms-primary hover:underline">{unassignedEnquiries} unassigned</Link>
                <Link href="/admin/enquiries?queue=overdue" className="font-medium text-cms-primary hover:underline">{overdueFollowUps} overdue</Link>
              </div>
            </div>
            <Mail size={18} className="text-cms-primary" />
          </div>
          <div className="p-5">
            <Link href="/admin/enquiries" className="inline-flex items-center gap-1 text-sm font-medium text-cms-primary hover:underline">Open enquiry inbox <ArrowRight size={15} /></Link>
            {activities.length > 0 && <div className="mt-5 border-t border-cms-border pt-4">
              <div className="mb-3 flex items-center gap-2"><Activity size={15} className="text-cms-muted" /><h3 className="text-sm font-semibold text-cms-text">Recent team activity</h3><Link href="/admin/activity" className="ml-auto text-xs font-medium text-cms-primary hover:underline">View log</Link></div>
              <ul className="space-y-2">{activities.slice(0, 3).map((event) => <li key={event.id} className="text-sm"><span className="font-medium text-cms-text">{event.actor_name}</span><span className="text-cms-muted"> · {event.summary}</span></li>)}</ul>
            </div>}
          </div>
        </section>}
      </div>

      {role === "admin" && operations && <section className="rounded-xl border border-cms-border bg-cms-surface shadow-sm">
        <div className="flex items-center gap-3 border-b border-cms-border px-5 py-4">
          <Server size={18} className="text-cms-primary" />
          <div>
            <h2 className="font-semibold text-cms-text">Operations at a glance</h2>
            <p className="mt-1 text-sm text-cms-muted">Live checks from this application instance.</p>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
          <article>
            <h3 className="text-sm font-semibold text-cms-text">Media storage</h3>
            <p className={`mt-1 text-sm ${operations.mediaAvailable ? "text-emerald-700" : "text-red-700"}`}>
              {operations.mediaAvailable ? "Available" : "Unavailable"}
            </p>
          </article>
          <article>
            <h3 className="text-sm font-semibold text-cms-text">Enquiry alerts</h3>
            <p className="mt-1 text-sm text-cms-muted">
              {operations.notifications.configured
                ? "SMTP settings are present; delivery is not verified. "
                : "SMTP is not configured. "}
              {operations.notifications.pending} queued · {operations.notifications.due} due now · {operations.notifications.exhausted} exhausted
            </p>
            <button type="button" disabled={testingSmtp || !operations.notifications.configured}
              onClick={() => void testSmtpConnection()}
              className="mt-2 rounded-md border border-cms-border px-3 py-1.5 text-xs font-medium text-cms-text disabled:opacity-50">
              {testingSmtp ? "Testing SMTP…" : "Test SMTP connection"}
            </button>
            {operations.notifications.exhausted > 0 && <>
              <p className="mt-1 text-sm font-medium text-red-700">Investigate failed deliveries and retry after resolving SMTP.</p>
              <button type="button" disabled={retryingNotifications || !operations.notifications.configured} onClick={() => void retryNotifications()} className="mt-2 rounded-md border border-cms-border px-3 py-1.5 text-xs font-medium text-cms-text disabled:opacity-50">
                {retryingNotifications ? "Requeuing…" : "Requeue exhausted alerts"}
              </button>
            </>}
          </article>
          <article>
            <h3 className="text-sm font-semibold text-cms-text">Scheduled publishing</h3>
            <p className="mt-1 text-sm text-cms-muted">
              {operations.publishing.overdue > 0
                ? `${operations.publishing.overdue} item${operations.publishing.overdue === 1 ? "" : "s"} are past their publish time`
                : `${operations.publishing.scheduled} scheduled item${operations.publishing.scheduled === 1 ? "" : "s"}`}
            </p>
            {operations.publishing.nextAt && <p className="mt-1 text-xs text-cms-muted">Next: {formatDate(operations.publishing.nextAt)}</p>}
          </article>
        </div>
        <div className="border-t border-cms-border px-5 py-4">
          <h3 className="text-sm font-semibold text-cms-text">Scheduled job history</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              { key: "backup", label: "Daily backup" },
              { key: "backup-check", label: "Backup verification" },
              { key: "notifications", label: "Enquiry alerts" },
              { key: "publishing", label: "Scheduled publishing" },
              { key: "maintenance", label: "Data maintenance" },
            ].map((job) => {
              const run = operations.jobs.find((item) => item.job_key === job.key);
              return <article key={job.key} className="rounded-lg bg-cms-background p-3">
                <h4 className="text-xs font-semibold text-cms-text">{job.label}</h4>
                <p className={`mt-1 text-xs font-medium ${run?.status === "failed" ? "text-red-700" : run?.status === "succeeded" ? "text-emerald-700" : "text-cms-muted"}`}>
                  {run ? run.status === "running" ? "Running" : run.status === "succeeded" ? "Last run succeeded" : "Last run failed" : "No recorded run"}
                </p>
                {run?.finished_at && <p className="mt-1 text-xs text-cms-muted">{formatDate(run.finished_at)}</p>}
                {run?.summary && <p className="mt-1 text-xs text-cms-muted">{run.summary}</p>}
              </article>;
            })}
          </div>
        </div>
        <p className="border-t border-cms-border px-5 py-3 text-xs text-cms-muted">
          Job history reflects the latest run recorded by scripts using this app database. It cannot prove the hosting scheduler is configured or detect a job that never started.
        </p>
      </section>}

      <p className="text-xs text-cms-muted">Content counts include all categories. Scheduled items are drafts with a publication time set. Appointment enquiries are visible only to administrators.</p>
    </div>
  );
}
