import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_CHECKPOINT_KEEP,
  DEFAULT_CHECKPOINT_THRESHOLD_BYTES,
  DEFAULT_WRITE_CONCERN,
  DEFAULT_SERVER_HOST,
  DEFAULT_SERVER_PORT,
  SERVER_ENVIRONMENT_VARIABLES,
} from "@sinterdb-internal/server";
import { describe, expect, it } from "vitest";

import { HELP_TEXT } from "./cli.js";
import { CONFIG_KEYS, readConfigFile } from "./config-file.js";

// docs/configuration.md is the reference for every server setting. These
// tests fail when a flag or environment variable exists in the code but not in
// the document, when the document mentions one that does not exist, or when a
// documented default differs from the real one.

const markdown = readFileSync(
  fileURLToPath(new URL("../../../docs/configuration.md", import.meta.url)),
  "utf8",
);

function unique(matches: RegExpMatchArray | null): string[] {
  return [...new Set(matches ?? [])].sort();
}

function rowContaining(text: string): string {
  const row = markdown.split("\n").find((line) => line.includes(text));

  if (row === undefined) {
    throw new Error(`configuration.md has no row containing ${text}.`);
  }

  return row;
}

describe("docs/configuration.md", () => {
  it("documents exactly the flags that --help lists", () => {
    const flag = /--[a-z][a-z-]*/g;

    expect(unique(markdown.match(flag))).toEqual(unique(HELP_TEXT.match(flag)));
  });

  it("documents exactly the environment variables the server reads", () => {
    const variable = /SINTERDB_[A-Z_]+/g;
    const expected = [...SERVER_ENVIRONMENT_VARIABLES].sort();

    expect(unique(markdown.match(variable))).toEqual(expected);
    expect(unique(HELP_TEXT.match(variable))).toEqual(expected);
  });

  it("documents the real defaults", () => {
    const mebibytes = DEFAULT_CHECKPOINT_THRESHOLD_BYTES / (1024 * 1024);

    expect(rowContaining("`--host <host>`")).toContain(
      `\`${DEFAULT_SERVER_HOST}\``,
    );
    expect(rowContaining("`-p, --port <port>`")).toContain(
      `\`${DEFAULT_SERVER_PORT}\``,
    );
    expect(rowContaining("`--write-concern <level>`")).toContain(
      `\`${DEFAULT_WRITE_CONCERN}\``,
    );
    expect(rowContaining("`--checkpoint-bytes <n>`")).toContain(
      `${mebibytes} MiB`,
    );
    expect(rowContaining("`--checkpoint-keep <n>`")).toContain(
      `\`${DEFAULT_CHECKPOINT_KEEP}\``,
    );
    expect(HELP_TEXT).toContain(`default ${mebibytes} MiB`);
  });

  it("documents exactly the config file keys, with an example that works", () => {
    const keys = [
      ...markdown.matchAll(
        /^\| `([a-zA-Z]+)`\s+\| (?:string|number|boolean)/gm,
      ),
    ].map((match) => match[1]);
    const example = [...markdown.matchAll(/```json\n([^`]*)```/g)]
      .map((match) => match[1])
      .find((block) => block?.includes('"dataDir"'));

    expect(keys).toEqual([...CONFIG_KEYS]);
    expect(example).toBeDefined();
    expect(Object.keys(JSON.parse(example ?? "{}"))).toEqual([...CONFIG_KEYS]);

    const directory = mkdtempSync(join(tmpdir(), "sinterd-doc-"));

    try {
      const path = join(directory, "config.json");

      writeFileSync(path, example ?? "");
      expect(Object.keys(readConfigFile(path).values)).toEqual([
        ...CONFIG_KEYS,
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
