import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCmsUserId, isCmsAdmin } from "@/lib/cms-auth";
import { findContentBySlug, getCmsDatabase, listCategories, recordContentRevision } from "@/lib/cms-db";
import { inferImportedCategorySlug, parseImportedContent } from "@/lib/cms-import-utils";
import { getCmsContentHref, isPageCategory } from "@/lib/cms-routes";
import { isReservedCmsPageSlug, makeSlug } from "@/lib/cms-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required for imports." }, { status: 403 });
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 50 * 1024 * 1024) return NextResponse.json({ error: "Legacy import exceeds the 50 MB limit." }, { status: 413 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Upload a valid JSON export from the legacy CMS." }, { status: 400 });
  }

  const root = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : { pages: payload };
  const rows: Record<string, unknown>[] = [];
  for (const key of ["content", "pages", "services", "posts", "items"]) {
    const value = root[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object" && !Array.isArray(item)) rows.push(item as Record<string, unknown>);
      }
    }
  }
  if (!rows.length) return NextResponse.json({ error: "No content found. Expected an array or an object with pages, services, posts, or content arrays." }, { status: 400 });

  const uniqueRows = new Map<string, Record<string, unknown>>();
  const titleOf = (row: Record<string, unknown>) => {
    const title = row.title ?? row.name;
    return typeof title === "string" ? title : title && typeof title === "object" && !Array.isArray(title)
      && typeof (title as Record<string, unknown>).rendered === "string"
      ? (title as Record<string, string>).rendered : "";
  };
  const contentLength = (row: Record<string, unknown>) => {
    const value = row.content ?? row.body ?? row.html;
    return typeof value === "string" ? value.length : value && typeof value === "object"
      && !Array.isArray(value) && typeof (value as Record<string, unknown>).rendered === "string"
      ? (value as Record<string, string>).rendered.length : 0;
  };
  for (const row of rows) {
    const rawSlug = typeof row.slug === "string" ? row.slug : typeof row.post_name === "string" ? row.post_name : titleOf(row);
    const slug = makeSlug(rawSlug);
    if (!slug) return NextResponse.json({ error: "Import includes an item with an invalid URL slug." }, { status: 400 });
    const previous = uniqueRows.get(slug);
    if (previous && titleOf(previous).trim() !== titleOf(row).trim()) {
      return NextResponse.json({ error: `Import contains conflicting entries for the slug “${slug}”.` }, { status: 409 });
    }
    if (!previous || contentLength(row) > contentLength(previous)) uniqueRows.set(slug, row);
  }
  const importRows = [...uniqueRows.values()];

  const database = getCmsDatabase();
  const existingCategories = listCategories();
  const bySlug = new Map(existingCategories.map((category) => [category.slug, category]));
  const resolveCategory = (row: Record<string, unknown>, slug: string) => {
    const knownSlug = inferImportedCategorySlug(row, slug);
    const known = bySlug.get(knownSlug);
    if (known) return known;
    const raw = row.category_name ?? row.category ?? row.category_slug;
    const name = typeof raw === "string" && raw.trim()
      ? raw.trim().replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
      : "Main pages";
    const categorySlug = knownSlug || makeSlug(name);
    const current = bySlug.get(categorySlug);
    if (current) return current;
    const id = randomUUID();
    database.prepare("INSERT INTO categories (id, name, slug) VALUES (?, ?, ?)").run(id, name.slice(0, 80), categorySlug);
    const created = { id, name: name.slice(0, 80), slug: categorySlug, is_default: 0, created_at: new Date().toISOString() };
    bySlug.set(categorySlug, created);
    return created;
  };

  let imported = 0;
  const failures: string[] = [];
  const importingUser = await getCmsUserId();
  database.exec("BEGIN IMMEDIATE");
  try {
    for (const [index, row] of importRows.entries()) {
      const title = titleOf(row);
      if (!title.trim()) {
        failures.push(`Item ${index + 1}: missing title.`);
        continue;
      }
      const slugValue = row.slug ?? row.post_name;
      const slug = typeof slugValue === "string" ? slugValue : title;
      const normalizedSlug = makeSlug(slug);
      const category = resolveCategory(row, normalizedSlug);
      let input: ReturnType<typeof parseImportedContent>;
      try {
        input = parseImportedContent(row, category.id);
      } catch (error) {
        failures.push(`Item ${index + 1} (${title}): ${error instanceof Error ? error.message : "invalid content"}`);
        continue;
      }
      if (isPageCategory(category.slug) && isReservedCmsPageSlug(input.slug)) {
        failures.push(`Item ${index + 1} (${title}): slug “${input.slug}” is reserved for a built-in website route.`);
        continue;
      }
      const previous = findContentBySlug(input.slug, true);
      const nextPath = getCmsContentHref(input.slug, category.slug);
      const changed = previous && (
        previous.title !== input.title || previous.category_id !== input.categoryId
        || previous.excerpt !== input.excerpt || previous.summary !== input.summary
        || previous.description !== input.description || previous.content !== input.content
        || previous.image_url !== input.imageUrl || previous.image_alt_text !== input.imageAltText
        || previous.image_position !== input.imagePosition || previous.status !== input.status
        || previous.seo_title !== input.seoTitle || previous.seo_description !== input.seoDescription
        || previous.seo_keywords !== input.seoKeywords || previous.seo_robots !== input.seoRobots
      );
      if (changed) recordContentRevision(previous.id, importingUser);
      if (previous && getCmsContentHref(previous.slug, previous.category_slug) !== nextPath) {
        database.prepare("DELETE FROM cms_url_redirects WHERE source_path = ?").run(nextPath);
        database.prepare(`
          INSERT INTO cms_url_redirects (source_path, content_id) VALUES (?, ?)
          ON CONFLICT(source_path) DO UPDATE SET content_id = excluded.content_id
        `).run(getCmsContentHref(previous.slug, previous.category_slug), previous.id);
      } else {
        database.prepare("DELETE FROM cms_url_redirects WHERE source_path = ?").run(nextPath);
      }
      database.prepare(`
        INSERT INTO content (id, title, slug, category_id, excerpt, summary, description, content, image_url, image_alt_text, image_position, status, seo_title, seo_description, seo_keywords, seo_robots, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now') ELSE NULL END)
        ON CONFLICT(slug) DO UPDATE SET title = excluded.title, category_id = excluded.category_id,
          excerpt = excluded.excerpt, summary = excluded.summary, description = excluded.description,
          content = excluded.content, image_url = excluded.image_url,
          image_alt_text = excluded.image_alt_text, image_position = excluded.image_position, status = excluded.status,
          seo_title = excluded.seo_title, seo_description = excluded.seo_description,
          seo_keywords = excluded.seo_keywords, seo_robots = excluded.seo_robots,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
          published_at = CASE WHEN excluded.status = 'published' THEN COALESCE(content.published_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) ELSE NULL END
      `).run(randomUUID(), input.title, input.slug, input.categoryId, input.excerpt, input.summary, input.description, input.content, input.imageUrl, input.imageAltText, input.imagePosition, input.status, input.seoTitle, input.seoDescription, input.seoKeywords, input.seoRobots, input.status);
      imported++;
    }
    if (failures.length) throw new Error(failures.slice(0, 10).join("\n"));
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed; no changes were made." }, { status: 400 });
  }
  return NextResponse.json({ data: { imported, categories: bySlug.size - existingCategories.length, skippedDuplicates: rows.length - importRows.length } });
}
