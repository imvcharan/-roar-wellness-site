"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Phone, Trash2 } from "lucide-react";
import { cmsRequest } from "@/services/cms-api";

type EnquiryStatus = "new" | "contacted" | "scheduled" | "closed";
interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: "appointment" | "contact";
  status: EnquiryStatus;
  created_at: string;
}

const statuses: { value: EnquiryStatus; label: string; style: string }[] = [
  { value: "new", label: "New", style: "bg-[#ede9dd] text-[#695f53]" },
  { value: "contacted", label: "Contacted", style: "bg-[#e8dfd6] text-[#69513f]" },
  { value: "scheduled", label: "Scheduled", style: "bg-[#e4ede5] text-[#3f6b52]" },
  { value: "closed", label: "Closed", style: "bg-[#f1eee8] text-[#786f66]" },
];

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await cmsRequest<{ data: Enquiry[] }>("/api/cms/enquiries");
      setEnquiries(result.data);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load enquiries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateStatus = async (enquiry: Enquiry, status: EnquiryStatus) => {
    try {
      await cmsRequest("/api/cms/enquiries", { method: "PATCH", body: JSON.stringify({ id: enquiry.id, status }) });
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update enquiry.");
    }
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

  const newCount = enquiries.filter((item) => item.status === "new").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cms-primary">Client care</p>
          <h1 className="mt-1 text-3xl font-bold text-cms-text">Enquiries</h1>
          <p className="mt-2 text-sm text-cms-muted">Contact requests, securely stored for up to 12 months.</p>
        </div>
        <div className="rounded-xl border border-cms-border bg-cms-surface px-4 py-3 text-sm">
          <span className="font-semibold text-cms-text">{loading ? "—" : newCount}</span>
          <span className="ml-2 text-cms-muted">new requests</span>
        </div>
      </header>
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Enquiries contain personal contact information. Please keep access limited, follow up promptly, and do not add clinical notes here. Records are automatically removed after 12 months.
      </p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <section className="overflow-hidden rounded-xl border border-cms-border bg-cms-surface shadow-sm">
        {loading ? <p role="status" className="p-8 text-center text-sm text-cms-muted">Loading enquiries…</p>
          : enquiries.length ? <div className="divide-y divide-cms-border">
            {enquiries.map((item) => {
              const selectedStatus = statuses.find((status) => status.value === item.status)!;
              return <article key={item.id} className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-cms-text">{item.name}</h2>
                    <span className="rounded-full bg-cms-background px-2 py-0.5 text-xs capitalize text-cms-muted">{item.source}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${selectedStatus.style}`}>{selectedStatus.label}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-cms-muted">
                    <a className="inline-flex items-center gap-1.5 hover:text-cms-primary" href={`mailto:${item.email}`}><Mail size={14} />{item.email}</a>
                    <a className="inline-flex items-center gap-1.5 hover:text-cms-primary" href={`tel:${item.phone.replace(/[^\d+]/g, "")}`}><Phone size={14} />{item.phone}</a>
                  </div>
                  <p className="mt-2 text-xs text-cms-muted">{dateLabel(item.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`status-${item.id}`}>Enquiry status for {item.name}</label>
                  <select id={`status-${item.id}`} value={item.status} onChange={(event) => void updateStatus(item, event.target.value as EnquiryStatus)} className="rounded-lg border border-cms-border bg-white px-3 py-2 text-sm text-cms-text">
                    {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                  <button type="button" aria-label={`Delete enquiry from ${item.name}`} onClick={() => void remove(item)} className="rounded-lg p-2 text-cms-muted hover:bg-red-50 hover:text-red-700"><Trash2 size={17} /></button>
                </div>
              </article>;
            })}
          </div> : <p className="p-10 text-center text-sm text-cms-muted">No enquiries yet. New appointment requests will appear here.</p>}
      </section>
    </div>
  );
}
