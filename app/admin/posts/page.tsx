"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminAccordion } from "@/components/admin/AdminAccordion";
import { MediaImageField } from "@/components/admin/MediaImageField";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { getCmsContentHref } from "@/lib/cms-routes";
import { cmsRequest } from "@/services/cms-api";
import { Button } from "@/components/ui/Button";

interface Category {
  id: string;
  name: string;
  slug: string;
  is_default: number;
}

interface CmsEntry {
  id: string;
  title: string;
  slug: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  excerpt: string | null;
  summary: string | null;
  description: string | null;
  content: string | null;
  image_url: string | null;
  image_alt_text: string | null;
  image_position: string;
  status: "draft" | "published" | "archived";
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  seo_robots: string | null;
  scheduled_publish_at: string | null;
  updated_at: string;
}

interface EntryForm {
  title: string;
  slug: string;
  categoryId: string;
  excerpt: string;
  summary: string;
  description: string;
  content: string;
  imageUrl: string;
  imageAltText: string;
  imagePosition: string;
  status: CmsEntry["status"];
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoRobots: string;
  scheduledPublishAt: string;
}

const emptyForm: EntryForm = {
  title: "",
  slug: "",
  categoryId: "",
  excerpt: "",
  summary: "",
  description: "",
  content: "",
  imageUrl: "",
  imageAltText: "",
  imagePosition: "50% 50%",
  status: "draft",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  seoRobots: "index,follow",
  scheduledPublishAt: "",
};

const sectionSettings = {
  all: {
    title: "All content",
    description: "Browse and manage all pages, services, and blog articles.",
    categorySlugs: null as readonly string[] | null,
    singular: "content",
  },
  pages: {
    title: "Pages",
    description: "Manage About, team, and other main website pages.",
    categorySlugs: ["main-pages"],
    singular: "pages",
  },
  services: {
    title: "Services",
    description: "Manage treatments, therapy, mental healthcare, and location service pages.",
    categorySlugs: ["treatments", "therapy", "mental-healthcare"],
    singular: "services",
  },
  blog: {
    title: "Blog",
    description: "Manage editorial articles published in the Roar Wellness blog.",
    categorySlugs: ["blog"],
    singular: "articles",
  },
} as const;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "The CMS request failed.";
}

export default function PostsPage() {
  const pathname = usePathname();
  const section = pathname === "/admin/pages" ? "pages"
    : pathname === "/admin/services" ? "services"
      : pathname === "/admin/blog" ? "blog" : "all";
  const sectionConfig = sectionSettings[section];
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<CmsEntry[]>([]);
  const [form, setForm] = useState<EntryForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activePanel, setActivePanel] = useState<"library" | "editor" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFeaturedImage, setUploadingFeaturedImage] = useState(false);
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("viewer");
  const [history, setHistory] = useState<{ id: string; title: string; status: string; created_at: string; created_by: string | null }[]>([]);
  const previewWindow = useRef<Window | null>(null);
  const previewAfterSave = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [categoryResult, entryResult, sessionResult] = await Promise.all([
        cmsRequest<{ data: Category[] }>("/api/cms/categories"),
        cmsRequest<{ data: CmsEntry[] }>("/api/cms/content?all=1"),
        cmsRequest<{ data: { role: "admin" | "editor" | "viewer" } }>("/api/cms/session"),
      ]);
      setCategories(categoryResult.data);
      setEntries(entryResult.data);
      setRole(sessionResult.data.role);
      const availableCategories = sectionConfig.categorySlugs
        ? categoryResult.data.filter((category) => sectionConfig.categorySlugs?.some((slug) => slug === category.slug))
        : categoryResult.data;
      setForm((current) => ({
        ...current,
        categoryId: availableCategories.some((category) => category.id === current.categoryId)
          ? current.categoryId
          : availableCategories[0]?.id || "",
      }));
    } catch (loadError) {
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [section, sectionConfig.categorySlugs]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    setFilter("all");
    setSearch("");
    setActivePanel(null);
    setEditingId(null);
  }, [section]);

  const sectionCategories = useMemo(
    () => sectionConfig.categorySlugs
      ? categories.filter((category) => sectionConfig.categorySlugs?.some((slug) => slug === category.slug))
      : categories,
    [categories, sectionConfig.categorySlugs],
  );
  const sectionEntries = useMemo(
    () => entries.filter((entry) => !sectionConfig.categorySlugs || sectionConfig.categorySlugs.some((slug) => slug === entry.category_slug)),
    [entries, sectionConfig.categorySlugs],
  );
  const visibleEntries = useMemo(
    () => sectionEntries.filter((entry) => {
      const matchesCategory = filter === "all" || entry.category_id === filter;
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || `${entry.title} ${entry.slug}`.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    }),
    [sectionEntries, filter, search],
  );

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm, categoryId: sectionCategories[0]?.id || "" });
  };

  const editEntry = (entry: CmsEntry) => {
    setActivePanel("editor");
    setEditingId(entry.id);
    setForm({
      title: entry.title,
      slug: entry.slug,
      categoryId: entry.category_id,
      excerpt: entry.excerpt || "",
      summary: entry.summary || "",
      description: entry.description || "",
      content: entry.content || "",
      imageUrl: entry.image_url || "",
      imageAltText: entry.image_alt_text || "",
      imagePosition: entry.image_position || "50% 50%",
      status: entry.status,
      seoTitle: entry.seo_title || "",
      seoDescription: entry.seo_description || "",
      seoKeywords: entry.seo_keywords || "",
      seoRobots: entry.seo_robots || "index,follow",
      scheduledPublishAt: entry.scheduled_publish_at ? new Date(entry.scheduled_publish_at).toISOString().slice(0, 16) : "",
    });
    setNotice("");
    setHistory([]);
    void cmsRequest<{ data: typeof history }>(`/api/cms/content/${encodeURIComponent(entry.id)}/revisions`)
      .then(({ data }) => setHistory(data))
      .catch((historyError: unknown) => setError(messageOf(historyError)));
    document.getElementById("cms-entry-editor")?.scrollIntoView({ behavior: "smooth" });
  };

  const saveEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (uploadingFeaturedImage) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const url = editingId ? `/api/cms/content/${encodeURIComponent(editingId)}` : "/api/cms/content";
      await cmsRequest(url, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify({
          title: form.title,
          slug: form.slug,
          categoryId: form.categoryId,
          excerpt: form.excerpt,
          summary: form.summary,
          description: form.description,
          content: form.content,
          imageUrl: form.imageUrl,
          imageAltText: form.imageAltText,
          imagePosition: form.imagePosition,
          status: form.status,
          seoTitle: form.seoTitle,
          seoDescription: form.seoDescription,
          seoKeywords: form.seoKeywords,
          seoRobots: form.seoRobots,
          scheduledPublishAt: form.scheduledPublishAt ? new Date(form.scheduledPublishAt).toISOString() : null,
        }),
      });
      if (previewAfterSave.current) {
        previewWindow.current?.location.assign(`/inner-pages/?slug=${encodeURIComponent(makeSlug(form.slug || form.title))}&preview=1`);
        previewWindow.current = null;
        previewAfterSave.current = false;
      }
      setNotice(form.scheduledPublishAt
        ? "Content saved and scheduled for publication."
        : form.status !== "published"
          ? `Content ${editingId ? "updated" : "created"} as ${form.status}. It will not appear publicly until published.`
          : editingId ? "Content updated. Published changes are live now." : "Content created. Published changes are live now.");
      resetForm();
      await load();
    } catch (saveError) {
      if (previewAfterSave.current) previewWindow.current?.close();
      previewWindow.current = null;
      previewAfterSave.current = false;
      setError(messageOf(saveError));
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entry: CmsEntry) => {
    if (!window.confirm(`Delete “${entry.title}”? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    try {
      await cmsRequest(`/api/cms/content/${encodeURIComponent(entry.id)}`, { method: "DELETE" });
      setNotice("Content deleted.");
      if (editingId === entry.id) resetForm();
      await load();
    } catch (deleteError) {
      setError(messageOf(deleteError));
    }
  };

  const restoreRevision = async (revisionId: string) => {
    if (!editingId || !window.confirm("Restore this earlier version? The current version will be saved in history first.")) return;
    try {
      const { data } = await cmsRequest<{ data: CmsEntry }>(`/api/cms/content/${encodeURIComponent(editingId)}/revisions/${encodeURIComponent(revisionId)}`, { method: "POST" });
      setNotice("Revision restored.");
      await load();
      editEntry(data);
    } catch (restoreError) { setError(messageOf(restoreError)); }
  };

  const openPreview = () => {
    const slug = makeSlug(form.slug || form.title);
    if (!slug) { setError("Add a title or slug before previewing."); return; }
    if (!form.categoryId) { setError("Choose a category before previewing."); return; }
    if (uploadingFeaturedImage) { setError("Wait for the featured image upload to finish before previewing."); return; }
    const editorForm = document.getElementById("cms-entry-editor-form");
    if (!(editorForm instanceof HTMLFormElement) || !editorForm.reportValidity()) return;
    const openedWindow = window.open("about:blank", "_blank");
    if (!openedWindow) { setError("Allow pop-ups to preview this content."); return; }
    openedWindow.opener = null;
    previewWindow.current = openedWindow;
    previewAfterSave.current = true;
    editorForm.requestSubmit();
  };

  const setField = <K extends keyof EntryForm>(key: K, value: EntryForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const selectedCategorySlug = categories.find((category) => category.id === form.categoryId)?.slug;
  const previewPath = form.slug && selectedCategorySlug
    ? getCmsContentHref(makeSlug(form.slug), selectedCategorySlug)
    : "";

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cms-primary">{section === "all" ? "Content manager" : `${section} manager`}</p>
          <h1 className="mt-1 text-3xl font-bold text-cms-text">{sectionConfig.title}</h1>
          <p className="mt-2 text-cms-muted">{sectionConfig.description} Published edits appear on the site immediately.</p>
        </div>
        {role !== "viewer" && <Button type="button" onClick={() => { resetForm(); setActivePanel("editor"); }}>
          New {section === "all" ? "content" : section === "blog" ? "article" : section === "services" ? "service" : "page"}
        </Button>}
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

      <AdminAccordion
        id="content-library"
        title={<>{section === "all" ? "Content library" : `${sectionConfig.title} library`} <span className="text-sm font-normal text-cms-muted">({sectionEntries.length})</span></>}
        summary={`Browse, search, and manage ${sectionConfig.singular}.`}
        open={activePanel === "library"}
        onToggle={() => setActivePanel(activePanel === "library" ? null : "library")}
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm text-cms-muted">Showing only {section === "all" ? "all content types" : sectionConfig.singular}; drafts, published items, and archived items are included.</p>
            <div className="flex flex-wrap gap-3">
              <label className="text-sm font-medium text-cms-text">
                Search {sectionConfig.singular}
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title or slug" className="ml-2 rounded-lg border border-cms-border px-3 py-2" />
              </label>
              {sectionCategories.length > 1 && <label className="text-sm font-medium text-cms-text">
                Filter by category
                <select className="ml-2 rounded-lg border border-cms-border bg-white px-3 py-2" value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="all">All categories</option>
                  {sectionCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>}
            </div>
          </div>
        {loading ? <p role="status" className="text-sm text-cms-muted">Loading CMS content...</p>
          : visibleEntries.length ? <div className="divide-y divide-cms-border border-y border-cms-border">
            {visibleEntries.map((entry) => (
              <article key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-cms-text">{entry.title}</h3>
                  <p className="mt-1 text-sm text-cms-muted">/{entry.slug} · {entry.category_name} · {entry.status}</p>
                </div>
                <div className="flex gap-2">
                  {entry.status === "published" && <a href={getCmsContentHref(entry.slug, entry.category_slug)} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-cms-border px-3 py-1.5 text-xs font-medium text-cms-text hover:bg-cms-background">Open page</a>}
                  {role !== "viewer" && <Button type="button" variant="secondary" size="sm" onClick={() => editEntry(entry)}>Edit</Button>}
                  {role === "admin" && <Button type="button" variant="danger" size="sm" onClick={() => void deleteEntry(entry)}>Delete</Button>}
                </div>
              </article>
            ))}
          </div> : <p className="rounded-lg bg-cms-background p-5 text-sm text-cms-muted">No {sectionConfig.singular} match these filters. Create a {section === "blog" ? "article" : section === "services" ? "service" : "page"} to get started.</p>}
        </div>
      </AdminAccordion>

      {role !== "viewer" && <AdminAccordion
        id="content-editor"
        title={editingId ? `Edit ${section === "blog" ? "article" : section === "services" ? "service" : section === "pages" ? "page" : "content"}` : `Create ${section === "blog" ? "article" : section === "services" ? "service" : section === "pages" ? "page" : "content"}`}
        summary={`Create or edit ${sectionConfig.singular} and their publishing details.`}
        open={activePanel === "editor"}
        onToggle={() => setActivePanel(activePanel === "editor" ? null : "editor")}
      >
        <div id="cms-entry-editor">
          <p className="mb-5 text-sm text-cms-muted">A slug is generated from the title when creating content, and can be edited at any time. Rich text is sanitized before it is stored.</p>
        </div>
        <form id="cms-entry-editor-form" onSubmit={saveEntry} className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-cms-text">
            Title
            <input className="mt-1.5 w-full rounded-lg border border-cms-border px-3 py-2" required maxLength={200} value={form.title} onChange={(event) => {
              const title = event.target.value;
              setForm((current) => ({ ...current, title, slug: !editingId && (current.slug === "" || current.slug === makeSlug(current.title)) ? makeSlug(title) : current.slug }));
            }} />
          </label>
          <label className="text-sm font-medium text-cms-text">
            URL slug
            <input className="mt-1.5 w-full rounded-lg border border-cms-border px-3 py-2" required maxLength={200} value={form.slug} onChange={(event) => setField("slug", event.target.value)} onBlur={() => setField("slug", makeSlug(form.slug))} />
            <span className="mt-1 block text-xs font-normal text-cms-muted">Editable URL slug. Saving a changed slug redirects the previous URL to this page.</span>
          </label>
          <label className="text-sm font-medium text-cms-text">
            Category
            <select className="mt-1.5 w-full rounded-lg border border-cms-border bg-white px-3 py-2" required value={form.categoryId} onChange={(event) => setField("categoryId", event.target.value)}>
              <option value="" disabled>Select a category</option>
              {sectionCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-cms-text">
            Status
            <select className="mt-1.5 w-full rounded-lg border border-cms-border bg-white px-3 py-2" value={form.status} onChange={(event) => setField("status", event.target.value as CmsEntry["status"])}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="text-sm font-medium text-cms-text md:col-span-2">
            Short excerpt
            <textarea className="mt-1.5 w-full rounded-lg border border-cms-border px-3 py-2" rows={2} maxLength={500} value={form.excerpt} onChange={(event) => setField("excerpt", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-cms-text md:col-span-2">
            Summary
            <textarea className="mt-1.5 w-full rounded-lg border border-cms-border px-3 py-2" rows={3} maxLength={2000} value={form.summary} onChange={(event) => setField("summary", event.target.value)} />
          </label>
          <MediaImageField
            name="featured_image_url"
            label="Featured image"
            value={form.imageUrl}
            onChange={(imageUrl) => setField("imageUrl", imageUrl)}
            onUploadingChange={setUploadingFeaturedImage}
            previewMode="cover"
            previewPosition={form.imagePosition}
            previewAlt={form.imageAltText || "Featured image crop preview"}
            className="md:col-span-2"
          />
          <label className="text-sm font-medium text-cms-text md:col-span-2">
            Image alt text
            <input
              type="text"
              maxLength={250}
              value={form.imageAltText}
              onChange={(event) => setField("imageAltText", event.target.value)}
              placeholder="Describe the image for visitors using screen readers"
              className="mt-1.5 w-full rounded-lg border border-cms-border px-3 py-2"
            />
            <span className="mt-1 block text-xs font-normal text-cms-muted">Leave blank if the image is only decorative.</span>
          </label>
          <label className="text-sm font-medium text-cms-text">
            Image focal point
            <select
              value={form.imagePosition}
              onChange={(event) => setField("imagePosition", event.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-cms-border bg-white px-3 py-2"
            >
              <option value="0% 0%">Top left</option><option value="50% 0%">Top center</option><option value="100% 0%">Top right</option>
              <option value="0% 50%">Center left</option><option value="50% 50%">Center</option><option value="100% 50%">Center right</option>
              <option value="0% 100%">Bottom left</option><option value="50% 100%">Bottom center</option><option value="100% 100%">Bottom right</option>
            </select>
          </label>
          <RichTextEditor
            key={`description-${editingId ?? "new"}`}
            label="Detail description"
            value={form.description}
            onChange={(value) => setField("description", value)}
            maxLength={20000}
            rows={5}
          />
          <RichTextEditor
            key={`content-${editingId ?? "new"}`}
            label="Page content"
            value={form.content}
            onChange={(value) => setField("content", value)}
            maxLength={200000}
            rows={12}
          />
          <div className="md:col-span-2"><h3 className="font-semibold text-cms-text">SEO metadata and publishing</h3><p className="mt-1 text-sm text-cms-muted">These tags apply to the selected post, page, or service. Empty title/description fields use the content title and summary.</p></div>
          <label className="text-sm font-medium text-cms-text">
            SEO title
            <input maxLength={200} className="mt-1.5 w-full rounded-lg border border-cms-border px-3 py-2" value={form.seoTitle} onChange={(event) => setField("seoTitle", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-cms-text">
            SEO description
            <textarea maxLength={500} rows={2} className="mt-1.5 w-full rounded-lg border border-cms-border px-3 py-2" value={form.seoDescription} onChange={(event) => setField("seoDescription", event.target.value)} />
          </label>
          <label className="text-sm font-medium text-cms-text">
            SEO keywords
            <input maxLength={500} className="mt-1.5 w-full rounded-lg border border-cms-border px-3 py-2" value={form.seoKeywords} onChange={(event) => setField("seoKeywords", event.target.value)} placeholder="rehabilitation, recovery, Delhi" />
            <span className="mt-1 block text-xs font-normal text-cms-muted">Separate keywords with commas. Search engines may choose whether to use them.</span>
          </label>
          <label className="text-sm font-medium text-cms-text">
            Search engine indexing
            <select className="mt-1.5 w-full rounded-lg border border-cms-border bg-white px-3 py-2" value={form.seoRobots} onChange={(event) => setField("seoRobots", event.target.value)}>
              <option value="index,follow">Index this page and follow links</option>
              <option value="noindex,follow">Do not index; follow links</option>
              <option value="index,nofollow">Index this page; do not follow links</option>
              <option value="noindex,nofollow">Do not index or follow links</option>
            </select>
          </label>
          <div className="rounded-lg border border-cms-border bg-cms-background p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-cms-muted">Search preview</p>
            <p className="mt-2 truncate text-lg font-medium text-cms-primary">{form.seoTitle || (form.title ? `${form.title} | Roar Wellness` : "Page title")}</p>
            <p className="text-xs text-cms-muted">{typeof window !== "undefined" ? window.location.origin : ""}{previewPath}</p>
            <p className="mt-1 line-clamp-2 text-sm text-cms-muted">{form.seoDescription || form.summary || form.excerpt || "No page-specific description; search engines may use a site-level description."}</p>
          </div>
          <label className="text-sm font-medium text-cms-text">
            Schedule publication (optional, local time)
            <input type="datetime-local" className="mt-1.5 w-full rounded-lg border border-cms-border px-3 py-2" value={form.scheduledPublishAt} onChange={(event) => {
              const value = event.target.value;
              setForm((current) => ({ ...current, scheduledPublishAt: value, status: value ? "draft" : current.status }));
            }} />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" loading={saving} disabled={uploadingFeaturedImage}>{editingId ? "Save changes" : "Create content"}</Button>
            <Button type="button" variant="secondary" onClick={openPreview}>Save & preview</Button>
            {editingId && <Button type="button" variant="secondary" onClick={resetForm}>Cancel edit</Button>}
          </div>
        </form>
        {editingId && <section className="border-t border-cms-border pt-4">
          <h3 className="font-semibold text-cms-text">Version history</h3>
          <div className="mt-2 divide-y divide-cms-border">
            {history.map((revision) => <div key={revision.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span className="text-cms-muted">{new Date(revision.created_at).toLocaleString()} · {revision.created_by || "System"} · {revision.status} · {revision.title}</span>
              <Button type="button" size="sm" variant="secondary" onClick={() => void restoreRevision(revision.id)}>Restore</Button>
            </div>)}
            {!history.length && <p className="py-2 text-sm text-cms-muted">No earlier versions recorded.</p>}
          </div>
        </section>}
      </AdminAccordion>}
    </div>
  );
}

function makeSlug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 160);
}
