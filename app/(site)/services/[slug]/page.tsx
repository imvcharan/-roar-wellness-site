import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import InnerPagesPage from "@/components/site/InnerPagesPage";
import { getCmsContentStructuredData, getRouteContentMetadata, resolvePublishedRouteContent } from "@/lib/cms-route-content";
import { getCmsContentHref } from "@/lib/cms-routes";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const resolved = resolvePublishedRouteContent(slug, "service");
  const fallbackCanonical = resolved.item ? getCmsContentHref(resolved.item.slug, resolved.item.category_slug) : `/services/${encodeURIComponent(slug)}`;
  return getRouteContentMetadata(resolved.item, fallbackCanonical);
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const resolved = resolvePublishedRouteContent(slug, "service");
  if (resolved.redirectTo) permanentRedirect(resolved.redirectTo);
  if (!resolved.item) notFound();

  const item = resolved.item;
  const fallbackCanonical = getCmsContentHref(item.slug, item.category_slug);
  const structuredData = getCmsContentStructuredData(item, fallbackCanonical, "service");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <InnerPagesPage detailSlug={slug} detailKind="service" />
    </>
  );
}
