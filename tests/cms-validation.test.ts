import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toPublicBlogContent, type CmsContent } from "../lib/cms-db.ts";
import { CmsContentValidationError, isReservedCmsRootSlug, normalizeCmsBlogHtml, parseCmsContentInput, parseHomepageSection } from "../lib/cms-validation.ts";

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

    it("identifies which post form field rejected a scheduled time", () => {
      assert.throws(
        () => parseCmsContentInput({
          ...baseContent,
          status: "draft",
          scheduledPublishAt: new Date(Date.now() - 60_000).toISOString(),
        }),
        (error) => error instanceof CmsContentValidationError
          && error.field === "scheduledPublishAt"
          && error.message === "Scheduled publish time must be in the future.",
      );
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

describe("CMS image alt text", () => {
  it("requires descriptive featured image alt text before publishing", () => {
    assert.throws(
      () => parseCmsContentInput({
        ...baseContent,
        imageUrl: "/images/recovery-at-your-pace.webp",
      }),
      /Add descriptive alt text for the featured image before publishing/,
    );
    assert.equal(parseCmsContentInput({
      ...baseContent,
      imageUrl: "/images/recovery-at-your-pace.webp",
      imageAltText: "A clinician listening during a private consultation",
    }).imageAltText, "A clinician listening during a private consultation");
  });

  it("requires inline image alt attributes on published content but allows explicitly decorative images", () => {
    assert.throws(
      () => parseCmsContentInput({
        ...baseContent,
        content: '<p><img src="/images/recovery-at-your-pace.webp"></p>',
      }),
      /Every content image needs an alt attribute/,
    );
    assert.match(parseCmsContentInput({
      ...baseContent,
      content: '<p><img src="/images/recovery-at-your-pace.webp" alt=""></p>',
    }).content || "", /<img\b[^>]*\balt=""/);
  });
});

describe("CMS blog links", () => {
  it("normalizes existing blog links to same-tab anchors", () => {
    const markup = '<p><a href="https://example.org/article" target="_blank" rel="noopener noreferrer" class="article-link">Read more</a></p>';
    assert.equal(normalizeCmsBlogHtml(markup), '<p><a href="https://example.org/article" class="article-link">Read more</a></p>');
    assert.equal(
      normalizeCmsBlogHtml('<a href="https://example.org/sponsored" target="_blank" rel="noopener noreferrer sponsored">Sponsored link</a>'),
      '<a href="https://example.org/sponsored" rel="sponsored">Sponsored link</a>',
    );
    const content: CmsContent = {
      id: "blog-id",
      title: "Blog post",
      slug: "blog-post",
      category_id: "blog-category",
      category_name: "Blog",
      category_slug: "blog",
      excerpt: null,
      summary: null,
      description: markup,
      content: markup,
      image_url: null,
      image_alt_text: null,
      image_position: "50% 50%",
      status: "published",
      seo_title: null,
      seo_description: null,
      seo_keywords: null,
      seo_robots: null,
      seo_canonical_url: null,
      seo_og_title: null,
      seo_og_description: null,
      seo_og_image: null,
      seo_twitter_title: null,
      seo_twitter_description: null,
      seo_twitter_image: null,
      scheduled_publish_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      published_at: "2026-01-01T00:00:00.000Z",
    };
    const publicContent = toPublicBlogContent(content);
    assert.equal(publicContent.description, '<p><a href="https://example.org/article" class="article-link">Read more</a></p>');
    assert.equal(publicContent.content, '<p><a href="https://example.org/article" class="article-link">Read more</a></p>');
  });
});

describe("CMS root-level service routes", () => {
  it("blocks CMS slugs that would collide with built-in routes", () => {
    assert.equal(isReservedCmsRootSlug("services"), true);
    assert.equal(isReservedCmsRootSlug("appointment"), true);
    assert.equal(isReservedCmsRootSlug("poly-substance-abuse"), false);
  });
});

describe("CMS homepage testimonial content", () => {
  it("requires a quote while preserving optional client images", () => {
    assert.throws(() => parseHomepageSection({
      group_name: "reviews",
      heading: "Jordan",
      eyebrow: "Client review",
      body: " ",
      image_url: "",
    }), /A testimonial quote is required/);

    assert.deepEqual(parseHomepageSection({
      group_name: "reviews",
      heading: "Jordan",
      eyebrow: "Client review",
      body: "A helpful and supportive experience.",
      image_url: "",
      position: 2,
      is_published: true,
    }), {
      group_name: "reviews",
      heading: "Jordan",
      eyebrow: "Client review",
      body: "A helpful and supportive experience.",
      image_url: "",
      position: 2,
      is_published: 1,
    });
  });
});

describe("CMS homepage team profiles", () => {
  it("accepts a team profile with an optional role badge, image, and biography", () => {
    assert.deepEqual(parseHomepageSection({
      group_name: "team",
      heading: "Jordan Lee",
      eyebrow: "Clinical Director",
      body: "A short team biography.",
      image_url: "/images/team-jordan.webp",
      position: 2,
      is_published: true,
    }), {
      group_name: "team",
      heading: "Jordan Lee",
      eyebrow: "Clinical Director",
      body: "A short team biography.",
      image_url: "/images/team-jordan.webp",
      position: 2,
      is_published: 1,
    });
  });
});

describe("CMS homepage visual groups", () => {
  it("accepts images for homepage sliders and Care that connects cards", () => {
    for (const group_name of ["care-interlude", "essence-rooted", "essence-personal", "essence-feature", "essence-timeline"]) {
      assert.equal(parseHomepageSection({
        group_name,
        heading: "Homepage visual",
        eyebrow: "Image description",
        body: "",
        image_url: "/images/recovery-at-your-pace.webp",
        position: 0,
        is_published: true,
      }).group_name, group_name);
    }
  });
});
