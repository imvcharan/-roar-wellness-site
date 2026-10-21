export function getImportedPublishedAt(row: Record<string, unknown>): string | null {
  const rawDate = ["date_gmt", "dateGmt", "published_at", "publishedAt", "date"]
    .map((key) => row[key])
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  if (!rawDate) return null;

  const value = rawDate.trim();
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);
  const date = new Date(hasTimezone ? value : `${value}Z`);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("The source publication date must be a valid date and time.");
  }
  return date.toISOString();
}

export function formatCmsPublishedDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
}

export function compareCmsPublicationDates(
  first: string | null | undefined,
  second: string | null | undefined,
): number {
  const firstTime = first ? Date.parse(first) : 0;
  const secondTime = second ? Date.parse(second) : 0;
  return (Number.isFinite(secondTime) ? secondTime : 0) - (Number.isFinite(firstTime) ? firstTime : 0);
}
