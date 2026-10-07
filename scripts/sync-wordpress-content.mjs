import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = (process.env.WORDPRESS_API_ROOT || "https://www.roarwellness.org/wp-json/wp/v2").replace(/\/+$/, "");
const destination = resolve(projectRoot, "data", "wordpress-content.json");
const rows = [];

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

const editorialPostCategories = new Set(["awards-recognition", "success-stories"]);
const editorialPostSlugs = new Set([
  "overcoming-drug-addiction-the-recovery-journey-of-rahul-mehra-at-roar-wellness-rehab-centre",
  "roar-wellness-rehabilitation-centre-honoured-as-most-trusted-de-addiction-rehabilitation-centre-in-delhi-at-pride-bharat-awards-2026",
  "sarah-overcame-alcohol-addiction",
]);
const treatmentPostCategories = new Set([
  "addiction-treatment",
  "alcohol-addiction-help",
  "delhi-ncr-rehab",
  "drug",
  "drug-addiction-treatment",
  "heroin",
  "rehab-centre",
  "substance-abuse-recovery",
]);

function categoryFor(type, slug, title, sourceCategories = []) {
  if (type === "posts" && servicePostSlugs.has(slug)) return "treatments";
  if (mainPageSlugs.has(slug)) return "main-pages";
  if (type === "posts") {
    const text = `${slug} ${title}`.replace(/<[^>]*>/g, " ").toLowerCase();
    if (editorialPostSlugs.has(slug)
      || sourceCategories.some((category) => editorialPostCategories.has(category))) return "blog";
    if (/\b(therapy|therapies|meditation)\b/.test(text)) return "therapy";
    if (/\b(adhd|bipolar|dementia|mental health|personality[- ]disorder|psychiatr|schizophrenia)\b/.test(text)) {
      return "mental-healthcare";
    }
    if (sourceCategories.some((category) => treatmentPostCategories.has(category))
      || /\b(alcohol|addiction|cannabis|charas|cocaine|de-?addiction|detox|drug|gambling|heroin|nasha|opioid|rehab|substance abuse)\b/.test(text)) {
      return "treatments";
    }
    return "blog";
  }
  if (["game-therapy", "yoga-and-meditation", "hypnotherapy", "autogenic", "tms-therapy", "music-therapy", "art-therapy"].includes(slug)) return "therapy";
  if (["psychiatrist-in-delhi", "psychiatrist-centre", "schizophrenia-treatment", "schizophrenia-treatment-in-delhi", "treatment-of-personality-disorders", "adhd-treatment", "adhd-treatment-in-delhi", "dementia-treatment", "dementia-treatment-in-delhi", "bipolar-disorder"].includes(slug)
    || /^(psychiatrist|schizophrenia|adhd-|dementia-|bipolar-|treatment-of-personality)/.test(slug)) return "mental-healthcare";
  if (mainPageSlugs.has(slug)) return "main-pages";
  if (/^(luxury-rehabilitation-centre-|rehab-centre-female-)/.test(slug)
    || /(addiction|addiction-treatment|treatment|detox|rehabilitation|rehab|opioid|cannabis|substance-abuse|drug-alcohol)/.test(slug)) return "treatments";
  return "main-pages";
}

async function fetchPublished(type) {
  const firstUrl = new URL(`${apiRoot}/${type}`);
  firstUrl.searchParams.set("per_page", "100");
  firstUrl.searchParams.set("page", "1");
  firstUrl.searchParams.set("status", "publish");
  firstUrl.searchParams.set("_embed", "1");
  firstUrl.searchParams.set("_fields", "id,slug,title,content,excerpt,status,link,categories,featured_media,_embedded,meta,yoast_head_json");
  const first = await fetch(firstUrl);
  if (!first.ok) throw new Error(`WordPress ${type} export failed with HTTP ${first.status}.`);
  const totalPages = Number(first.headers.get("x-wp-totalpages") || 1);
  const allRows = await first.json();
  for (let page = 2; page <= totalPages; page += 1) {
    const url = new URL(firstUrl);
    url.searchParams.set("page", String(page));
    const response = await fetch(url);
    if (!response.ok) throw new Error(`WordPress ${type} page ${page} failed with HTTP ${response.status}.`);
    allRows.push(...await response.json());
  }
  return allRows;
}

async function fetchCategories() {
  const url = new URL(`${apiRoot}/categories`);
  url.searchParams.set("per_page", "100");
  url.searchParams.set("_fields", "id,slug");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`WordPress categories export failed with HTTP ${response.status}.`);
  return response.json();
}

const wordpressCategories = await fetchCategories();
const categorySlugs = new Map(wordpressCategories.map((category) => [category.id, category.slug]));

for (const type of ["pages", "posts"]) {
  const wordpressRows = await fetchPublished(type);
  for (const row of wordpressRows) {
    if (!row.slug || !row.title?.rendered || !row.content?.rendered) {
      throw new Error(`WordPress ${type} item ${row.id} is missing a slug, title, or rendered content.`);
    }
    rows.push({
      id: row.id,
      post_type: type === "posts" ? "post" : "page",
      title: row.title.rendered,
      slug: row.slug,
      category_slug: categoryFor(
        type,
        row.slug,
        row.title.rendered,
        (row.categories || []).map((id) => categorySlugs.get(id)).filter(Boolean),
      ),
      ...(type === "posts"
        ? { source_categories: (row.categories || []).map((id) => categorySlugs.get(id)).filter(Boolean) }
        : {}),
      status: row.status,
      excerpt: row.excerpt?.rendered || "",
      content: row.content.rendered,
      image_url: row._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "",
      seo_title: row.yoast_head_json?.title || row.meta?._yoast_wpseo_title || "",
      seo_description: row.yoast_head_json?.description || row.meta?._yoast_wpseo_metadesc || "",
      permalink: row.link,
    });
  }
}

const seen = new Set();
for (const row of rows) {
  if (seen.has(row.slug)) throw new Error(`Duplicate published WordPress slug: ${row.slug}`);
  seen.add(row.slug);
}

await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, `${JSON.stringify({ source: apiRoot, fetched_at: new Date().toISOString(), items: rows }, null, 2)}\n`, "utf8");
console.log(`Saved ${rows.length} published WordPress pages and posts to ${destination}.`);
for (const category of ["treatments", "therapy", "mental-healthcare", "main-pages", "blog"]) {
  console.log(`${category}: ${rows.filter((row) => row.category_slug === category).length}`);
}
