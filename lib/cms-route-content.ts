import type { Metadata } from "next";
import { getCmsContentImage } from "@/lib/cms-content-image";
import { findContentBySlug, findPublishedContentRedirect, getCmsSettings, listContent, type CmsContent } from "@/lib/cms-db";
import { getCmsContentHref, getCmsContentRoutePath, getCmsRouteKind } from "@/lib/cms-routes";

export type CmsRouteKind = "service" | "blog" | "page";

export function findPublishedRouteContent(slug: string, kind: CmsRouteKind): CmsContent | undefined {
  listContent();
  const item = findContentBySlug(slug);
  return item && getCmsRouteKind(item.category_slug) === kind ? item : undefined;
}

export function resolvePublishedRouteContent(slug: string, kind: CmsRouteKind): {
  item?: CmsContent;
  redirectTo?: string;
} {
  const item = findPublishedRouteContent(slug, kind);
  if (item) return { item };

  const previousUrl = getCmsContentRoutePath(slug, kind);
  const redirectedItem = findPublishedContentRedirect(previousUrl);
  if (!redirectedItem) return {};

  return {
    item: redirectedItem,
    redirectTo: getCmsContentHref(redirectedItem.slug, redirectedItem.category_slug),
  };
}

export function getCmsContentCanonical(item: CmsContent, fallback: string): string {
  if (!item.seo_canonical_url) return fallback;
  try {
    const canonical = new URL(item.seo_canonical_url);
    if (canonical.protocol === "http:" || canonical.protocol === "https:") return canonical.toString();
  } catch {
    return fallback;
  }
  return fallback;
}

export function getCmsContentStructuredData(
  item: CmsContent,
  fallbackCanonical: string,
  kind: "service" | "blog",
) {
  const settings = getCmsSettings();
  const siteUrl = (settings.siteUrl || "https://www.roarwellness.org").replace(/\/+$/, "");
  const canonical = getCmsContentCanonical(item, fallbackCanonical);
  const pageUrl = new URL(canonical, `${siteUrl}/`).toString();
  const imageUrl = item.seo_og_image || item.image_url || getCmsContentImage(item.content)
    || (kind === "service" ? "/images/ready-to-begin.webp" : null);
  const absoluteImageUrl = imageUrl ? new URL(imageUrl, `${siteUrl}/`).toString() : undefined;
  const title = item.seo_title || `${item.title} | Roar Wellness`;
  const description = item.seo_description || item.summary || item.excerpt || undefined;
  const pageId = `${pageUrl}#webpage`;
  const imageId = `${pageUrl}#primaryimage`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;
  const organizationId = `${siteUrl}/#organization`;
  const websiteId = `${siteUrl}/#website`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageId,
        url: pageUrl,
        name: title,
        ...(description ? { description } : {}),
        isPartOf: { "@id": websiteId },
        primaryImageOfPage: absoluteImageUrl ? { "@id": imageId } : undefined,
        image: absoluteImageUrl ? { "@id": imageId } : undefined,
        ...(item.published_at ? { datePublished: item.published_at } : {}),
        dateModified: item.updated_at,
        breadcrumb: { "@id": breadcrumbId },
        inLanguage: "en-IN",
      },
      ...(absoluteImageUrl ? [{
        "@type": "ImageObject",
        "@id": imageId,
        url: absoluteImageUrl,
        contentUrl: absoluteImageUrl,
      }] : []),
      ...(kind === "blog" ? [{
        "@type": "BlogPosting",
        "@id": `${pageUrl}#article`,
        mainEntityOfPage: { "@id": pageId },
        headline: title,
        ...(description ? { description } : {}),
        ...(absoluteImageUrl ? { image: [absoluteImageUrl] } : {}),
        datePublished: item.published_at || item.created_at,
        dateModified: item.updated_at,
        author: { "@id": organizationId },
        publisher: { "@id": organizationId },
        inLanguage: "en-IN",
      }] : []),
      {
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
          {
            "@type": "ListItem",
            position: 2,
            name: item.category_name,
            item: new URL(kind === "blog" ? "/blog/" : "/services/", `${siteUrl}/`).toString(),
          },
          { "@type": "ListItem", position: 3, name: item.title, item: pageUrl },
        ],
      },
    ],
  };
}

export function getRouteContentMetadata(item: CmsContent | undefined, canonical: string): Metadata {
  if (!item) return { title: "Page not found | Roar Wellness" };
  const routeKind = getCmsRouteKind(item.category_slug);
  const settings = getCmsSettings();
  const imageUrl = item.seo_og_image || item.image_url || getCmsContentImage(item.content)
    || (routeKind === "service" ? "/images/ready-to-begin.webp" : null);
  const canonicalUrl = getCmsContentCanonical(item, canonical);
  const title = item.seo_title || `${item.title} | Roar Wellness`;
  const defaultDescription = item.slug === "videos"
    ? "Watch Roar Wellness videos about recovery, addiction treatment, mental healthcare, and life at our rehabilitation centre in Delhi."
    : item.summary || item.excerpt || undefined;
  const description = item.seo_description || defaultDescription;
  const openGraphTitle = item.seo_og_title || title;
  const openGraphDescription = item.seo_og_description || description;
  const twitterTitle = item.seo_twitter_title || openGraphTitle;
  const twitterDescription = item.seo_twitter_description || openGraphDescription;
  const twitterImage = item.seo_twitter_image || imageUrl;
  const keywords = item.seo_keywords
    ?.split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const [indexDirective, followDirective] = (item.seo_robots || "index,follow").split(",");
  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    robots: {
      index: indexDirective !== "noindex",
      follow: followDirective !== "nofollow",
      googleBot: {
        index: indexDirective !== "noindex",
        follow: followDirective !== "nofollow",
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    alternates: { canonical: canonicalUrl },
    openGraph: {
      siteName: settings.siteName || "Roar Wellness",
      locale: "en_US",
      title: openGraphTitle,
      ...(openGraphDescription ? { description: openGraphDescription } : {}),
      url: canonicalUrl,
      type: "article",
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: twitterTitle,
      ...(twitterDescription ? { description: twitterDescription } : {}),
      ...(twitterImage ? { images: [twitterImage] } : {}),
    },
  };
}
