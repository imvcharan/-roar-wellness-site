import type { MetadataRoute } from "next";
import { getCmsSettings, listContent } from "@/lib/cms-db";
import { getCmsContentCanonical } from "@/lib/cms-route-content";
import { getCmsContentHref } from "@/lib/cms-routes";

export const dynamic = "force-dynamic";

const staticPaths = [
  "/",
  "/services",
  "/faqs",
  "/gallery",
  "/testimonials",
  "/appointment",
  "/blog",
  "/support/roarwellness-support.html",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getCmsSettings();
  const siteUrl = (settings.siteUrl || "https://www.roarwellness.org").replace(/\/+$/, "");
  const siteOrigin = new URL(siteUrl).origin;
  const entries = new Map<string, MetadataRoute.Sitemap[number]>();

  for (const path of staticPaths) {
    const url = new URL(path, `${siteUrl}/`).toString();
    entries.set(url, { url });
  }

  for (const item of await listContent()) {
    if (item.seo_robots?.toLowerCase().includes("noindex")) continue;

    const fallback = getCmsContentHref(item.slug, item.category_slug);
    const canonical = getCmsContentCanonical(item, fallback);
    const url = new URL(canonical, `${siteUrl}/`);
    if (url.origin !== siteOrigin) continue;

    entries.set(url.toString(), {
      url: url.toString(),
      lastModified: new Date(item.updated_at),
    });
  }

  return Array.from(entries.values());
}
