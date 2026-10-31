import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isReservedCmsRootSlug, parseCmsContentInput, parseHomepageSection } from "../lib/cms-validation.ts";

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
