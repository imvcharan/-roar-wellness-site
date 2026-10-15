import { readFile, writeFile } from "node:fs/promises";
import { decryptCmsBackupFile } from "@/lib/cms-backup";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: npm run cms:backup:decrypt -- <encrypted-file> <plaintext-json-output>");
  process.exitCode = 1;
} else {
  try {
    const plaintext = await decryptCmsBackupFile(await readFile(input));
    await writeFile(output, plaintext, { flag: "wx", mode: 0o600 });
    console.info(`Decrypted backup written to ${output}. It contains sensitive enquiry data; protect and delete it securely after use.`);
  } catch (error) {
    console.error("CMS backup decryption failed.", error);
    process.exitCode = 1;
  }
}
