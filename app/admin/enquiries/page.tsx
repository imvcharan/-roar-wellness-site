"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Phone, Search, Trash2 } from "lucide-react";
import { cmsRequest } from "@/services/cms-api";

type EnquiryStatus = "new" | "contacted" | "scheduled" | "closed";
interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: "appointment" | "contact";
  status: EnquiryStatus;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  follow_up_at: string | null;
  created_at: string;
}
interface StaffUser { id: string; name: string; role: "admin" | "editor" | "viewer" }
interface EnquiryResponse {
  data: Enquiry[];
  pagination: { page: number; pageSize: number; total: number; pages: number };
  summary: { total: number; new: number; open: number; overdue: number };
}

const statuses: { value: EnquiryStatus; label: string; style: string }[] = [
  { value: "new", label: "New", style: "bg-[#ede9dd] text-[#695f53]" },
  { value: "contacted", label: "Contacted", style: "bg-[#e8dfd6] text-[#69513f]" },
  { value: "scheduled", label: "Scheduled", style: "bg-[#e4ede5] text-[#3f6b52]" },
  { value: "closed", label: "Closed", style: "bg-[#f1eee8] text-[#786f66]" },
];

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function dateTimeInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function EnquiriesPage() {
  const [result, setResult] = useState<EnquiryResponse | null>(null);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [followUpDrafts, setFollowUpDrafts] = useState<Record<string, string>>({});
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), status: statusFilter });
      if (search) params.set("q", search);
      const [enquiryResponse, usersResponse] = await Promise.all([
        cmsRequest<EnquiryResponse>(`/api/cms/enquiries?${params.toString()}`),
        cmsRequest<{ data: StaffUser[] }>("/api/cms/users"),
      ]);
      setResult(enquiryResponse);
      setStaff(usersResponse.data);
      setFollowUpDrafts(Object.fromEntries(enquiryResponse.data.map((item) => [item.id, dateTimeInputValue(item.follow_up_at)])));
      setError("");
      if (enquiryResponse.pagination.page !== page) setPage(enquiryResponse.pagination.page);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load enquiries.");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const update = async (enquiry: Enquiry, changes: { status?: EnquiryStatus; assignedUserId?: string | null; followUpAt?: string | null }) => {
    setSavingId(enquiry.id);
    setError("");
    try {
      await cmsRequest("/api/cms/enquiries", {
        method: "PATCH",
        body: JSON.stringify({ id: enquiry.id, ...changes }),
      });
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update enquiry.");
    } finally {
      setSavingId(null);
    }
  };

  const saveFollowUp = (enquiry: Enquiry) => {
    const draft = followUpDrafts[enquiry.id] || "";
    void update(enquiry, { followUpAt: draft ? new Date(draft).toISOString() : null });
  };

  const remove = async (enquiry: Enquiry) => {
    if (!window.confirm(`Permanently delete the enquiry from ${enquiry.name}?`)) return;
    try {
      await cmsRequest(`/api/cms/enquiries?id=${encodeURIComponent(enquiry.id)}`, { method: "DELETE" });
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete enquiry.");
    }
  };

  const summary = result?.summary;
  const stats = [
    { label: "New", value: summary?.new ?? 0 },
    { label: "Open", value: summary?.open ?? 0 },
    { label: "Overdue follow-ups", value: summary?.overdue ?? 0 },
    { label: "All enquiries", value: summary?.total ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cms-primary">Client care</p>
          <h1 className="mt-1 text-3xl font-bold text-cms-text">Enquiries</h1>
          <p className="mt-2 text-sm text-cms-muted">Manage contact requests and follow-ups. Records are securely stored for up to 12 months.</p>
        </div>
      </header>
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Enquiries contain personal contact information. Limit access, follow up promptly, and do not add clinical notes. Records are automatically removed after 12 months.
      </p>
      <section aria-label="Enquiry summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <article key={stat.label} className="rounded-xl border border-cms-border bg-cms-surface px-4 py-3">
          <p className="text-sm text-cms-muted">{stat.label}</p>
          <p className="mt-1 text-2xl font-bold text-cms-text">{loading ? "—" : stat.value}</p>
        </article>)}
      </section>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <section className="rounded-xl border border-cms-border bg-cms-surface p-4 shadow-sm">
        <form onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }} className="flex flex-wrap gap-3">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search enquiries</span>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cms-muted" />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} maxLength={100} placeholder="Search name, email, phone, or source" className="w-full rounded-lg border border-cms-border bg-white py-2 pl-9 pr-3 text-sm text-cms-text" />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="rounded-lg border border-cms-border bg-white px-3 py-2 text-sm text-cms-text">
              <option value="all">All statuses</option>
              {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-cms-primary px-4 py-2 text-sm font-medium text-white hover:bg-cms-primary-hover">Search</button>
        </form>
      </section>
      <section className="overflow-hidden rounded-xl border border-cms-border bg-cms-surface shadow-sm">
        {loading ? <p role="status" className="p-8 text-center text-sm text-cms-muted">Loading enquiries…</p>
          : result?.data.length ? <div className="divide-y divide-cms-border">
            {result.data.map((item) => {
              const selectedStatus = statuses.find((status) => status.value === item.status)!;
              const overdue = item.status !== "closed" && item.follow_up_at !== null && Date.parse(item.follow_up_at) < Date.now();
              return <article key={item.id} className="grid gap-4 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,auto)] xl:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-cms-text">{item.name}</h2>
                    <span className="rounded-full bg-cms-background px-2 py-0.5 text-xs capitalize text-cms-muted">{item.source}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${selectedStatus.style}`}>{selectedStatus.label}</span>
                    {overdue && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">Follow-up overdue</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-cms-muted">
                    <a className="inline-flex items-center gap-1.5 hover:text-cms-primary" href={`mailto:${item.email}`}><Mail size={14} />{item.email}</a>
                    <a className="inline-flex items-center gap-1.5 hover:text-cms-primary" href={`tel:${item.phone.replace(/[^\d+]/g, "")}`}><Phone size={14} />{item.phone}</a>
                  </div>
                  <p className="mt-2 text-xs text-cms-muted">Received {dateLabel(item.created_at)}{item.follow_up_at ? ` · Follow up ${dateLabel(item.follow_up_at)}` : ""}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[auto_190px_230px_auto] xl:items-center">
                  <label>
                    <span className="sr-only">Status for {item.name}</span>
                    <select disabled={savingId === item.id} value={item.status} onChange={(event) => void update(item, { status: event.target.value as EnquiryStatus })} className="w-full rounded-lg border border-cms-border bg-white px-3 py-2 text-sm text-cms-text">
                      {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="sr-only">Assigned administrator for {item.name}</span>
                    <select disabled={savingId === item.id} value={item.assigned_user_id ?? ""} onChange={(event) => void update(item, { assignedUserId: event.target.value || null })} className="w-full rounded-lg border border-cms-border bg-white px-3 py-2 text-sm text-cms-text">
                      <option value="">Unassigned</option>
                      {staff.filter((member) => member.role === "admin").map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="sr-only">Follow-up date for {item.name}</span>
                    <input type="datetime-local" disabled={savingId === item.id} value={followUpDrafts[item.id] ?? ""} onChange={(event) => setFollowUpDrafts((current) => ({ ...current, [item.id]: event.target.value }))} className="min-w-0 flex-1 rounded-lg border border-cms-border bg-white px-2 py-2 text-xs text-cms-text" />
                    <button type="button" disabled={savingId === item.id || (followUpDrafts[item.id] ?? "") === dateTimeInputValue(item.follow_up_at)} onClick={() => saveFollowUp(item)} className="rounded-md border border-cms-border px-2 py-2 text-xs font-medium text-cms-text disabled:opacity-50">Save</button>
                  </label>
                  <button type="button" aria-label={`Delete enquiry from ${item.name}`} onClick={() => void remove(item)} className="justify-self-start rounded-lg p-2 text-cms-muted hover:bg-red-50 hover:text-red-700 xl:justify-self-center"><Trash2 size={17} /></button>
                </div>
              </article>;
            })}
          </div> : <p className="p-10 text-center text-sm text-cms-muted">{result?.pagination.total ? "No enquiries match these filters." : "No enquiries yet. New appointment requests will appear here."}</p>}
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
