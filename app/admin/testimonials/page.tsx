"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { MessageSquareQuote, Pencil, Plus, Trash2, X } from "lucide-react";
import { AdminFeedback } from "@/components/admin/AdminFeedback";
import { MediaImageField } from "@/components/admin/MediaImageField";
import { Button } from "@/components/ui/Button";
import { cmsRequest } from "@/services/cms-api";

interface Testimonial {
  section_key: string;
  group_name: string;
  heading: string;
  eyebrow: string | null;
  body: string | null;
  image_url: string | null;
  position: number;
  is_published: number;
}

type CmsRole = "admin" | "editor" | "viewer";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "The CMS request failed.";
}

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [role, setRole] = useState<CmsRole | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [attribution, setAttribution] = useState("Client review");
  const [quote, setQuote] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [position, setPosition] = useState("0");
  const [published, setPublished] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [testimonialResult, sessionResult] = await Promise.all([
        cmsRequest<{ data: Testimonial[] }>("/api/cms/home"),
        cmsRequest<{ data: { role: CmsRole } }>("/api/cms/session"),
      ]);
      setTestimonials(testimonialResult.data.filter((item) => item.group_name === "reviews"));
      setRole(sessionResult.data.role);
      setError("");
    } catch (loadError) {
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setAttribution("Client review");
    setQuote("");
    setImageUrl("");
    setPosition("0");
    setPublished(true);
  };

  const startEdit = (testimonial: Testimonial) => {
    setEditingId(testimonial.section_key);
    setName(testimonial.heading);
    setAttribution(testimonial.eyebrow || "");
    setQuote(testimonial.body || "");
    setImageUrl(testimonial.image_url || "");
    setPosition(String(testimonial.position));
    setPublished(testimonial.is_published === 1);
    setError("");
    setNotice("");
  };

  const saveTestimonial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (uploadingImage) return;
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const payload = {
        group_name: "reviews",
        heading: name,
        eyebrow: attribution,
        body: quote,
        image_url: imageUrl,
        position: Number(position),
        is_published: published,
      };
      const path = editingId
        ? `/api/cms/home/${encodeURIComponent(editingId)}`
        : "/api/cms/home";
      await cmsRequest(path, {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setNotice(editingId ? "Testimonial updated." : "Testimonial added.");
      resetForm();
      await load();
    } catch (saveError) {
      setError(messageOf(saveError));
    } finally {
      setSaving(false);
    }
  };

  const deleteTestimonial = async (testimonial: Testimonial) => {
    if (!window.confirm(`Delete the testimonial from “${testimonial.heading}”? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    setDeletingId(testimonial.section_key);
    try {
      await cmsRequest(`/api/cms/home/${encodeURIComponent(testimonial.section_key)}`, { method: "DELETE" });
      if (editingId === testimonial.section_key) resetForm();
      setNotice(`Testimonial from “${testimonial.heading}” deleted.`);
      await load();
    } catch (deleteError) {
      setError(messageOf(deleteError));
    } finally {
      setDeletingId(null);
    }
  };

  const canEdit = role === "admin" || role === "editor";

  return (
    <div className="w-full space-y-7">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-cms-primary">Homepage content</p>
        <h1 className="mt-1 text-3xl font-bold text-cms-text">Testimonials</h1>
        <p className="mt-2 max-w-2xl text-cms-muted">Add and manage the client stories shown on the public website. Unpublished testimonials remain private in the CMS.</p>
      </header>

      <AdminFeedback
        error={error}
        notice={notice}
        progress={saving ? "Saving testimonial…" : deletingId ? "Deleting testimonial…" : undefined}
      />

      {canEdit && <section aria-labelledby="testimonial-form-title" className="rounded-xl border border-cms-border bg-cms-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          {editingId ? <Pencil size={17} className="text-cms-primary" /> : <Plus size={18} className="text-cms-primary" />}
          <h2 id="testimonial-form-title" className="font-semibold text-cms-text">{editingId ? "Edit testimonial" : "Add a testimonial"}</h2>
        </div>
        <form onSubmit={(event) => void saveTestimonial(event)} className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-cms-text">
            Client name
            <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} className="mt-1.5 block w-full rounded-lg border border-cms-border bg-white px-3 py-2.5 font-normal outline-none focus:border-cms-primary" />
          </label>
          <label className="text-sm font-medium text-cms-text">
            Label
            <input value={attribution} onChange={(event) => setAttribution(event.target.value)} maxLength={200} placeholder="Client review" className="mt-1.5 block w-full rounded-lg border border-cms-border bg-white px-3 py-2.5 font-normal outline-none focus:border-cms-primary" />
          </label>
          <label className="text-sm font-medium text-cms-text md:col-span-2">
            Testimonial
            <textarea value={quote} onChange={(event) => setQuote(event.target.value)} required maxLength={5000} rows={4} className="mt-1.5 block w-full rounded-lg border border-cms-border bg-white px-3 py-2.5 font-normal outline-none focus:border-cms-primary" />
          </label>
          <MediaImageField
            name="image_url"
            label="Client image (optional)"
            value={imageUrl}
            onChange={setImageUrl}
            onUploadingChange={setUploadingImage}
            previewMode="cover"
            previewAlt={name ? `${name} testimonial image` : "Testimonial image preview"}
            className="md:col-span-2"
          />
          <label className="text-sm font-medium text-cms-text">
            Display position
            <input value={position} onChange={(event) => setPosition(event.target.value)} type="number" min="0" max="1000" step="1" required className="mt-1.5 block w-full rounded-lg border border-cms-border bg-white px-3 py-2.5 font-normal outline-none focus:border-cms-primary" />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-cms-text">
            <input checked={published} onChange={(event) => setPublished(event.target.checked)} type="checkbox" />
            Published on the website
          </label>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={saving || uploadingImage}>{saving ? "Saving…" : editingId ? "Save changes" : "Add testimonial"}</Button>
            {editingId && <Button type="button" variant="secondary" onClick={resetForm}><X size={15} /> Cancel</Button>}
          </div>
        </form>
      </section>}

      <section aria-labelledby="testimonial-list-title" className="overflow-hidden rounded-xl border border-cms-border bg-cms-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-cms-border px-5 py-4">
          <div>
            <h2 id="testimonial-list-title" className="font-semibold text-cms-text">All testimonials</h2>
            <p className="mt-1 text-sm text-cms-muted">{testimonials.length} testimonials · ordered by display position</p>
          </div>
          <MessageSquareQuote size={19} className="text-cms-muted" aria-hidden="true" />
        </div>
        {loading ? <p role="status" className="p-5 text-sm text-cms-muted">Loading testimonials…</p>
          : testimonials.length ? <div className="divide-y divide-cms-border">
            {testimonials.map((testimonial) => (
              <article key={testimonial.section_key} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                <div className="flex min-w-0 flex-1 gap-3">
                  {testimonial.image_url
                    ? <img src={testimonial.image_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                    : <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ede9dd] font-semibold text-[#695f53]">{testimonial.heading.trim().charAt(0).toUpperCase()}</span>}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-cms-text">{testimonial.heading}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${testimonial.is_published === 1 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {testimonial.is_published === 1 ? "Published" : "Unpublished"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-cms-muted">{testimonial.eyebrow || "Client review"} · Position {testimonial.position}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-cms-muted">{testimonial.body}</p>
                  </div>
                </div>
                {canEdit && <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => startEdit(testimonial)} aria-label={`Edit testimonial from ${testimonial.heading}`}>
                    <Pencil size={14} /> Edit
                  </Button>
                  {role === "admin" && <Button type="button" variant="danger" size="sm" disabled={deletingId === testimonial.section_key} onClick={() => void deleteTestimonial(testimonial)} aria-label={`Delete testimonial from ${testimonial.heading}`}>
                    <Trash2 size={14} /> {deletingId === testimonial.section_key ? "Deleting…" : "Delete"}
                  </Button>}
                </div>}
              </article>
            ))}
          </div> : <p className="p-5 text-sm text-cms-muted">No testimonials yet. Add one above to share a client story.</p>}
      </section>
    </div>
  );
}
