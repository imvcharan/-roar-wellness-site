import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareCmsPublicationDates, formatCmsPublishedDate, getImportedPublishedAt } from "../lib/cms-date.ts";

describe("CMS publication dates", () => {
  it("uses the source UTC publication date rather than the import time", () => {
    assert.equal(
      getImportedPublishedAt({
        date: "2025-05-12T10:05:54",
        date_gmt: "2025-05-12T10:05:54",
      }),
      "2025-05-12T10:05:54.000Z",
    );
  });

  it("falls back to a valid source date and rejects invalid dates", () => {
    assert.equal(
      getImportedPublishedAt({ date: "2025-05-12T10:05:54" }),
      "2025-05-12T10:05:54.000Z",
    );
    assert.throws(
      () => getImportedPublishedAt({ date_gmt: "not-a-date" }),
      /source publication date must be a valid date and time/i,
    );
  });

  it("formats the exact source publication date and time consistently across visitor time zones", () => {
    assert.equal(formatCmsPublishedDate("2025-05-12T10:05:54.000Z"), "12 May 2025 at 10:05 am");
    assert.equal(formatCmsPublishedDate(null), "");
  });

  it("orders imported posts by original publication date, newest first", () => {
    const dates = ["2025-05-12T10:05:54.000Z", "2026-10-06T07:38:45.000Z", null];
    assert.deepEqual(dates.sort(compareCmsPublicationDates), [
      "2026-10-06T07:38:45.000Z",
      "2025-05-12T10:05:54.000Z",
      null,
    ]);
  });
});
