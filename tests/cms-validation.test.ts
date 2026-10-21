import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCmsContentInput } from "../lib/cms-validation.ts";

const baseContent = {
  title: "Recovery services",
  slug: "recovery-services",
  categoryId: "category-id",
  status: "published",
  imagePosition: "50% 50%",
};

describe("CMS content SEO metadata", () => {
  it("normalizes optional canonical, Open Graph, and Twitter metadata", () => {
    assert.deepEqual(parseCmsContentInput({
      ...baseContent,
      seoCanonicalUrl: "https://www.roarwellness.org/services/recovery/",
      seoOgTitle: "Recovery support",
      seoOgDescription: "Explore confidential support.",
      seoOgImage: "/images/recovery-at-your-pace.webp",
      seoTwitterTitle: "Recovery at Roar Wellness",
      seoTwitterDescription: "Learn about recovery support.",
      seoTwitterImage: "https://cdn.example.org/recovery.webp",
    }), {
      title: "Recovery services",
      slug: "recovery-services",
      categoryId: "category-id",
      excerpt: null,
      summary: null,
      description: null,
      content: null,
      imageUrl: null,
      imageAltText: null,
      imagePosition: "50% 50%",
      status: "published",
      seoTitle: null,
      seoDescription: null,
      seoKeywords: null,
      seoRobots: null,
      seoCanonicalUrl: "https://www.roarwellness.org/services/recovery/",
      seoOgTitle: "Recovery support",
      seoOgDescription: "Explore confidential support.",
      seoOgImage: "/images/recovery-at-your-pace.webp",
      seoTwitterTitle: "Recovery at Roar Wellness",
      seoTwitterDescription: "Learn about recovery support.",
      seoTwitterImage: "https://cdn.example.org/recovery.webp",
      scheduledPublishAt: null,
    });
  });

  it("rejects invalid canonical protocols and unsafe social image URLs", () => {
    assert.throws(
      () => parseCmsContentInput({ ...baseContent, seoCanonicalUrl: "javascript:alert(1)" }),
      /Canonical URL must be a valid HTTP or HTTPS URL/,
    );
    assert.throws(
      () => parseCmsContentInput({ ...baseContent, seoOgImage: "javascript:alert(1)" }),
      /Open Graph image URL must be an HTTP or HTTPS URL/,
    );
    assert.throws(
      () => parseCmsContentInput({ ...baseContent, seoTwitterImage: "data:image/png;base64,abc" }),
      /Twitter image URL must be an HTTP or HTTPS URL/,
    );
  });
});
