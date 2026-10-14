import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { PUBLIC_PACKAGES, RELEASE_DIST_TAG, tarballSpec } from "./manifests.ts";

export interface CommandResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

export type CommandRunner = (
  command: string,
  arguments_: readonly string[],
) => CommandResult;

export interface PublishOptions {
  /** The folder holding the tarballs that `rehearse` packed and checked. */
  readonly directory: string;
  readonly version: string;
  /** The npm dist-tag to publish under. */
  readonly distTag: string;
  /** Run `npm publish --dry-run` instead. Nothing is uploaded. */
  readonly dryRun?: boolean;
  readonly run?: CommandRunner;
  readonly log?: (line: string) => void;
  /** Called between attempts to read a dist-tag back. */
  readonly wait?: (milliseconds: number) => void;
}

export interface PublishResult {
  readonly published: readonly string[];
  readonly skipped: readonly string[];
}

const defaultRun: CommandRunner = (command, arguments_) => {
  const result = spawnSync(command, [...arguments_], {
    encoding: "utf8",
    timeout: 300_000,
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
};

function sleep(milliseconds: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

/**
 * Publishes the packed packages to npm, protocol first because the driver
 * depends on it. It publishes the exact tarballs that were tested, with
 * provenance, under `distTag` (never `latest` for a prerelease version). A
 * version that is already on npm is skipped, so a run that stopped halfway can
 * be run again.
 *
 * All packages are published before any is checked. npm's registry is cached
 * for a few minutes, and a trusted publisher that only allows staged
 * publishing accepts a publish without making the version public, so checking
 * one package at a time could stop the run after the first.
 */
export function publishTarballs(options: PublishOptions): PublishResult {
  const run = options.run ?? defaultRun;
  const log = options.log ?? (() => undefined);
  const wait = options.wait ?? sleep;
  const { version, distTag } = options;
  const published: string[] = [];
  const skipped: string[] = [];

  if (distTag === "latest" && version.includes("-")) {
    throw new Error(
      `${version} is a prerelease and must not be published under "latest". Use another tag, such as "next".`,
    );
  }

  const plan = PUBLIC_PACKAGES.map(({ name }) => ({
    name,
    file: tarballSpec(
      join(
        options.directory,
        `${name.replace(/^@/, "").replace("/", "-")}-${version}.tgz`,
      ),
    ),
  }));

  // Fail before uploading anything if a tarball is missing.
  for (const { name, file } of plan) {
    if (!existsSync(file) && options.run === undefined) {
      throw new Error(`The tarball for ${name} is missing: ${file}`);
    }
  }

  for (const { name, file } of plan) {
    if (isVisible(name, version, run)) {
      log(`${name}@${version} is already on npm; skipping.`);
      skipped.push(name);

      continue;
    }

    log(`Publishing ${name}@${version} under "${distTag}"`);

    const result = run("npm", [
      "publish",
      file,
      "--tag",
      distTag,
      "--access",
      "public",
      ...(options.dryRun === true ? ["--dry-run"] : ["--provenance"]),
    ]);
    const output = `${result.stdout}${result.stderr}`.trim();

    if (result.status !== 0) {
      // The registry can be slow to show a version it already has, so the
      // check above may have missed it.
      if (/cannot publish over|previously published/i.test(output)) {
        log(`${name}@${version} was already published; skipping.`);
        skipped.push(name);

        continue;
      }

      throw new Error(`npm publish failed for ${name}@${version}:\n${output}`);
    }

    // npm says here what it did, for example that it staged the package.
    for (const line of output.split("\n").slice(-12)) {
      log(`  npm: ${line}`);
    }

    published.push(name);
  }

  if (options.dryRun !== true && published.length > 0) {
    confirmPublished(published, version, distTag, run, wait, log);
  }

  return { published, skipped };
}

function isVisible(name: string, version: string, run: CommandRunner): boolean {
  const result = run("npm", [
    "view",
    `${name}@${version}`,
    "version",
    "--prefer-online",
  ]);

  return result.status === 0 && result.stdout.trim() === version;
}

function readTags(
  name: string,
  run: CommandRunner,
): Record<string, string> | undefined {
  const result = run("npm", [
    "view",
    name,
    "dist-tags",
    "--json",
    "--prefer-online",
  ]);

  if (result.status !== 0) {
    return undefined;
  }

  try {
    return JSON.parse(result.stdout) as Record<string, string>;
  } catch {
    return undefined;
  }
}

const ATTEMPTS = 30;
const SECONDS_BETWEEN_ATTEMPTS = 10;

/**
 * Waits for every published package to show `distTag` pointing at the new
 * version. The registry's cache can hide a new version for about five
 * minutes, so this waits that long before it gives up, and then says which of
 * two things went wrong.
 */
function confirmPublished(
  names: readonly string[],
  version: string,
  distTag: string,
  run: CommandRunner,
  wait: (milliseconds: number) => void,
  log: (line: string) => void,
): void {
  const pending = new Set(names);

  for (let attempt = 0; attempt < ATTEMPTS && pending.size > 0; attempt += 1) {
    for (const name of [...pending]) {
      const tags = readTags(name, run);

      if (tags?.[distTag] === version) {
        pending.delete(name);

        // npm can point "latest" at the very first version of a new package
        // whatever tag it was published under. That is npm's doing, so say so
        // rather than fail a release that went out correctly.
        if (tags["latest"] === version && distTag !== "latest") {
          log(
            `Note: npm also points "latest" at ${name}@${version}. It does that for the first version of a package; it is replaced by the next release you promote.`,
          );
        }
      }
    }

    if (pending.size > 0 && attempt < ATTEMPTS - 1) {
      wait(SECONDS_BETWEEN_ATTEMPTS * 1_000);
    }
  }

  if (pending.size === 0) {
    return;
  }

  const problems: string[] = [];

  for (const name of pending) {
    if (isVisible(name, version, run)) {
      problems.push(
        `${name}@${version} is public, but the "${distTag}" tag does not point at it. Run: npm dist-tag add ${name}@${version} ${distTag}`,
      );
    } else {
      problems.push(
        `${name}@${version} is not public. npm accepted the publish, so it is probably waiting in the Staged Packages tab on npmjs.com.`,
      );
    }
  }

  throw new Error(
    `${problems.join("\n")}\n\nA staged package becomes public when you approve it with two-factor authentication (npmjs.com, the package's Staged Packages tab, or \`npm stage approve\`). To publish without approval, turn on "Allow npm publish" in the package's trusted publisher settings; see docs/releasing.md.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arguments_ = process.argv.slice(2);
  const value = (flag: string): string | undefined => {
    const index = arguments_.indexOf(flag);

    return index >= 0 ? arguments_[index + 1] : undefined;
  };
  const directory = value("--dir");
  const version = value("--version");

  if (directory === undefined || version === undefined) {
    process.stderr.write(
      "Usage: node src/publish.ts --dir <tarballs> --version <x.y.z> [--tag next] [--dry-run]\n",
    );
    process.exit(2);
  }

  try {
    const result = publishTarballs({
      directory,
      version,
      distTag: value("--tag") ?? RELEASE_DIST_TAG,
      dryRun: arguments_.includes("--dry-run"),
      log: (line) => process.stdout.write(`${line}\n`),
    });

    process.stdout.write(
      `\nPublished: ${result.published.join(", ") || "nothing"}. Skipped: ${result.skipped.join(", ") || "nothing"}.\n`,
    );
  } catch (error: unknown) {
    process.stderr.write(`\n${(error as Error).message}\n`);
    process.exit(1);
  }
}
