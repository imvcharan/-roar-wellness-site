import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import InnerPagesPage from "@/components/site/InnerPagesPage";
import { getCmsContentStructuredData, getRouteContentMetadata, resolvePublishedRootRouteContent } from "@/lib/cms-route-content";
import { getCmsContentHref } from "@/lib/cms-routes";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const resolved = resolvePublishedRootRouteContent(slug);
  const canonical = resolved.item ? getCmsContentHref(resolved.item.slug, resolved.item.category_slug) : `/${encodeURIComponent(slug)}`;
  return getRouteContentMetadata(resolved.item, canonical);
}

export default async function SiteContentPage({ params }: Props) {
  const { slug } = await params;
  const resolved = resolvePublishedRootRouteContent(slug);
  if (resolved.redirectTo) permanentRedirect(resolved.redirectTo);
  if (!resolved.item) notFound();
  if (resolved.kind === "service") {
    const structuredData = getCmsContentStructuredData(
      resolved.item,
      getCmsContentHref(resolved.item.slug, resolved.item.category_slug),
      "service",
    );
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
  return <InnerPagesPage detailSlug={slug} detailKind="page" />;
}
