"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { FolderTree, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cmsRequest } from "@/services/cms-api";

interface Category {
  id: string;
  name: string;
  slug: string;
  is_default: number;
}

interface CmsEntry {
  category_id: string;
}

type CmsRole = "admin" | "editor" | "viewer";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "The CMS request failed.";
}

function slugFromName(value: string): string {
  return value.normalize("NFKD").toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [role, setRole] = useState<CmsRole>("viewer");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [categoryResult, contentResult, sessionResult] = await Promise.all([
        cmsRequest<{ data: Category[] }>("/api/cms/categories"),
        cmsRequest<{ data: CmsEntry[] }>("/api/cms/content?all=1"),
        cmsRequest<{ data: { role: CmsRole } }>("/api/cms/session"),
      ]);
      setCategories(categoryResult.data);
      setCounts(contentResult.data.reduce<Record<string, number>>((result, entry) => {
        result[entry.category_id] = (result[entry.category_id] ?? 0) + 1;
        return result;
      }, {}));
      setRole(sessionResult.data.role);
    } catch (loadError) {
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resetForm = () => {
    setName("");
    setSlug("");
    setSlugEdited(false);
    setEditingId(null);
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setSlug(category.slug);
    setSlugEdited(true);
    setError("");
    setNotice("");
  };

  const submitCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const path = editingId ? `/api/cms/categories/${encodeURIComponent(editingId)}` : "/api/cms/categories";
      await cmsRequest(path, {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify({ name, slug }),
      });
      setNotice(editingId ? "Category updated." : "Category created.");
      resetForm();
      await load();
    } catch (saveError) {
      setError(messageOf(saveError));
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (category: Category) => {
    if (!window.confirm(`Delete “${category.name}”? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    try {
      await cmsRequest(`/api/cms/categories/${encodeURIComponent(category.id)}`, { method: "DELETE" });
      setNotice(`“${category.name}” was deleted.`);
      await load();
    } catch (deleteError) {
      setError(messageOf(deleteError));
    }
  };

  return (
    <div className="w-full space-y-7">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-cms-primary">Content organization</p>
        <h1 className="mt-1 text-3xl font-bold text-cms-text">Categories</h1>
        <p className="mt-2 max-w-2xl text-cms-muted">Organize content into categories used by public archives and website navigation.</p>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

      {role !== "viewer" && <section aria-labelledby="category-form-title" className="rounded-xl border border-cms-border bg-cms-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          {editingId ? <Pencil size={17} className="text-cms-primary" /> : <Plus size={18} className="text-cms-primary" />}
          <h2 id="category-form-title" className="font-semibold text-cms-text">{editingId ? "Edit category" : "Add a category"}</h2>
        </div>
        <form onSubmit={(event) => void submitCategory(event)} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-cms-text">
            Category name
            <input
              value={name}
              onChange={(event) => {
                const value = event.target.value;
                setName(value);
                if (!slugEdited) setSlug(slugFromName(value));
              }}
              required
              maxLength={80}
              placeholder="e.g. Wellness resources"
              className="mt-1.5 block w-full rounded-lg border border-cms-border bg-white px-3 py-2.5 font-normal outline-none focus:border-cms-primary"
            />
          </label>
          <label className="text-sm font-medium text-cms-text">
            URL slug
            <input
              value={slug}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(slugFromName(event.target.value));
              }}
              required
              maxLength={160}
              placeholder="wellness-resources"
              className="mt-1.5 block w-full rounded-lg border border-cms-border bg-white px-3 py-2.5 font-normal outline-none focus:border-cms-primary"
            />
          </label>
          <p className="text-xs text-cms-muted sm:col-span-2">The slug is used in archive filters and website URLs.</p>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Create category"}</Button>
            {editingId && <Button type="button" variant="secondary" onClick={resetForm}><X size={15} /> Cancel</Button>}
          </div>
        </form>
      </section>}

      <section aria-labelledby="category-list-title" className="overflow-hidden rounded-xl border border-cms-border bg-cms-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-cms-border px-5 py-4">
          <div>
            <h2 id="category-list-title" className="font-semibold text-cms-text">All categories</h2>
            <p className="mt-1 text-sm text-cms-muted">{categories.length} categories · counts include drafts and archived content</p>
          </div>
          <FolderTree size={19} className="text-cms-muted" aria-hidden="true" />
        </div>
        {loading ? <p role="status" className="p-5 text-sm text-cms-muted">Loading categories…</p>
          : categories.length ? <div className="divide-y divide-cms-border">
            {categories.map((category) => <article key={category.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-cms-text">{category.name}</h3>
                  {category.is_default === 1 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Built-in</span>}
                </div>
                <p className="mt-1 text-sm text-cms-muted">/{category.slug}</p>
                {category.is_default === 1 && <p className="mt-1 text-xs text-cms-muted">Built-in categories are protected and cannot be renamed or deleted.</p>}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm tabular-nums text-cms-muted">{counts[category.id] ?? 0} items</span>
                {role !== "viewer" && category.is_default !== 1 && <Button type="button" variant="secondary" size="sm" onClick={() => startEdit(category)} aria-label={`Edit ${category.name}`}>
                  <Pencil size={14} /> Edit
                </Button>}
                {role === "admin" && category.is_default !== 1 && <Button type="button" variant="danger" size="sm" onClick={() => void deleteCategory(category)} aria-label={`Delete ${category.name}`}>
                  <Trash2 size={14} /> Delete
                </Button>}
              </div>
            </article>)}
          </div> : <p className="p-5 text-sm text-cms-muted">No categories are available.</p>}
      </section>
    </div>
  );
}
