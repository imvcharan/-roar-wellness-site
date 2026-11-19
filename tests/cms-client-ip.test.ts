import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getCmsClientIp } from "../lib/cms-client-ip.ts";

const originalProvider = process.env.CMS_TRUSTED_PROXY_PROVIDER;

afterEach(() => {
  if (originalProvider === undefined) delete process.env.CMS_TRUSTED_PROXY_PROVIDER;
  else process.env.CMS_TRUSTED_PROXY_PROVIDER = originalProvider;
});

describe("trusted CMS client IP", () => {
  it("uses the Hostinger proxy address header and validates it", () => {
    process.env.CMS_TRUSTED_PROXY_PROVIDER = "hostinger";
    assert.equal(getCmsClientIp(new Request("https://example.test", {
      headers: { "x-real-ip": "203.0.113.8" },
    })), "203.0.113.8");
    assert.equal(getCmsClientIp(new Request("https://example.test", {
      headers: { "x-real-ip": "not-an-ip" },
    })), null);
  });

  it("uses provider-specific trusted headers", () => {
    process.env.CMS_TRUSTED_PROXY_PROVIDER = "cloudflare";
    assert.equal(getCmsClientIp(new Request("https://example.test", {
      headers: { "cf-connecting-ip": "2001:db8::1", "x-forwarded-for": "203.0.113.8" },
    })), "2001:db8::1");
    process.env.CMS_TRUSTED_PROXY_PROVIDER = "vercel";
    assert.equal(getCmsClientIp(new Request("https://example.test", {
      headers: { "x-vercel-forwarded-for": "203.0.113.9, 10.0.0.1" },
    })), "203.0.113.9");
  });
});
