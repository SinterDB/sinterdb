import { isAbsolute } from "node:path";

import { describe, expect, it } from "vitest";

import { publishTarballs, type CommandRunner } from "./publish.ts";

interface Call {
  readonly command: string;
  readonly arguments_: readonly string[];
}

interface FakeOptions {
  /** Names already on npm before the run. */
  readonly already?: readonly string[];
  /** A publish of this file name fails with this message. */
  readonly failPublish?: { readonly file: string; readonly message: string };
  /** Names whose new version never becomes public, as when npm only stages it. */
  readonly staged?: readonly string[];
  /** How many reads the registry's cache hides a new version for. */
  readonly staleReads?: number;
  /** What npm reports for the tags of a package once its version is public. */
  readonly tags?: (name: string) => Record<string, string>;
}

const NAMES = ["sinterdb-protocol", "sinterdb", "@sinterdb/cli"] as const;

function nameOfFile(file: string): string {
  const base = file.split("/").pop() as string;

  return base.startsWith("sinterdb-protocol")
    ? "sinterdb-protocol"
    : base.startsWith("sinterdb-cli")
      ? "@sinterdb/cli"
      : "sinterdb";
}

/** A pretend npm and registry. */
function fakeNpm(options: FakeOptions = {}) {
  const calls: Call[] = [];
  const uploaded = new Set<string>();
  let reads = 0;
  const isPublic = (name: string): boolean =>
    options.already?.includes(name) === true ||
    (uploaded.has(name) &&
      options.staged?.includes(name) !== true &&
      reads >= (options.staleReads ?? 0));
  const run: CommandRunner = (command, arguments_) => {
    calls.push({ command, arguments_ });

    const [verb, target] = arguments_ as [string, string];

    if (verb === "view" && arguments_[2] === "version") {
      reads += 1;

      const name = target.slice(0, target.lastIndexOf("@"));

      return isPublic(name)
        ? { status: 0, stdout: "0.1.0\n", stderr: "" }
        : { status: 1, stdout: "", stderr: "E404" };
    }

    if (verb === "view") {
      reads += 1;

      return isPublic(target)
        ? {
            status: 0,
            stdout: JSON.stringify(
              options.tags?.(target) ?? { next: "0.1.0", latest: "0.0.1" },
            ),
            stderr: "",
          }
        : {
            status: 0,
            stdout: JSON.stringify({ latest: "0.0.1" }),
            stderr: "",
          };
    }

    if (verb === "publish") {
      const file = target.split("/").pop() as string;

      if (options.failPublish && file.includes(options.failPublish.file)) {
        return { status: 1, stdout: "", stderr: options.failPublish.message };
      }

      uploaded.add(nameOfFile(file));

      return { status: 0, stdout: "", stderr: `npm notice published ${file}` };
    }

    return { status: 0, stdout: "", stderr: "" };
  };

  return {
    run,
    calls,
    publishes: () => calls.filter((c) => c.arguments_[0] === "publish"),
    firstTagRead: () =>
      calls.findIndex((c) => c.arguments_.includes("dist-tags")),
    lastPublish: () => calls.map((c) => c.arguments_[0]).lastIndexOf("publish"),
  };
}

const BASE = {
  directory: "/tarballs",
  version: "0.1.0",
  distTag: "next",
  wait: () => undefined,
};

describe("publishTarballs", () => {
  it("publishes protocol, then driver, then CLI, with provenance and the tag", () => {
    const npm = fakeNpm();
    const result = publishTarballs({ ...BASE, run: npm.run });

    expect(result.published).toEqual([...NAMES]);
    expect(npm.publishes().map((c) => c.arguments_)).toEqual([
      [
        "publish",
        "/tarballs/sinterdb-protocol-0.1.0.tgz",
        "--tag",
        "next",
        "--access",
        "public",
        "--provenance",
      ],
      [
        "publish",
        "/tarballs/sinterdb-0.1.0.tgz",
        "--tag",
        "next",
        "--access",
        "public",
        "--provenance",
      ],
      [
        "publish",
        "/tarballs/sinterdb-cli-0.1.0.tgz",
        "--tag",
        "next",
        "--access",
        "public",
        "--provenance",
      ],
    ]);
  });

  it("publishes every package before it checks any of them", () => {
    const npm = fakeNpm();

    publishTarballs({ ...BASE, run: npm.run });

    expect(npm.firstTagRead()).toBeGreaterThan(npm.lastPublish());
  });

  it("shows what npm said about each publish", () => {
    const lines: string[] = [];

    publishTarballs({
      ...BASE,
      run: fakeNpm().run,
      log: (line) => lines.push(line),
    });

    expect(lines.join("\n")).toContain(
      "npm: npm notice published sinterdb-protocol-0.1.0.tgz",
    );
  });

  it("hands npm absolute paths even when given a relative folder", () => {
    // npm reads `release/x.tgz` as the GitHub repository `release/x.tgz`.
    const npm = fakeNpm();

    publishTarballs({ ...BASE, directory: "release", run: npm.run });

    for (const call of npm.publishes()) {
      expect(isAbsolute(call.arguments_[1] as string)).toBe(true);
    }
  });

  it("skips what is already published, so a stopped run can be repeated", () => {
    const npm = fakeNpm({ already: ["sinterdb-protocol", "sinterdb"] });
    const result = publishTarballs({ ...BASE, run: npm.run });

    expect(result.skipped).toEqual(["sinterdb-protocol", "sinterdb"]);
    expect(result.published).toEqual(["@sinterdb/cli"]);
    expect(npm.publishes()).toHaveLength(1);
  });

  it("treats a version npm says is already published as skipped", () => {
    // The registry's cache can hide a version it already has.
    const npm = fakeNpm({
      failPublish: {
        file: "sinterdb-protocol-0.1.0",
        message:
          "npm error You cannot publish over the previously published versions: 0.1.0.",
      },
    });
    const result = publishTarballs({ ...BASE, run: npm.run });

    expect(result.skipped).toEqual(["sinterdb-protocol"]);
    expect(result.published).toEqual(["sinterdb", "@sinterdb/cli"]);
  });

  it("stops at any other failure and publishes nothing after it", () => {
    const npm = fakeNpm({
      failPublish: {
        file: "sinterdb-0.1.0",
        message: "E403 trusted publisher",
      },
    });

    expect(() => publishTarballs({ ...BASE, run: npm.run })).toThrow(
      /npm publish failed for sinterdb@0.1.0[\s\S]*E403/,
    );
    expect(npm.publishes()).toHaveLength(2);
  });

  it("refuses to publish a prerelease under latest", () => {
    const npm = fakeNpm();

    expect(() =>
      publishTarballs({
        ...BASE,
        version: "0.3.0-rc.1",
        distTag: "latest",
        run: npm.run,
      }),
    ).toThrow(/prerelease and must not be published under "latest"/);
    expect(npm.calls).toHaveLength(0);
  });

  it("publishes a stable version under latest", () => {
    const npm = fakeNpm({ tags: () => ({ latest: "0.1.0" }) });
    const result = publishTarballs({
      ...BASE,
      distTag: "latest",
      run: npm.run,
    });

    expect(result.published).toEqual([...NAMES]);
    expect(npm.publishes().every((c) => c.arguments_.includes("latest"))).toBe(
      true,
    );
  });

  it("waits out a registry cache that hides the new version", () => {
    const waits: number[] = [];
    const npm = fakeNpm({ staleReads: 20 });

    publishTarballs({ ...BASE, run: npm.run, wait: (ms) => waits.push(ms) });

    expect(waits.length).toBeGreaterThan(0);
    expect(waits.every((ms) => ms === 10_000)).toBe(true);
  });

  it("explains a package that npm accepted but did not make public", () => {
    const npm = fakeNpm({ staged: ["sinterdb"] });

    expect(() => publishTarballs({ ...BASE, run: npm.run })).toThrow(
      /sinterdb@0\.1\.0 is not public[\s\S]*Staged Packages[\s\S]*Allow npm publish/,
    );
    // It still sent the others, so one approval round covers everything.
    expect(npm.publishes()).toHaveLength(3);
  });

  it("names the command to run when a version is public with the wrong tag", () => {
    const npm = fakeNpm({ tags: () => ({ latest: "0.0.1", next: "0.0.9" }) });

    expect(() => publishTarballs({ ...BASE, run: npm.run })).toThrow(
      /npm dist-tag add sinterdb-protocol@0\.1\.0 next/,
    );
  });

  it("notes, but does not fail, when npm also points latest at a first version", () => {
    const npm = fakeNpm({ tags: () => ({ next: "0.1.0", latest: "0.1.0" }) });
    const lines: string[] = [];

    expect(() =>
      publishTarballs({ ...BASE, run: npm.run, log: (l) => lines.push(l) }),
    ).not.toThrow();
    expect(lines.join("\n")).toContain('npm also points "latest"');
  });

  it("does a dry run without provenance and without checking tags", () => {
    const npm = fakeNpm();

    publishTarballs({ ...BASE, dryRun: true, run: npm.run });

    for (const call of npm.publishes()) {
      expect(call.arguments_).toContain("--dry-run");
      expect(call.arguments_).not.toContain("--provenance");
    }

    expect(npm.firstTagRead()).toBe(-1);
  });
});
