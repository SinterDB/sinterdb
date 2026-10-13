import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Generated files go through the workspace's Prettier when it is installed,
 * so a regenerate produces the same text `pnpm format` would and diffs only
 * show real changes. Without Prettier, files are written as-is.
 */
const prettier = await import("prettier").catch(() => null);

/**
 * @param {string} file
 * @param {string} contents
 */
export async function writeFormatted(file, contents) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, await format(file, contents), "utf8");
}

async function format(file, contents) {
  if (!prettier) {
    return contents;
  }

  const config = await prettier.resolveConfig(file);
  return prettier.format(contents, { ...config, filepath: file });
}
