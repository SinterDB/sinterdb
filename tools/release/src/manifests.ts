import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/** The packages that go to npm, in the order they must be published. */
export const PUBLIC_PACKAGES = [
  { name: "sinterdb-protocol", directory: "packages/protocol" },
  { name: "sinterdb", directory: "packages/driver" },
  { name: "@sinterdb/cli", directory: "apps/server-cli" },
] as const;

/** Every package in the changesets `fixed` group. They share one version. */
export const VERSIONED_DIRECTORIES = [
  "packages/protocol",
  "packages/driver",
  "apps/server-cli",
  "packages/server",
  "packages/storage",
  "packages/test-utils",
] as const;

export const REPOSITORY_URL = "git+https://github.com/SinterDB/sinterdb.git";

/** The npm dist-tag a release is published under. */
export const RELEASE_DIST_TAG = "latest";

/**
 * The form of a tarball path to hand to npm. npm reads `release/x.tgz` as the
 * GitHub repository `release/x.tgz`, and tries to clone it, so a relative path
 * has to be made absolute (or start with `./`) first.
 */
export function tarballSpec(file: string): string {
  return resolve(file);
}

export interface Manifest {
  readonly name?: string;
  readonly version?: string;
  readonly private?: boolean;
  readonly license?: string;
  readonly files?: readonly string[];
  readonly bin?: Readonly<Record<string, string>>;
  readonly engines?: Readonly<Record<string, string>>;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly publishConfig?: {
    readonly access?: string;
    readonly provenance?: boolean;
  };
  readonly repository?: { readonly url?: string; readonly directory?: string };
}

export function readManifest(root: string, directory: string): Manifest {
  return JSON.parse(
    readFileSync(join(root, directory, "package.json"), "utf8"),
  ) as Manifest;
}

export function readText(root: string, path: string): string | undefined {
  try {
    return readFileSync(join(root, path), "utf8");
  } catch {
    return undefined;
  }
}
