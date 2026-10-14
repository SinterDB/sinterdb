import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  PUBLIC_PACKAGES,
  REPOSITORY_URL,
  RELEASE_DIST_TAG,
  readManifest,
} from "./manifests.ts";

// The release workflow publishes to npm without a token, so a mistake in it is
// a security mistake. These tests pin the properties that matter and keep
// docs/releasing.md in step with the workflow and the scripts it names.

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const read = (path: string): string => readFileSync(ROOT + path, "utf8");

const workflow = read(".github/workflows/release.yml");
const guide = read("docs/releasing.md");
const rootScripts = Object.keys(
  (JSON.parse(read("package.json")) as { scripts: Record<string, string> })
    .scripts,
);

/** The text of one job: from its name to the next job or the end. */
function job(name: string): string {
  const jobs = workflow.slice(workflow.indexOf("\njobs:"));
  const match = new RegExp(
    `\\n  ${name}:\\n([\\s\\S]*?)(?=\\n  [a-z-]+:\\n|$)`,
  ).exec(jobs);

  if (match === null) {
    throw new Error(`release.yml has no job named ${name}.`);
  }

  return match[1] as string;
}

describe(".github/workflows/release.yml", () => {
  it("runs only when a version tag is pushed", () => {
    const trigger = workflow.slice(
      workflow.indexOf("\non:"),
      workflow.indexOf("\npermissions:"),
    );

    expect(trigger).toContain("push:");
    expect(trigger).toContain("tags:");
    expect(trigger).not.toMatch(/pull_request|workflow_dispatch|branches:/);

    const pattern = /"(v\[0-9\][^"]*)"/.exec(trigger)?.[1] as string;
    const matches = new RegExp(`^${pattern.replaceAll(".", "\\.")}$`);

    expect(matches.test("v0.1.0")).toBe(true);
    expect(matches.test("v12.30.4")).toBe(true);
    expect(matches.test("v0.1.0-next.1")).toBe(false);
    expect(matches.test("0.1.0")).toBe(false);
  });

  it("has no long-lived npm credential", () => {
    expect(workflow).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN|secrets\./);
    expect(workflow).not.toContain("registry-url");
  });

  it("grants write permissions only to the jobs that need them", () => {
    expect(workflow.slice(0, workflow.indexOf("\njobs:"))).toMatch(
      /\npermissions:\n  contents: read\n/,
    );
    expect(workflow.match(/id-token: write/g)).toHaveLength(1);
    expect(job("publish")).toContain("id-token: write");
    expect(workflow.match(/contents: write/g)).toHaveLength(1);
    expect(job("github-release")).toContain("contents: write");
    expect(job("verify")).not.toMatch(/write/);
  });

  it("publishes only after verification, from the tested tarballs", () => {
    expect(job("publish")).toContain("needs: verify");
    expect(job("github-release")).toContain("needs: publish");
    expect(job("verify")).toContain("pnpm release:check --release --tag");
    expect(job("verify")).toContain("pnpm release:rehearse --out release");

    const uploaded = /name: (release-tarballs)/.exec(job("verify"))?.[1];

    expect(uploaded).toBeDefined();
    expect(job("publish")).toContain(`name: ${uploaded}`);
    expect(job("github-release")).toContain(`name: ${uploaded}`);
  });

  it("publishes under the release tag, only through the publish script", () => {
    expect(job("publish")).toContain(`--tag ${RELEASE_DIST_TAG}`);
    expect(workflow).not.toMatch(/npm publish|pnpm publish/);
    expect(workflow).not.toContain("changeset publish");
  });

  it("uses a GitHub environment, and an npm that supports trusted publishing", () => {
    expect(job("publish")).toContain("environment: npm");

    const range = /npm@\^(\d+)\.(\d+)\.(\d+)/.exec(job("publish"));

    expect(range).not.toBeNull();

    const [major, minor, patch] = (range as RegExpExecArray)
      .slice(1)
      .map(Number) as [number, number, number];

    // Trusted publishing needs npm 11.5.1 or later.
    expect(
      major > 11 ||
        (major === 11 && (minor > 5 || (minor === 5 && patch >= 1))),
    ).toBe(true);
  });

  it("creates a prerelease and fails if the tag does not exist", () => {
    expect(job("github-release")).toContain("--prerelease");
    expect(job("github-release")).toContain("--verify-tag");
  });
});

describe("docs/releasing.md", () => {
  it("names the workflow file that exists", () => {
    expect(guide).toContain("`release.yml`");
    expect(guide).toContain("(../.github/workflows/release.yml)");
    expect(workflow.length).toBeGreaterThan(0);
  });

  it("gives npm the settings the workflow and manifests have", () => {
    const [, organization, repository] =
      /github\.com\/([^/]+)\/([^/.]+)\.git$/.exec(REPOSITORY_URL) ?? [];

    expect(guide).toContain(`| Organization or user | \`${organization}\``);
    expect(guide).toContain(`| Repository           | \`${repository}\``);

    const environment = /environment: (\S+)/.exec(job("publish"))?.[1];

    expect(guide).toContain(`| Environment name     | \`${environment}\``);
    expect(guide).toContain(
      `repository.url\` in each \`package.json\` is exactly\n  \`${REPOSITORY_URL}\``,
    );
  });

  it("names every public package and the tag", () => {
    for (const { name } of PUBLIC_PACKAGES) {
      expect(guide).toContain(name);
    }

    expect(guide).toContain(`under the npm tag \`${RELEASE_DIST_TAG}\``);
  });

  it("only mentions pnpm scripts that exist", () => {
    const mentioned = new Set(
      [...guide.matchAll(/pnpm ([a-z][a-z:-]*)/g)].map((m) => m[1] as string),
    );

    // `pnpm changeset` and `pnpm all` are scripts too; words such as
    // `pnpm bench` must exist as well.
    for (const script of mentioned) {
      expect(rootScripts, `pnpm ${script}`).toContain(script);
    }

    expect(mentioned).toContain("release:check");
    expect(mentioned).toContain("release:rehearse");
    expect(mentioned).toContain("release:publish");
  });

  it("lists the files a release has to update", () => {
    expect(guide).toContain("DRIVER_PRODUCT_VERSION");
    expect(guide).toContain("SERVER_PRODUCT_VERSION");
    expect(guide).toContain("docs/releases/<version>.md");
  });
});

describe("ignore files", () => {
  it("ignore only the root release folder, not tools/release", () => {
    // A bare `release` line in .gitignore matches tools/release/ at any depth,
    // so the package would be left out of every commit.
    for (const path of [".gitignore", ".dockerignore"]) {
      const lines = read(path)
        .split("\n")
        .map((line) => line.trim());

      expect(lines, path).not.toContain("release");
      expect(lines, path).toContain("/release");
    }
  });
});

describe("the current release", () => {
  const version = readManifest(ROOT, "packages/driver").version as string;

  it("has notes whose install commands name no tag", () => {
    const notes = read(`docs/releases/${version}.md`);

    expect(notes).toContain("npm install --global @sinterdb/cli\n");
    expect(notes).toContain("npm install sinterdb\n");
  });

  it("has READMEs whose install commands name no tag", () => {
    for (const path of [
      "packages/driver/README.md",
      "apps/server-cli/README.md",
      "docs/quick-start.md",
      "apps/website/src/app/docs/(guides)/installation/page.mdx",
    ]) {
      const installs = read(path).match(
        /(npm install|pnpm add)[^\n]*(sinterdb|@sinterdb\/cli)[^\n]*/g,
      );

      expect(installs, path).not.toBeNull();

      for (const line of installs ?? []) {
        expect(line, path).not.toMatch(/@(next|latest)\b/);
      }
    }
  });
});
