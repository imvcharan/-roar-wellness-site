import sanitizeHtml from "sanitize-html";

const homepageGroups = new Set([
  "team", "reviews", "facility", "approach",
  "care-interlude", "essence-rooted", "essence-personal", "essence-feature", "essence-timeline",
]);
const reservedRootSlugs = new Set([
  "admin", "admin-login", "api", "appointment", "blog", "faqs", "gallery",
  "inner-pages", "news", "services", "_next", "uploads",
]);

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
  seoCanonicalUrl: string | null;
  seoOgTitle: string | null;
  seoOgDescription: string | null;
  seoOgImage: string | null;
  seoTwitterTitle: string | null;
  seoTwitterDescription: string | null;
  seoTwitterImage: string | null;
  scheduledPublishAt: string | null;
}

export class CmsContentValidationError extends Error {
  readonly field: keyof CmsContentInput;

  constructor(message: string, field: keyof CmsContentInput) {
    super(message);
    this.name = "CmsContentValidationError";
    this.field = field;
  }
}

function invalidContentField(field: keyof CmsContentInput, message: string): never {
  throw new CmsContentValidationError(message, field);
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
  return reservedRootSlugs.has(slug);
}

export function isReservedCmsRootSlug(slug: string): boolean {
  return reservedRootSlugs.has(slug);
}

function optionalText(value: unknown, label: string, maxLength: number, field: keyof CmsContentInput): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > maxLength) {
    invalidContentField(field, `${label} must be text no longer than ${maxLength} characters.`);
  }
  return value.trim() || null;
}

function sanitizeRichText(value: string | null, requireImageAlt: boolean, field: "description" | "content"): string | null {
  if (!value) return null;
  const sanitized = sanitizeHtml(value, {
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
  if (requireImageAlt) {
    for (const match of sanitized.matchAll(/<img\b[^>]*>/gi)) {
      if (!/\balt\s*=/i.test(match[0])) {
        invalidContentField(field, 'Every content image needs an alt attribute. Use alt="" only for a decorative image.');
      }
      const altText = match[0].match(/\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const alt = altText?.[1] ?? altText?.[2] ?? altText?.[3] ?? "";
      if (alt.length > 250) invalidContentField(field, "Content image alt text must be 250 characters or fewer.");
    }
  }
  return sanitized;
}

export function isAllowedImageUrl(value: string): boolean {
  if (/^\/(?:api\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|uploads\/[0-9a-f-]+\.webp)$/i.test(value)) {
    return true;
  }
  if (value.startsWith("/images/")) {
    const imagePath = value.slice("/images/".length);
    const segments = imagePath.split("/");
    return /\.(?:avif|gif|jpe?g|png|webp)$/i.test(imagePath)
      && segments.every((segment) =>
        segment.length > 0
        && segment !== "."
        && segment !== ".."
        && /^(?:[a-z0-9_-]|\.)+(?:%20(?:[a-z0-9_-]|\.)+)*$/i.test(segment)
      );
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
    invalidContentField("title", "Title is required and must be 200 characters or fewer.");
  }
  const slugInput = typeof data.slug === "string" && data.slug.trim()
    ? data.slug
    : data.title;
  const slug = makeSlug(slugInput);
  if (!slug) invalidContentField("slug", "Slug must contain at least one letter or number.");
  if (typeof data.categoryId !== "string" || !data.categoryId.trim()) {
    invalidContentField("categoryId", "Choose a category.");
  }
  const status = data.status ?? "draft";
  if (status !== "draft" && status !== "published" && status !== "archived") {
    invalidContentField("status", "Status must be draft, published, or archived.");
  }
  let scheduledPublishAt: string | null = null;
  if (data.scheduledPublishAt !== undefined && data.scheduledPublishAt !== null && data.scheduledPublishAt !== "") {
    if (typeof data.scheduledPublishAt !== "string" || !Number.isFinite(Date.parse(data.scheduledPublishAt))) {
      invalidContentField("scheduledPublishAt", "Scheduled publish time must be a valid date and time.");
    }
    if (Date.parse(data.scheduledPublishAt) <= Date.now()) {
      invalidContentField("scheduledPublishAt", "Scheduled publish time must be in the future.");
    }
    if (status !== "draft") {
      invalidContentField("status", "Scheduled content must have draft status until its publish time.");
    }
    scheduledPublishAt = new Date(data.scheduledPublishAt).toISOString();
  }
  const imageUrl = optionalText(data.imageUrl, "Image URL", 2048, "imageUrl");
  if (imageUrl && !isAllowedImageUrl(imageUrl)) {
    invalidContentField("imageUrl", "Image URL must be an HTTP or HTTPS URL or a valid uploaded media path.");
  }
  const imageAltText = optionalText(data.imageAltText, "Image alt text", 250, "imageAltText");
  if (status === "published" && imageUrl && !imageAltText) {
    invalidContentField("imageAltText", "Add descriptive alt text for the featured image before publishing.");
  }
  if (imageAltText && !imageUrl) {
    invalidContentField("imageUrl", "Add a featured image before entering its alt text.");
  }
  const imagePosition = optionalText(data.imagePosition, "Image focal position", 20, "imagePosition") ?? "50% 50%";
  const imagePositions = new Set([
    "0% 0%", "50% 0%", "100% 0%",
    "0% 50%", "50% 50%", "100% 50%",
    "0% 100%", "50% 100%", "100% 100%",
  ]);
  if (!imagePositions.has(imagePosition)) invalidContentField("imagePosition", "Choose a valid image focal position.");
  const seoRobots = optionalText(data.seoRobots, "Robots directive", 40, "seoRobots")
    ?.toLowerCase()
    .replace(/\s+/g, "") ?? null;
  if (seoRobots && !["index,follow", "index,nofollow", "noindex,follow", "noindex,nofollow"].includes(seoRobots)) {
    invalidContentField("seoRobots", "Choose a valid robots directive.");
  }
  const seoCanonicalUrl = optionalText(data.seoCanonicalUrl, "Canonical URL", 2048, "seoCanonicalUrl");
  if (seoCanonicalUrl) {
    try {
      const canonical = new URL(seoCanonicalUrl);
      if ((canonical.protocol !== "http:" && canonical.protocol !== "https:") || canonical.username || canonical.password) {
        throw new Error();
      }
    } catch {
      invalidContentField("seoCanonicalUrl", "Canonical URL must be a valid HTTP or HTTPS URL.");
    }
  }
  const seoOgImage = optionalText(data.seoOgImage, "Open Graph image URL", 2048, "seoOgImage");
  if (seoOgImage && !isAllowedImageUrl(seoOgImage)) {
    invalidContentField("seoOgImage", "Open Graph image URL must be an HTTP or HTTPS URL or a valid uploaded media path.");
  }
  const seoTwitterImage = optionalText(data.seoTwitterImage, "Twitter image URL", 2048, "seoTwitterImage");
  if (seoTwitterImage && !isAllowedImageUrl(seoTwitterImage)) {
    invalidContentField("seoTwitterImage", "Twitter image URL must be an HTTP or HTTPS URL or a valid uploaded media path.");
  }

  return {
    title: data.title.trim(),
    slug,
    categoryId: data.categoryId.trim(),
    excerpt: optionalText(data.excerpt, "Excerpt", 500, "excerpt"),
    summary: optionalText(data.summary, "Summary", 2000, "summary"),
    description: sanitizeRichText(optionalText(data.description, "Description", 20000, "description"), status === "published", "description"),
    content: sanitizeRichText(optionalText(data.content, "Content", 200000, "content"), status === "published", "content"),
    imageUrl,
    imageAltText,
    imagePosition,
    status,
    seoTitle: optionalText(data.seoTitle, "SEO title", 200, "seoTitle"),
    seoDescription: optionalText(data.seoDescription, "SEO description", 500, "seoDescription"),
    seoKeywords: optionalText(data.seoKeywords, "SEO keywords", 500, "seoKeywords"),
    seoRobots,
    seoCanonicalUrl,
    seoOgTitle: optionalText(data.seoOgTitle, "Open Graph title", 200, "seoOgTitle"),
    seoOgDescription: optionalText(data.seoOgDescription, "Open Graph description", 500, "seoOgDescription"),
    seoOgImage,
    seoTwitterTitle: optionalText(data.seoTwitterTitle, "Twitter title", 200, "seoTwitterTitle"),
    seoTwitterDescription: optionalText(data.seoTwitterDescription, "Twitter description", 500, "seoTwitterDescription"),
    seoTwitterImage,
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
  if (data.group_name === "reviews" && !data.body.trim()) throw new Error("A testimonial quote is required.");
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
