import { makeSlug, parseCmsContentInput } from "@/lib/cms-validation";
import { normalizeCmsPlainText } from "@/lib/cms-text";

const categoryAliases: Record<string, string> = {
  treatment: "treatments",
  treatments: "treatments",
  service: "treatments",
  services: "treatments",
  therapy: "therapy",
  therapies: "therapy",
  "mental healthcare": "mental-healthcare",
  "mental health": "mental-healthcare",
  "mental-healthcare": "mental-healthcare",
  page: "main-pages",
  pages: "main-pages",
  "main pages": "main-pages",
  "main-pages": "main-pages",
  blog: "blog",
  post: "blog",
  posts: "blog",
};

const therapySlugs = new Set([
  "game-therapy", "yoga-and-meditation", "hypnotherapy", "autogenic",
  "tms-therapy", "music-therapy", "art-therapy",
]);
const mentalHealthSlugs = new Set([
  "psychiatrist-in-delhi", "psychiatrist-centre", "schizophrenia-treatment",
  "schizophrenia-treatment-in-delhi", "treatment-of-personality-disorders",
  "adhd-treatment", "adhd-treatment-in-delhi", "dementia-treatment",
  "dementia-treatment-in-delhi", "bipolar-disorder",
]);
const mainPageSlugs = new Set([
  "about-roarwellness", "videos", "about-substance-abuse", "contact-us",
  "gallery", "12-step-program-delhi", "aa-20-questions", "facility",
  "drug-rehabilitation-experts", "drug-alcohol-rehabilitation-experts", "home-2", "news",
]);
const servicePostSlugs = new Set([
  "addiction-treatment-and-rehab-centers",
  "alcohol-addiction-treatment-centre",
  "alcohol-addiction-treatment-centre-in-delhi",
  "alcohol-rehabilitation-centre",
  "best-rehab-centre-in-delhi-ncr-india-for-drugs-and-alcohol",
  "best-rehabilitation-center-in-punjabi-bagh-delhi",
  "best-rehabilitation-centre-in-rohini-delhi",
  "best-rehabilitations-in-dwarka-new-delhi-ncr",
  "charas-deaddiction",
  "drug-rehabilitation-center-in-delhi-ncr",
  "get-the-best-alcohol-addiction-centre-in-delhi-ncr-india",
  "get-the-best-rehabilitation-centre-in-delhi-ncr-for-alcohol",
  "get-the-best-rehabilitation-centre-in-delhi-ncr-for-drug",
  "luxury-rehabilitation-centre-malviya-nagar",
  "opioid-addiction-treatment-punjab",
  "rehab-center-in-india",
]);

function renderedText(value: unknown): string | null {
  const text = typeof value === "string"
    ? value
    : value && typeof value === "object" && !Array.isArray(value)
      && typeof (value as Record<string, unknown>).rendered === "string"
      ? (value as Record<string, string>).rendered
      : null;
  if (text === null) return null;
  return normalizeCmsPlainText(text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

function renderedHtml(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && !Array.isArray(value)
    && typeof (value as Record<string, unknown>).rendered === "string") {
    return (value as Record<string, string>).rendered;
  }
  return null;
}

function getString(row: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export function inferImportedCategorySlug(row: Record<string, unknown>, slug: string): string {
  const postType = getString(row, "post_type", "postType", "type")?.toLowerCase();
  if (postType === "post" || postType === "blog") {
    if (servicePostSlugs.has(slug)) return "treatments";
    return "blog";
  }
  if (mainPageSlugs.has(slug)) return "main-pages";
  const rawCategory = row.category_slug ?? row.category ?? row.category_name;
  const categoryName = typeof rawCategory === "string" ? rawCategory.trim().toLowerCase() : "";
  if (categoryAliases[categoryName]) return categoryAliases[categoryName];
  if (categoryName) return makeSlug(categoryName) || "main-pages";

  if (postType === "post" || postType === "blog") {
    return "blog";
  }
  if (therapySlugs.has(slug)) return "therapy";
  if (mentalHealthSlugs.has(slug) || /^(psychiatrist|schizophrenia|adhd-|dementia-|bipolar-|treatment-of-personality)/.test(slug)) {
    return "mental-healthcare";
  }
  if (mainPageSlugs.has(slug)) return "main-pages";
  if (/^(luxury-rehabilitation-centre-|rehab-centre-female-)/.test(slug)
    || /(addiction|addiction-treatment|treatment|detox|rehabilitation|rehab|opioid|cannabis|substance-abuse|drug-alcohol)/.test(slug)) {
    return "treatments";
  }
  return "main-pages";
}

export function parseImportedContent(row: Record<string, unknown>, categoryId: string) {
  const title = renderedText(row.title ?? row.name);
  if (!title) throw new Error("Title is required.");

  const rawSlug = getString(row, "slug", "post_name") || title;
  const slug = makeSlug(rawSlug);
  if (!slug) throw new Error("Slug must contain at least one letter or number.");

  const rawStatus = row.status;
  const status = rawStatus === "published" || rawStatus === "publish" || row.published === true
    ? "published"
    : rawStatus === "archived" ? "archived" : "draft";
  const excerpt = renderedText(row.excerpt ?? row.short_description);
  const summary = renderedText(row.summary) || excerpt;
  const media = row._embedded && typeof row._embedded === "object" && !Array.isArray(row._embedded)
    ? (row._embedded as Record<string, unknown>)["wp:featuredmedia"]
    : null;
  const embeddedImage = Array.isArray(media) && media[0] && typeof media[0] === "object"
    ? (media[0] as Record<string, unknown>).source_url
    : null;
  const imageUrl = getString(row, "image_url", "featured_image_url", "image") || embeddedImage;

  return parseCmsContentInput({
    title,
    slug,
    categoryId,
    excerpt: excerpt?.slice(0, 500) || null,
    summary: summary?.slice(0, 2000) || null,
    description: renderedHtml(row.description),
    content: renderedHtml(row.content) || getString(row, "body", "html"),
    imageUrl: typeof imageUrl === "string" ? imageUrl : null,
    imageAltText: getString(row, "image_alt_text", "featured_image_alt", "image_alt"),
    imagePosition: getString(row, "image_position", "featured_image_position") || "50% 50%",
    seoTitle: getString(row, "seo_title", "meta_title"),
    seoDescription: getString(row, "seo_description", "meta_description"),
    seoKeywords: getString(row, "seo_keywords", "meta_keywords"),
    seoRobots: getString(row, "seo_robots", "robots"),
    status,
  });
}
