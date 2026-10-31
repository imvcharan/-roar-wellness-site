"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AdminFeedback } from "@/components/admin/AdminFeedback";
import { MediaImageField } from "@/components/admin/MediaImageField";
import { Button } from "@/components/ui/Button";
import { cmsRequest } from "@/services/cms-api";

interface GalleryItem {
  id: string;
  image_url: string;
  alt_text: string;
  caption: string;
  position: number;
  is_published: number;
  updated_at?: string;
}

const emptyDraft = {
  image_url: "",
  alt_text: "",
  caption: "",
  position: "0",
  is_published: true,
};

export default function GalleryAdminPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState<Record<string, Partial<GalleryItem>>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await cmsRequest<{ data: GalleryItem[] }>('/api/cms/gallery');
      setItems(result.data);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load gallery images.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveNew = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await cmsRequest('/api/cms/gallery', {
        method: 'POST',
        body: JSON.stringify({
          image_url: draft.image_url,
          alt_text: draft.alt_text,
          caption: draft.caption,
          position: Number(draft.position),
          is_published: draft.is_published,
        }),
      });
      setDraft(emptyDraft);
      setNotice('Gallery image added.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to add gallery image.');
    } finally {
      setBusy(false);
    }
  };

  const saveExisting = async (item: GalleryItem) => {
    const next = editing[item.id] ?? item;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await cmsRequest(`/api/cms/gallery/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          image_url: next.image_url,
          alt_text: next.alt_text,
          caption: next.caption,
          position: Number(next.position ?? 0),
          is_published: Boolean(next.is_published),
        }),
      });
      setEditing((current) => ({ ...current, [item.id]: {} }));
      setNotice(`${item.id.slice(0, 8)} updated.`);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update gallery image.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: GalleryItem) => {
    if (!window.confirm(`Remove this gallery image?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await cmsRequest(`/api/cms/gallery/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      setNotice('Gallery image removed.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to remove gallery image.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-cms-text">Gallery management</h1>
        <p className="mt-2 text-sm text-cms-muted">Upload, update, reorder, and remove gallery images from the site gallery.</p>
      </header>
      <AdminFeedback error={error} notice={notice} progress={busy ? 'Saving gallery changes…' : uploadingImage ? 'Uploading image…' : undefined} />

      <div className="rounded-xl border border-cms-border bg-cms-surface p-4">
        <form onSubmit={(event) => { void saveNew(event); }} className="grid gap-4 md:grid-cols-2">
          <MediaImageField
            label="Image"
            name="image_url"
            value={draft.image_url}
            onChange={(value) => setDraft((current) => ({ ...current, image_url: value }))}
            onUploadingChange={setUploadingImage}
            previewMode="cover"
          />
          <label className="text-sm font-medium text-cms-text">
            Alt text
            <input value={draft.alt_text} onChange={(event) => setDraft((current) => ({ ...current, alt_text: event.target.value }))} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" maxLength={250} />
          </label>
          <label className="text-sm font-medium text-cms-text">
            Caption
            <input value={draft.caption} onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value }))} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" maxLength={250} />
          </label>
          <label className="text-sm font-medium text-cms-text">
            Position
            <input type="number" value={draft.position} min="0" onChange={(event) => setDraft((current) => ({ ...current, position: event.target.value }))} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-cms-text">
            <input type="checkbox" checked={draft.is_published} onChange={(event) => setDraft((current) => ({ ...current, is_published: event.target.checked }))} />
            Published
          </label>
          <div className="md:col-span-2">
            <Button type="submit" disabled={busy || uploadingImage}>{busy ? 'Saving…' : 'Add image'}</Button>
          </div>
        </form>
      </div>

      {loading ? <p className="rounded-xl border border-dashed border-cms-border p-8 text-center text-cms-muted">Loading gallery…</p> : items.length === 0 ? <p className="rounded-xl border border-dashed border-cms-border p-8 text-center text-cms-muted">No gallery images yet.</p> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const draftItem = { ...item, ...(editing[item.id] ?? {}) } as GalleryItem;
            return (
              <article key={item.id} className="overflow-hidden rounded-xl border border-cms-border bg-cms-surface">
                <img src={item.image_url} alt={item.alt_text || item.caption || 'Gallery image'} className="aspect-[4/3] w-full object-cover" />
                <div className="space-y-3 p-3">
                  <MediaImageField
                    label="Image URL"
                    name={`image_url_${item.id}`}
                    value={draftItem.image_url}
                    onChange={(value) => setEditing((current) => ({ ...current, [item.id]: { ...((current[item.id] ?? item)), image_url: value } }))}
                    onUploadingChange={setUploadingImage}
                    previewMode="cover"
                  />
                  <label className="text-sm font-medium text-cms-text">
                    Alt text
                    <input value={draftItem.alt_text || ''} onChange={(event) => setEditing((current) => ({ ...current, [item.id]: { ...((current[item.id] ?? item)), alt_text: event.target.value } }))} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" maxLength={250} />
                  </label>
                  <label className="text-sm font-medium text-cms-text">
                    Caption
                    <input value={draftItem.caption || ''} onChange={(event) => setEditing((current) => ({ ...current, [item.id]: { ...((current[item.id] ?? item)), caption: event.target.value } }))} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" maxLength={250} />
                  </label>
                  <label className="text-sm font-medium text-cms-text">
                    Position
                    <input type="number" value={draftItem.position ?? 0} min="0" onChange={(event) => setEditing((current) => ({ ...current, [item.id]: { ...((current[item.id] ?? item)), position: Number(event.target.value) } }))} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" />
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-cms-text">
                    <input type="checkbox" checked={Boolean(draftItem.is_published)} onChange={(event) => setEditing((current) => ({ ...current, [item.id]: { ...((current[item.id] ?? item)), is_published: event.target.checked ? 1 : 0 } }))} />
                    Published
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => void saveExisting(item)} disabled={busy || uploadingImage}>Save</Button>
                    <Button type="button" variant="secondary" onClick={() => void remove(item)} disabled={busy || uploadingImage}>Remove</Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
