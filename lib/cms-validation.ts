import sanitizeHtml from "sanitize-html";

const homepageGroups = new Set(["team", "reviews", "facility", "approach"]);
const reservedPageSlugs = new Set(["admin", "admin-login", "api", "blog", "gallery", "inner-pages", "services", "_next", "uploads"]);

export type CmsStatus = "draft" | "published" | "archived";

export interface CmsContentInput {
  title: string;
  slug: string;
  categoryId: string;
  excerpt: string | null;
  summary: string | null;
  description: string | null;
  content: string | null;
  imageUrl: string | null;
  imageAltText: string | null;
  imagePosition: string;
  status: CmsStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  seoRobots: string | null;
  scheduledPublishAt: string | null;
}

export function makeSlug(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}

export function isReservedCmsPageSlug(slug: string): boolean {
  return reservedPageSlugs.has(slug);
}

function optionalText(value: unknown, label: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error(`${label} must be text no longer than ${maxLength} characters.`);
  }
  return value.trim() || null;
}

function sanitizeRichText(value: string | null): string | null {
  if (!value) return null;
  return sanitizeHtml(value, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "h1", "h2", "h3", "h4", "img", "span", "section", "figure", "figcaption",
      "details", "summary",
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel", "class"],
      img: ["src", "alt", "width", "height", "loading", "class"],
      "*": ["class", "id", "aria-label", "aria-hidden"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
  });
}

function isAllowedImageUrl(value: string): boolean {
  if (/^\/(?:api\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|uploads\/[0-9a-f-]+\.webp)$/i.test(value)) {
    return true;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseCmsContentInput(value: unknown): CmsContentInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A content object is required.");
  }
  const data = value as Record<string, unknown>;
  if (typeof data.title !== "string" || !data.title.trim() || data.title.length > 200) {
    throw new Error("Title is required and must be 200 characters or fewer.");
  }
  const slugInput = typeof data.slug === "string" && data.slug.trim()
    ? data.slug
    : data.title;
  const slug = makeSlug(slugInput);
  if (!slug) throw new Error("Slug must contain at least one letter or number.");
  if (typeof data.categoryId !== "string" || !data.categoryId.trim()) {
    throw new Error("Choose a category.");
  }
  const status = data.status ?? "draft";
  if (status !== "draft" && status !== "published" && status !== "archived") {
    throw new Error("Status must be draft, published, or archived.");
  }
  let scheduledPublishAt: string | null = null;
  if (data.scheduledPublishAt !== undefined && data.scheduledPublishAt !== null && data.scheduledPublishAt !== "") {
    if (typeof data.scheduledPublishAt !== "string" || !Number.isFinite(Date.parse(data.scheduledPublishAt))) {
      throw new Error("Scheduled publish time must be a valid date and time.");
    }
    if (Date.parse(data.scheduledPublishAt) <= Date.now()) {
      throw new Error("Scheduled publish time must be in the future.");
    }
    if (status !== "draft") {
      throw new Error("Scheduled content must have draft status until its publish time.");
    }
    scheduledPublishAt = new Date(data.scheduledPublishAt).toISOString();
  }
  const imageUrl = optionalText(data.imageUrl, "Image URL", 2048);
  if (imageUrl && !isAllowedImageUrl(imageUrl)) {
    throw new Error("Image URL must be an HTTP or HTTPS URL or a valid uploaded media path.");
  }
  const imagePosition = optionalText(data.imagePosition, "Image focal position", 20) ?? "50% 50%";
  const imagePositions = new Set([
    "0% 0%", "50% 0%", "100% 0%",
    "0% 50%", "50% 50%", "100% 50%",
    "0% 100%", "50% 100%", "100% 100%",
  ]);
  if (!imagePositions.has(imagePosition)) throw new Error("Choose a valid image focal position.");
  const seoRobots = optionalText(data.seoRobots, "Robots directive", 40)
    ?.toLowerCase()
    .replace(/\s+/g, "") ?? null;
  if (seoRobots && !["index,follow", "index,nofollow", "noindex,follow", "noindex,nofollow"].includes(seoRobots)) {
    throw new Error("Choose a valid robots directive.");
  }

  return {
    title: data.title.trim(),
    slug,
    categoryId: data.categoryId.trim(),
    excerpt: optionalText(data.excerpt, "Excerpt", 500),
    summary: optionalText(data.summary, "Summary", 2000),
    description: sanitizeRichText(optionalText(data.description, "Description", 20000)),
    content: sanitizeRichText(optionalText(data.content, "Content", 200000)),
    imageUrl,
    imageAltText: optionalText(data.imageAltText, "Image alt text", 250),
    imagePosition,
    status,
    seoTitle: optionalText(data.seoTitle, "SEO title", 200),
    seoDescription: optionalText(data.seoDescription, "SEO description", 500),
    seoKeywords: optionalText(data.seoKeywords, "SEO keywords", 500),
    seoRobots,
    scheduledPublishAt,
  };
}

export function parseCategoryInput(value: unknown): { name: string; slug: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A category object is required.");
  }

  const data = value as Record<string, unknown>;
  if (typeof data.name !== "string" || !data.name.trim() || data.name.length > 80) {
    throw new Error("Category name is required and must be 80 characters or fewer.");
  }
  const slug = makeSlug(typeof data.slug === "string" && data.slug.trim() ? data.slug : data.name);
  if (!slug) throw new Error("Category slug must contain at least one letter or number.");
  return { name: data.name.trim(), slug };
}

export function parseHomepageSection(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Homepage card data is required.");
  const data = value as Record<string, unknown>;
  if (typeof data.group_name !== "string" || !homepageGroups.has(data.group_name)) throw new Error("Choose a valid homepage section.");
  if (typeof data.heading !== "string" || !data.heading.trim() || data.heading.length > 200) throw new Error("A heading of 200 characters or fewer is required.");
  if (typeof data.eyebrow !== "string" || data.eyebrow.length > 200) throw new Error("The label must be 200 characters or fewer.");
  if (typeof data.body !== "string" || data.body.length > 5000) throw new Error("The description must be 5000 characters or fewer.");
  if (typeof data.image_url !== "string" || data.image_url.length > 2048) throw new Error("Image URL must be 2048 characters or fewer.");
  if (data.image_url && !isAllowedImageUrl(data.image_url)) {
    throw new Error("Image URL must be an HTTP or HTTPS URL or a valid uploaded media path.");
  }
  const position = Number.isInteger(data.position) ? Math.max(0, Math.min(Number(data.position), 1000)) : 0;
  return {
    group_name: data.group_name,
    heading: data.heading.trim(),
    eyebrow: data.eyebrow.trim(),
    body: data.body.trim(),
    image_url: data.image_url.trim(),
    position,
    is_published: data.is_published === false || data.is_published === 0 ? 0 : 1,
  };
}
