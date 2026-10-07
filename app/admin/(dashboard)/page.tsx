"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BookOpen, BriefcaseBusiness, Clock3, FileText, Plus } from "lucide-react";
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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await cmsRequest<{ data: CmsEntry[] }>("/api/cms/content?all=1");
      setEntries(result.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the admin overview.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const published = entries.filter((entry) => entry.status === "published").length;
  const drafts = entries.filter((entry) => entry.status === "draft" && !entry.scheduled_publish_at).length;
  const scheduled = entries.filter((entry) => entry.scheduled_publish_at).length;
  const archived = entries.filter((entry) => entry.status === "archived").length;
  const recentEntries = entries.slice(0, 6);

  const stats = [
    { label: "Published", value: published, icon: FileText, color: "text-emerald-700 bg-emerald-50" },
    { label: "Drafts", value: drafts, icon: BookOpen, color: "text-amber-700 bg-amber-50" },
    { label: "Scheduled", value: scheduled, icon: Clock3, color: "text-blue-700 bg-blue-50" },
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
        <Link href="/admin/posts" className="inline-flex items-center justify-center gap-2 rounded-lg bg-cms-primary px-4 py-2 text-base font-medium text-white transition-colors hover:bg-cms-primary-hover">
          <Plus size={17} /> Create content
        </Link>
      </header>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="font-semibold underline">Try again</button>
        </div>
      )}

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
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-cms-text">{entry.title}</p>
                    <p className="mt-1 text-xs text-cms-muted">{entry.category_name} · Updated {formatDate(entry.updated_at)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    entry.scheduled_publish_at ? "bg-blue-50 text-blue-700"
                      : entry.status === "published" ? "bg-emerald-50 text-emerald-700"
                        : entry.status === "draft" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {entry.scheduled_publish_at ? "Scheduled" : entry.status}
                  </span>
                </li>
              ))}
            </ul> : <p className="p-5 text-sm text-cms-muted">No content yet. Create a page, service, or blog post to get started.</p>}
        </section>

        <section className="rounded-xl border border-cms-border bg-cms-surface p-5 shadow-sm">
          <h2 className="font-semibold text-cms-text">Quick links</h2>
          <p className="mt-1 text-sm text-cms-muted">Jump to a section of your workspace.</p>
          <div className="mt-4 space-y-2">
            {[
              { href: "/admin/posts", label: "All content" },
              { href: "/admin/categories", label: "Categories" },
              { href: "/admin/pages", label: "Pages" },
              { href: "/admin/services", label: "Services" },
              { href: "/admin/blog", label: "Blog" },
              { href: "/admin/homepage", label: "Homepage sections" },
              { href: "/admin/media", label: "Media library" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-cms-text transition-colors hover:bg-cms-background">
                {item.label}<ArrowRight size={15} className="text-cms-muted" />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <p className="text-xs text-cms-muted">Content counts include all categories. Scheduled items are drafts with a publication time set.</p>
    </div>
  );
}
