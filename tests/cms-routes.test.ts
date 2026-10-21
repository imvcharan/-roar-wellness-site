import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCmsContentHref, getCmsContentRoutePath } from "../lib/cms-routes.ts";

describe("CMS public URL structure", () => {
  it("publishes service categories at the legacy-compatible top-level slug", () => {
    for (const category of ["treatments", "therapy", "mental-healthcare"]) {
      assert.equal(getCmsContentHref("poly-substance-abuse", category), "/poly-substance-abuse");
    }
    assert.equal(getCmsContentRoutePath("poly-substance-abuse", "service"), "/poly-substance-abuse");
  });

  it("keeps blog posts in the blog namespace", () => {
    assert.equal(getCmsContentHref("recovery-story", "blog"), "/blog/recovery-story");
    assert.equal(getCmsContentRoutePath("recovery-story", "blog"), "/blog/recovery-story");
  });

  it("keeps regular CMS pages at the root", () => {
    assert.equal(getCmsContentHref("about-roarwellness", "main-pages"), "/about-roarwellness");
    assert.equal(getCmsContentRoutePath("about-roarwellness", "page"), "/about-roarwellness");
  });
});
