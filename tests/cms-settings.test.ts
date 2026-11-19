import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPublicCmsSettings } from "../lib/cms-settings.ts";

describe("public CMS settings", () => {
  it("returns known public keys and excludes unknown stored values", () => {
    assert.deepEqual(getPublicCmsSettings({
      siteName: "Roar Wellness",
      contactEmail: "help@example.org",
      smtpPassword: "must-not-be-public",
      internalFeatureFlag: "enabled",
    }), {
      siteName: "Roar Wellness",
      contactEmail: "help@example.org",
    });
  });
});
