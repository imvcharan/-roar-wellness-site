function decodeImageUrl(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&#0*38;/g, "&")
    .replace(/&#x0*26;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .trim();
}

function getAttribute(tag: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`\\b${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] || match?.[2] || match?.[3] || "";
}

export function getCmsContentImage(content: string | null | undefined): string | null {
  if (!content) return null;

  for (const match of content.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const source = ["data-src", "data-lazy-src", "src"]
      .map((attribute) => getAttribute(tag, attribute))
      .find(Boolean);
    if (!source) continue;

    const imageUrl = decodeImageUrl(source);
    if (/^(https?:\/\/|\/(?!\/))/i.test(imageUrl)) return imageUrl;
  }

  return null;
}
