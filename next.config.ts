import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface WordpressSnapshot {
  items: { slug: string; category_slug: string }[];
}

const importedItems = (JSON.parse(
  readFileSync(join(process.cwd(), "data", "wordpress-content.json"), "utf8"),
) as WordpressSnapshot).items;
const appRoutes = new Set(["gallery", "blog", "inner-pages", "services", "admin", "admin-login"]);
const serviceCategories = new Set(["treatments", "therapy", "mental-healthcare"]);
const contentHref = (slug: string, category: string) => serviceCategories.has(category)
  ? `/services/${encodeURIComponent(slug)}`
  : category === "blog" ? `/blog/${encodeURIComponent(slug)}` : `/${encodeURIComponent(slug)}`;
const importedBySlug = new Map(importedItems.map((item) => [item.slug, item]));
const legacySlugAliases: Record<string, string> = {
  "adhd-treatment": "adhd-treatment-in-delhi",
  "dementia-treatment": "dementia-treatment-in-delhi",
  "marijuana-treatment": "marijuana-treatment-in-delhi",
  "schizophrenia-treatment": "schizophrenia-treatment-in-delhi",
  "psychiatrist-centre": "psychiatrist-in-delhi",
  "bipolar-disorder": "treatment-of-personality-disorders",
  "personality-disorders": "treatment-of-personality-disorders",
  autogenic: "therapy",
  hypnotherapy: "therapy",
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    const canonicalRedirects = importedItems
      .filter(({ slug, category_slug }) => !appRoutes.has(slug) && !Object.hasOwn(legacySlugAliases, slug) && category_slug !== "main-pages")
      .map(({ slug, category_slug }) => ({
        source: `/${slug}`,
        destination: contentHref(slug, category_slug),
        permanent: true,
      }));
    const aliasRedirects = Object.entries(legacySlugAliases).map(([source, target]) => ({
      source: `/${source}`,
      destination: target === "therapy" ? "/services?category=therapy" : contentHref(target, importedBySlug.get(target)?.category_slug || "treatments"),
      permanent: true,
    }));
    return [
      ...canonicalRedirects,
      ...aliasRedirects,
    ];
  },
};

export default nextConfig;