"use client";

import { useCallback, useEffect, useState } from "react";
import { cmsRequest } from "@/services/cms-api";

interface CmsMedia {
  id: string;
  filename: string;
  url: string;
  mime_type: string;
  size: number;
  width: number;
  height: number;
  created_at: string;
}

export default function MediaPage() {
  const [media, setMedia] = useState<CmsMedia[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await cmsRequest<{ data: CmsMedia[] }>("/api/cms/media");
      setMedia(result.data);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load media.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    cmsRequest<{ data: { role: string } }>("/api/cms/session")
      .then(({ data }) => setIsAdmin(data.role === "admin"))
      .catch((requestError: unknown) => console.error("Unable to load media permissions.", requestError));
  }, [load]);

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.set("file", file);
      await cmsRequest("/api/cms/media", { method: "POST", body: form });
      setMessage("Image uploaded and optimized.");
      await load();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: CmsMedia) => {
    if (!window.confirm(`Delete ${item.filename}?`)) return;
    setError("");
    try {
      await cmsRequest(`/api/cms/media/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      setMessage("Image deleted.");
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Image deletion failed.");
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Image URL copied.");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Could not copy image URL.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-cms-text">Media library</h1>
          <p className="mt-2 text-sm text-cms-muted">Upload images up to 50 MB; uploads are validated, resized, and stored as WebP.</p>
        </div>
        <label className="cursor-pointer rounded-lg bg-cms-primary px-4 py-2 font-medium text-white hover:bg-cms-primary-hover">
          {busy ? "Uploading..." : "Upload image"}
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/tiff,image/avif" disabled={busy} onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }} />
        </label>
      </header>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
      {media.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {media.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-xl border border-cms-border bg-cms-surface">
            <img src={item.url} alt={item.filename} className="aspect-square w-full bg-cms-background object-cover" />
            <div className="space-y-2 p-3">
              <p className="truncate text-sm font-medium text-cms-text" title={item.filename}>{item.filename}</p>
              <p className="text-xs text-cms-muted">{item.width} × {item.height} · {(item.size / 1024).toFixed(0)} KB</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => void copyUrl(item.url)} className="text-sm font-medium text-cms-primary">Copy URL</button>
                {isAdmin && <button type="button" onClick={() => void remove(item)} className="text-sm font-medium text-red-700">Delete</button>}
              </div>
            </div>
          </article>
        ))}
      </div> : loading
        ? <p role="status" className="rounded-xl border border-dashed border-cms-border p-10 text-center text-cms-muted">Loading media library…</p>
        : <p className="rounded-xl border border-dashed border-cms-border p-10 text-center text-cms-muted">No images uploaded yet.</p>}
    </div>
  );
}
