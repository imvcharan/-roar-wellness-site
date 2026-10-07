import { redirect } from "next/navigation";
import InnerPagesPage from "@/components/site/InnerPagesPage";
import { findContentBySlug, listContent } from "@/lib/cms-db";
import { getCmsContentHref, isServiceCategory } from "@/lib/cms-routes";

export default async function LegacyInnerPagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const slug = typeof query.slug === "string" ? query.slug : undefined;
  const category = typeof query.category === "string" ? query.category : undefined;
  if (query.preview !== "1" && slug) {
    listContent();
    const item = findContentBySlug(slug);
    if (item) redirect(getCmsContentHref(item.slug, item.category_slug));
  }
  if (query.preview !== "1" && category === "blog") redirect("/blog");
  if (query.preview !== "1" && category && isServiceCategory(category)) {
    redirect(`/services?category=${encodeURIComponent(category)}`);
  }
  return <InnerPagesPage />;
}
