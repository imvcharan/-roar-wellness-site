const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  copy: "©",
  hellip: "…",
  laquo: "«",
  ldquo: "“",
  lsquo: "‘",
  mdash: "—",
  nbsp: " ",
  ndash: "–",
  quot: "\"",
  raquo: "»",
  rdquo: "”",
  reg: "®",
  rsquo: "’",
  trade: "™",
};

function decodeEntity(entity: string): string {
  if (entity[1] === "#") {
    const isHex = entity[2]?.toLowerCase() === "x";
    const codePoint = Number.parseInt(entity.slice(isHex ? 3 : 2, -1), isHex ? 16 : 10);
    if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return entity;
    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return entity;
    }
  }
  return namedEntities[entity.slice(1, -1).toLowerCase()] ?? entity;
}

export function normalizeCmsPlainText(value: string): string {
  let text = value;
  for (let pass = 0; pass < 2; pass += 1) {
    text = text.replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, decodeEntity);
  }
  return text.replace(/\s*\[?…\]?\s*$/, "…").trim();
}
