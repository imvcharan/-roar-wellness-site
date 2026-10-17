import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InnerPagesPage from "@/components/site/InnerPagesPage";
import { getRouteContentMetadata, resolvePublishedRouteContent } from "@/lib/cms-route-content";
import { getCmsContentHref } from "@/lib/cms-routes";

export async function generateMetadata(): Promise<Metadata> {
  const resolved = resolvePublishedRouteContent("news", "page");
  const canonical = resolved.item ? getCmsContentHref(resolved.item.slug, resolved.item.category_slug) : "/news";
  return getRouteContentMetadata(resolved.item, canonical);
}

export default function NewsPage() {
  const resolved = resolvePublishedRouteContent("news", "page");
  if (!resolved.item) notFound();
  return <InnerPagesPage detailSlug="news" detailKind="page" />;
}
