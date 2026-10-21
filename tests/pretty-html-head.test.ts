import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prettyHtmlHead } from "../lib/pretty-html-head.mjs";

describe("prettyHtmlHead", () => {
  it("puts head metadata on separate lines without changing tag values or body markup", () => {
    const html = '<html><head><meta name="description" content="Useful page"><title>Page title</title><script type="application/ld+json">{"name":"<meta>"}</script></head><body><p>Keep body unchanged</p></body></html>';
    const result = prettyHtmlHead(html);

    assert.match(result, /<head>\n<meta name="description" content="Useful page">\n<title>Page title<\/title>\n<script type="application\/ld\+json">\{"name":"<meta>"\}<\/script>\n<\/head>/);
    assert.ok(result.endsWith("<body><p>Keep body unchanged</p></body></html>"));
  });

  it("leaves HTML without a complete head unchanged", () => {
    assert.equal(prettyHtmlHead("<html><body>Page</body></html>"), "<html><body>Page</body></html>");
    assert.equal(prettyHtmlHead("<html><head><meta name=\"description\">"), "<html><head><meta name=\"description\">");
  });
});
