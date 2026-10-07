import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import InnerPagesPage from "@/components/site/InnerPagesPage";
import { getRouteContentMetadata, resolvePublishedRouteContent } from "@/lib/cms-route-content";
import { getCmsContentHref } from "@/lib/cms-routes";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const resolved = resolvePublishedRouteContent(slug, "blog");
  const canonical = resolved.item ? getCmsContentHref(resolved.item.slug, resolved.item.category_slug) : `/blog/${encodeURIComponent(slug)}`;
  return getRouteContentMetadata(resolved.item, canonical);
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const resolved = resolvePublishedRouteContent(slug, "blog");
  if (resolved.redirectTo) permanentRedirect(resolved.redirectTo);
  if (!resolved.item) notFound();
  return <InnerPagesPage detailSlug={slug} detailKind="blog" />;
}
