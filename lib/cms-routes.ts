export type CmsRouteKind = "service" | "blog" | "page";

const serviceCategories = new Set(["treatments", "therapy", "mental-healthcare"]);

export function getCmsRouteKind(categorySlug: string): CmsRouteKind {
  if (serviceCategories.has(categorySlug)) return "service";
  return categorySlug === "blog" ? "blog" : "page";
}

export function getCmsContentHref(slug: string, categorySlug: string): string {
  const kind = getCmsRouteKind(categorySlug);
  if (kind === "service") return `/services/${encodeURIComponent(slug)}`;
  if (kind === "blog") return `/blog/${encodeURIComponent(slug)}`;
  return `/${encodeURIComponent(slug)}`;
}

export function getCmsContentRoutePath(slug: string, kind: CmsRouteKind): string {
  if (kind === "service") return `/services/${encodeURIComponent(slug)}`;
  if (kind === "blog") return `/blog/${encodeURIComponent(slug)}`;
  return `/${encodeURIComponent(slug)}`;
}

export function getCmsCategoryLabel(categorySlug: string): string {
  switch (categorySlug) {
    case "treatments": return "Treatments";
    case "therapy": return "Therapy";
    case "mental-healthcare": return "Mental healthcare";
    case "blog": return "Blog";
    default: return "About Roar Wellness";
  }
}

export function isServiceCategory(categorySlug: string): boolean {
  return serviceCategories.has(categorySlug);
}

export function isPageCategory(categorySlug: string): boolean {
  return !isServiceCategory(categorySlug) && categorySlug !== "blog";
}

export function isLocationService(slug: string): boolean {
  return /^(luxury-rehabilitation-centre-|rehab-centre-female-|best-rehabilitation-cent(er|re)-in-|best-rehabilitations?-in-|best-rehab-centre-in-|get-the-best-(rehabilitation|alcohol-addiction)-|alcohol-addiction-treatment-centre(?:-in-.*)?$|alcohol-rehabilitation-centre$|charas-deaddiction$|drug-alcohol-treatment-facility-delhi-india$|drug-rehabilitation-center-in-|opioid-addiction-treatment-|rehab-center-in-india)/.test(slug);
}
