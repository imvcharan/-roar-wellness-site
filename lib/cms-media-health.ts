import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { getCmsMediaDirectory } from "./cms-media-storage.ts";

export async function isCmsMediaStorageAvailable(): Promise<boolean> {
  try {
    const directory = getCmsMediaDirectory();
    const metadata = await stat(directory);
    if (!metadata.isDirectory()) return false;
    await access(directory, constants.R_OK | constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
