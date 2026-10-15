import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAppointmentRequest } from "../lib/appointment-validation.ts";

const validRequest = {
  name: "  Asha Sharma ",
  email: " ASHA@example.org ",
  phone: " +91 98765 43210 ",
  source: "appointment",
  consent: true,
  token: "challenge-token",
  answer: "42",
};

describe("parseAppointmentRequest", () => {
  it("normalizes and returns only the validated contact fields", () => {
    assert.deepEqual(parseAppointmentRequest(validRequest), {
      name: "Asha Sharma",
      email: "asha@example.org",
      phone: "+91 98765 43210",
      source: "appointment",
      token: "challenge-token",
      answer: "42",
    });
  });

  const invalidRequests = [
    null,
    [],
    { ...validRequest, name: " " },
    { ...validRequest, name: "n".repeat(121) },
    { ...validRequest, email: "not-an-email" },
    { ...validRequest, phone: "" },
    { ...validRequest, source: "other" },
    { ...validRequest, consent: false },
    { ...validRequest, website: "bot" },
  ];
  invalidRequests.forEach((request, index) => {
    it(`rejects invalid request ${index}`, () => {
      assert.equal(parseAppointmentRequest(request), null);
    });
  });

  it("accepts contact requests and rejects non-object JSON values", () => {
    assert.equal(parseAppointmentRequest({ ...validRequest, source: "contact" })?.source, "contact");
    assert.equal(parseAppointmentRequest("request"), null);
  });
});
