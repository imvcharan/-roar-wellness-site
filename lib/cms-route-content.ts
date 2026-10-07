import type { Metadata } from "next";
import { findContentBySlug, findPublishedContentRedirect, listContent, type CmsContent } from "@/lib/cms-db";
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

export function getRouteContentMetadata(item: CmsContent | undefined, canonical: string): Metadata {
  if (!item) return { title: "Page not found | Roar Wellness" };
  const title = item.seo_title || `${item.title} | Roar Wellness`;
  const defaultDescription = item.slug === "videos"
    ? "Watch Roar Wellness videos about recovery, addiction treatment, mental healthcare, and life at our rehabilitation centre in Delhi."
    : item.summary || item.excerpt || undefined;
  const description = item.seo_description || defaultDescription;
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
    },
    alternates: { canonical },
    openGraph: {
      title,
      ...(description ? { description } : {}),
      url: canonical,
      type: "article",
      ...(item.image_url ? { images: [item.image_url] } : {}),
    },
    twitter: {
      card: item.image_url ? "summary_large_image" : "summary",
      title,
      ...(description ? { description } : {}),
      ...(item.image_url ? { images: [item.image_url] } : {}),
    },
  };
}
