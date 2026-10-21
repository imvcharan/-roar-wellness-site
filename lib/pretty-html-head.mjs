export function prettyHtmlHead(html) {
  const openingHead = /<head\b[^>]*>/i.exec(html);
  if (!openingHead) return html;

  const contentStart = openingHead.index + openingHead[0].length;
  const closingHeadIndex = html.toLowerCase().indexOf("</head>", contentStart);
  if (closingHeadIndex < 0) return html;

  const headContent = html.slice(contentStart, closingHeadIndex);
  let formatted = "";
  let position = 0;

  const appendLineBreak = () => {
    if (!formatted.endsWith("\n")) formatted += "\n";
  };

  while (position < headContent.length) {
    if (headContent.startsWith("<!--", position)) {
      const commentEnd = headContent.indexOf("-->", position + 4);
      if (commentEnd < 0) {
        formatted += headContent.slice(position);
        break;
      }
      formatted += headContent.slice(position, commentEnd + 3);
      position = commentEnd + 3;
      appendLineBreak();
      continue;
    }

    if (headContent[position] !== "<") {
      const nextTag = headContent.indexOf("<", position);
      const end = nextTag < 0 ? headContent.length : nextTag;
      formatted += headContent.slice(position, end);
      position = end;
      continue;
    }

    if (/^<(script|style)\b/i.test(headContent.slice(position))) {
      const rawTag = /^<(script|style)\b/i.exec(headContent.slice(position))?.[1];
      if (!rawTag) {
        formatted += headContent[position];
        position += 1;
        continue;
      }
      const closingTag = `</${rawTag}`;
      const closingTagIndex = headContent.toLowerCase().indexOf(closingTag, position);
      if (closingTagIndex < 0) {
        formatted += headContent.slice(position);
        break;
      }
      const closingTagEnd = headContent.indexOf(">", closingTagIndex);
      if (closingTagEnd < 0) {
        formatted += headContent.slice(position);
        break;
      }
      formatted += headContent.slice(position, closingTagEnd + 1);
      position = closingTagEnd + 1;
      appendLineBreak();
      continue;
    }

    let quote = "";
    let tagEnd = position + 1;
    for (; tagEnd < headContent.length; tagEnd += 1) {
      const character = headContent[tagEnd];
      if (quote) {
        if (character === quote) quote = "";
      } else if (character === "\"" || character === "'") {
        quote = character;
      } else if (character === ">") {
        break;
      }
    }
    if (tagEnd >= headContent.length) {
      formatted += headContent.slice(position);
      break;
    }

    const tag = headContent.slice(position, tagEnd + 1);
    formatted += tag;
    position = tagEnd + 1;

    if (/^<head\b/i.test(tag) || /^<(meta|link|base)\b/i.test(tag) || /^<\//.test(tag)) {
      appendLineBreak();
    }
  }

  const beforeHead = html.slice(0, contentStart);
  const afterHead = html.slice(closingHeadIndex);
  return `${beforeHead}\n${formatted}${afterHead}`;
}
