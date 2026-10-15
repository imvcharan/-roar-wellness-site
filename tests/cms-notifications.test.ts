import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEnquiryNotification } from "../lib/cms-notification-message.ts";

describe("enquiry notification content", () => {
  it("sends an inbox link without copying enquiry contact details into email", () => {
    const message = buildEnquiryNotification(
      "2026-10-15T10:00:00Z", "https://www.roarwellness.org/", "alerts@example.org", "team@example.org",
    );
    assert.equal(message.subject, "New website enquiry");
    assert.match(message.text, /https:\/\/www\.roarwellness\.org\/admin\/enquiries/);
    assert.doesNotMatch(message.text, /@|phone|email|contact details/i);
  });
});
