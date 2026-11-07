import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SinterServer } from "@sinterdb-internal/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createConsoleActions } from "./console-actions.js";

let root: string;
let data: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sinterd-console-actions-"));
  data = join(root, "data");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

async function populate(): Promise<void> {
  const server = new SinterServer({
    port: 0,
    dataDirectory: data,
    checkpointThresholdBytes: 1,
  });

  await server.start();
  await server.stop();
}

describe("console actions: inspect", () => {
  it("describes a healthy directory", async () => {
    await populate();

    const report = createConsoleActions(data).inspect(80);

    expect(report.title).toBe("Inspect");
    expect(report.lines).toContain("SinterDB data directory");
    expect(report.lines.join("\n")).toContain(
      "The server can open this directory",
    );
    expect(report.applicable).toBeUndefined();
  });

  it("describes a directory the server cannot open", async () => {
    await populate();
    writeFileSync(join(data, "manifest.json"), "{broken");

    const report = createConsoleActions(data).inspect(80);

    expect(report.title).toBe("Inspect");
    expect(report.lines.join("\n")).toContain("CANNOT open");
  });

  it("reports a directory that does not exist", () => {
    const report = createConsoleActions(join(root, "no")).inspect(80);

    expect(report.title).toBe("Inspect failed");
    expect(report.lines.length).toBeGreaterThan(0);
  });

  it("wraps text to the width it is given", async () => {
    await populate();
    writeFileSync(join(data, "manifest.json"), "{broken");

    const narrow = createConsoleActions(data).inspect(30).lines;
    const wide = createConsoleActions(data).inspect(120).lines;

    expect(Math.max(...narrow.map((line) => line.length))).toBeLessThanOrEqual(
      Math.max(...wide.map((line) => line.length)),
    );
    expect(narrow.length).toBeGreaterThan(wide.length);
  });

  it("uses no colors", async () => {
    await populate();

    expect(
      createConsoleActions(data).inspect(80).lines.join("\n"),
    ).not.toContain("\u001B[");
  });
});

describe("console actions: backup", () => {
  it("writes a backup and says where", async () => {
    await populate();

    const to = join(root, "copy");
    const report = createConsoleActions(data).backup(to, 80);

    expect(report.title).toBe("Backup");
    expect(report.lines[0]).toContain(`Backup written to ${to}`);
    expect(existsSync(join(to, "manifest.json"))).toBe(true);
  });

  it("says why a backup failed", async () => {
    await populate();

    const to = join(root, "copy");

    createConsoleActions(data).backup(to, 80);

    const again = createConsoleActions(data).backup(to, 80);

    expect(again.title).toBe("Backup failed");
    expect(again.lines.join(" ")).toMatch(/empty|exist/i);
  });
});

describe("console actions: repair", () => {
  it("says there is nothing to repair in a healthy directory", async () => {
    await populate();

    const report = createConsoleActions(data).repair(false, 80);

    expect(report.title).toBe("Repair (dry run)");
    expect(report.lines).toContain("SinterDB repair (dry run)");
    expect(report.lines.join("\n")).toContain("Nothing to repair");
    expect(report.applicable).toBe(false);
  });

  it("shows a plan that needs a flag, which the console cannot apply", async () => {
    await populate();
    writeFileSync(join(data, "manifest.json"), "{broken");

    const report = createConsoleActions(data).repair(false, 80);

    expect(report.lines.join("\n")).toContain("needs --rebuild-manifest");
    expect(report.applicable).toBe(false);
  });

  it("changes nothing in a dry run", async () => {
    await populate();
    writeFileSync(join(data, "manifest.json"), "{broken");
    createConsoleActions(data).repair(false, 80);

    expect(createConsoleActions(data).inspect(80).lines.join("\n")).toContain(
      "CANNOT open",
    );
  });

  it("applies, and is called Repair rather than a dry run", async () => {
    await populate();

    const report = createConsoleActions(data).repair(true, 80);

    expect(report.title).toBe("Repair");
    expect(report.lines).toContain("SinterDB repair");
    expect(report.applicable).toBe(false);
  });

  it("reports a directory that does not exist", () => {
    const report = createConsoleActions(join(root, "no")).repair(false, 80);

    expect(report.title).toBe("Repair failed");
  });
});
