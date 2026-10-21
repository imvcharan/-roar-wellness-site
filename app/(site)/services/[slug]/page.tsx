import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getCmsContentStructuredData, getRouteContentMetadata, resolvePublishedRouteContent } from "@/lib/cms-route-content";
import { getCmsContentHref } from "@/lib/cms-routes";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const resolved = resolvePublishedRouteContent(slug, "service");
  const fallbackCanonical = resolved.item ? getCmsContentHref(resolved.item.slug, resolved.item.category_slug) : `/${encodeURIComponent(slug)}`;
  return getRouteContentMetadata(resolved.item, fallbackCanonical);
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const resolved = resolvePublishedRouteContent(slug, "service");
  if (resolved.redirectTo) permanentRedirect(resolved.redirectTo);
  if (!resolved.item) notFound();
  permanentRedirect(getCmsContentHref(resolved.item.slug, resolved.item.category_slug));
}
