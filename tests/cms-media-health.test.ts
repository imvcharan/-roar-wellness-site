import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { isCmsMediaStorageAvailable } from "../lib/cms-media-health.ts";

describe("CMS media storage health", () => {
  it("requires an existing writable directory", async () => {
    const directory = await mkdtemp(join(tmpdir(), "roar-media-health-"));
    const previous = process.env.CMS_MEDIA_DIRECTORY;
    try {
      process.env.CMS_MEDIA_DIRECTORY = directory;
      assert.equal(await isCmsMediaStorageAvailable(), true);
      await rm(directory, { recursive: true, force: true });
      assert.equal(await isCmsMediaStorageAvailable(), false);
      const filePath = join(tmpdir(), `roar-media-health-${Date.now()}.txt`);
      await writeFile(filePath, "not a directory");
      try {
        process.env.CMS_MEDIA_DIRECTORY = filePath;
        assert.equal(await isCmsMediaStorageAvailable(), false);
      } finally {
        await rm(filePath, { force: true });
      }
    } finally {
      if (previous === undefined) delete process.env.CMS_MEDIA_DIRECTORY;
      else process.env.CMS_MEDIA_DIRECTORY = previous;
      await rm(directory, { recursive: true, force: true });
    }
  });
});
