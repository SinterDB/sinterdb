import { createHash } from "node:crypto";
import { hostname } from "node:os";
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { StorageEngine } from "../engine/storage-engine.js";
import { createBackup } from "../backup/index.js";
import { StorageError } from "../errors.js";
import { inspectDataDirectory, repairDataDirectory } from "./index.js";

let root: string;
let directory: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sinterdb-inspect-"));
  directory = join(root, "data");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

interface Built {
  /** Sequence numbers of the two snapshots. */
  readonly older: bigint;
  readonly newer: bigint;
  readonly lastLsn: bigint;
  /** The keys of the documents written, in order. */
  readonly keys: string[];
}

/**
 * Writes three batches: one before each of two snapshots and one after. The
 * log is split into small segments, and the older snapshot is kept, so some
 * segments are covered by the newer snapshot but still on disk.
 */
function build(): Built {
  const engine = StorageEngine.open({
    directory,
    segmentSizeBytes: 340,
    checkpointRetention: 2,
    checkpointOnClose: false,
  });
  const keys: string[] = [];
  const things = engine.openCollection("app", "things");
  const add = (count: number): void => {
    for (let index = 0; index < count; index += 1) {
      const key = `k${keys.length}`;

      keys.push(key);
      things.insertOne({ k: key, filler: "x".repeat(30) });
    }
  };

  add(6);

  const older = (engine.checkpoint() as { lsn: bigint }).lsn;

  add(8);

  const newer = (engine.checkpoint() as { lsn: bigint }).lsn;

  add(4);

  const lastLsn = engine.lastLsn;

  engine.close();

  return { older, newer, lastLsn, keys };
}

function keysIn(): string[] {
  const engine = StorageEngine.open({ directory, checkpointOnClose: false });

  try {
    return [...(engine.getCollection("app", "things")?.find({}) ?? [])]
      .map((document) => String(document["k"]))
      .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  } finally {
    engine.close();
  }
}

function segmentFiles(): string[] {
  return readdirSync(join(directory, "wal")).sort();
}

function fingerprint(): string {
  const hash = createHash("sha256");
  const walk = (path: string): void => {
    for (const name of readdirSync(path).sort()) {
      const full = join(path, name);

      if (statSync(full).isDirectory()) {
        walk(full);
      } else {
        hash.update(relative(directory, full).split(sep).join("/"));
        hash.update(readFileSync(full));
      }
    }
  };

  walk(directory);

  return hash.digest("hex");
}

function flipByte(path: string, offset: number): void {
  const bytes = readFileSync(path);

  bytes[offset] = (bytes[offset] as number) ^ 0xff;
  writeFileSync(path, bytes);
}

function segmentPath(index: number): string {
  return join(directory, "wal", segmentFiles()[index] as string);
}

describe("inspectDataDirectory", () => {
  it("describes a healthy directory", () => {
    const built = build();
    const report = inspectDataDirectory(directory);

    expect(report.manifest.status).toBe("ok");
    expect(report.manifest.formatVersion).toBe(3);
    expect(report.manifest.needsUpgrade).toBe(false);
    expect(report.lock).toBeUndefined();
    expect(report.leftovers).toEqual([]);
    expect(report.snapshots.map((s) => [s.lsn, s.status])).toEqual([
      [built.newer, "ok"],
      [built.older, "ok"],
    ]);
    expect(report.snapshots[0]?.collections).toBe(1);
    expect(report.snapshots[0]?.documents).toBe(14);
    expect(report.log.damage).toBeUndefined();
    expect(report.log.lastLsn).toBe(built.lastLsn);
    expect(report.log.segments.length).toBeGreaterThan(3);
    expect(report.log.segments.every((s) => s.status === "ok")).toBe(true);
    expect(report.recovery).toMatchObject({
      recoverable: true,
      problems: [],
      baseSnapshot: report.snapshots[0]?.file,
      baseLsn: built.newer,
      recordsToReplay: built.lastLsn - built.newer,
    });
  });

  it("reports an empty directory as recoverable", () => {
    StorageEngine.open({ directory, checkpointOnClose: false }).close();

    const report = inspectDataDirectory(directory);

    expect(report.recovery.recoverable).toBe(true);
    expect(report.recovery.recordsToReplay).toBe(0n);
    expect(report.snapshots).toEqual([]);
  });

  it("refuses a directory that does not exist", () => {
    expect(() => inspectDataDirectory(join(root, "nothing"))).toThrow(
      StorageError,
    );
  });

  it("changes nothing, even when the directory needs repair", () => {
    build();
    appendFileSync(segmentPath(segmentFiles().length - 1), Buffer.alloc(7, 1));
    writeFileSync(join(directory, "manifest.json.tmp"), "partial");
    writeFileSync(
      join(directory, "LOCK"),
      JSON.stringify({
        pid: 1,
        hostname: "elsewhere",
        startedAt: "2026-01-01T00:00:00.000Z",
        nonce: "n",
      }),
    );

    const before = fingerprint();

    inspectDataDirectory(directory);

    expect(fingerprint()).toBe(before);
    expect(existsSync(join(directory, "manifest.json.tmp"))).toBe(true);
    expect(segmentFiles().length).toBeGreaterThan(0);
  });

  it("treats a torn end of the newest segment as normal", () => {
    const built = build();
    const last = segmentFiles().length - 1;

    appendFileSync(segmentPath(last), Buffer.from([1, 2, 3, 4, 5]));

    const report = inspectDataDirectory(directory);

    expect(report.log.segments[last]?.status).toBe("torn-tail");
    expect(report.log.damage).toBeUndefined();
    expect(report.log.lastLsn).toBe(built.lastLsn);
    expect(report.recovery.recoverable).toBe(true);
  });

  it("treats a torn end of an older segment as damage", () => {
    build();

    appendFileSync(segmentPath(1), Buffer.from([1, 2, 3, 4, 5]));

    const report = inspectDataDirectory(directory);

    expect(report.log.segments[1]?.status).toBe("corrupt");
    expect(report.log.damage?.file).toBe(segmentPath(1));
    expect(report.recovery.recoverable).toBe(false);
  });

  it("pinpoints a damaged record", () => {
    build();

    const path = segmentPath(2);

    flipByte(path, 30);

    const report = inspectDataDirectory(directory);
    const first = report.log.segments[2]?.firstLsn as bigint;

    expect(report.log.segments[2]?.status).toBe("corrupt");
    expect(report.log.damage).toMatchObject({
      file: path,
      offset: 24,
      lastGoodLsn: first - 1n,
    });
    expect(report.recovery.recoverable).toBe(false);
    expect(report.recovery.problems.join(" ")).toContain(path);
  });

  it("reports a missing segment", () => {
    build();

    rmSync(segmentPath(2));

    const report = inspectDataDirectory(directory);

    expect(report.log.segments[2]?.gap).toContain("A log segment is missing");
    expect(report.log.damage?.file).toBe(
      segmentPath(1).replace(/[^/]+$/, "") + (segmentFiles()[2] as string),
    );
    expect(report.recovery.recoverable).toBe(false);
  });

  it("reports an unusable segment header", () => {
    build();
    flipByte(segmentPath(1), 3);

    const report = inspectDataDirectory(directory);

    expect(report.log.segments[1]?.status).toBe("bad-header");
    expect(report.recovery.recoverable).toBe(false);
  });

  it("ignores a newest segment that never got a header", () => {
    const built = build();

    writeFileSync(
      join(
        directory,
        "wal",
        `${(built.lastLsn + 1n).toString().padStart(20, "0")}.wal`,
      ),
      Buffer.alloc(10),
    );

    const report = inspectDataDirectory(directory);

    expect(report.log.damage).toBeUndefined();
    expect(report.recovery.recoverable).toBe(true);
  });

  it("falls back to an older snapshot when the newest is damaged", () => {
    const built = build();
    const newest = readdirSync(join(directory, "checkpoints"))
      .filter((name) => name.endsWith(".snap"))
      .sort()
      .pop() as string;

    flipByte(join(directory, "checkpoints", newest), 40);

    const report = inspectDataDirectory(directory);

    expect(report.snapshots[0]).toMatchObject({
      status: "damaged",
      lsn: built.newer,
    });
    expect(report.snapshots[0]?.problem).toBeDefined();
    expect(report.recovery.baseLsn).toBe(built.older);
    expect(report.recovery.recoverable).toBe(true);
  });

  it("reports leftover temporary files", () => {
    build();
    writeFileSync(join(directory, "manifest.json.tmp"), "x");
    writeFileSync(join(directory, "checkpoints", "a.snap.tmp"), "x");

    expect(inspectDataDirectory(directory).leftovers).toEqual([
      "checkpoints/a.snap.tmp",
      "manifest.json.tmp",
    ]);
  });

  describe("manifest", () => {
    const write = (contents: string): void => {
      writeFileSync(join(directory, "manifest.json"), contents);
    };

    it("flags a missing manifest only when log files exist", () => {
      build();
      rmSync(join(directory, "manifest.json"));

      const report = inspectDataDirectory(directory);

      expect(report.manifest.status).toBe("missing");
      expect(report.recovery.recoverable).toBe(false);

      rmSync(join(directory, "wal"), { recursive: true });
      rmSync(join(directory, "checkpoints"), { recursive: true });

      expect(inspectDataDirectory(directory).recovery.recoverable).toBe(true);
    });

    it("recognizes a manifest that is not JSON", () => {
      build();
      write("{nope");

      expect(inspectDataDirectory(directory).manifest.status).toBe(
        "unreadable",
      );
    });

    it("recognizes another kind of directory", () => {
      build();
      write(JSON.stringify({ format: "other", formatVersion: 1 }));

      expect(inspectDataDirectory(directory).manifest.status).toBe("foreign");
    });

    it("recognizes a version it cannot use", () => {
      build();
      write(JSON.stringify({ format: "sinterdb-data", formatVersion: 99 }));

      const report = inspectDataDirectory(directory);

      expect(report.manifest.status).toBe("newer");
      expect(report.recovery.recoverable).toBe(false);
    });

    it("recognizes a bad version number", () => {
      build();
      write(JSON.stringify({ format: "sinterdb-data", formatVersion: "two" }));

      expect(inspectDataDirectory(directory).manifest.status).toBe("invalid");
    });

    it("notes that an older version will be upgraded", () => {
      build();
      write(JSON.stringify({ format: "sinterdb-data", formatVersion: 1 }));

      const report = inspectDataDirectory(directory);

      expect(report.manifest.needsUpgrade).toBe(true);
      expect(report.recovery.recoverable).toBe(true);
    });

    it("notes an interrupted upgrade", () => {
      build();
      write(
        JSON.stringify({
          format: "sinterdb-data",
          formatVersion: 2,
          migratingFrom: 1,
        }),
      );

      const report = inspectDataDirectory(directory);

      expect(report.manifest.migratingFrom).toBe(1);
      expect(report.manifest.needsUpgrade).toBe(true);
    });
  });

  describe("lock", () => {
    const writeLock = (info: object): void => {
      writeFileSync(join(directory, "LOCK"), JSON.stringify(info));
    };
    const holder = (pid: number, host: string) => ({
      pid,
      hostname: host,
      startedAt: "2026-01-01T00:00:00.000Z",
      nonce: "n",
    });

    it("sees a lock from a process that is running", () => {
      build();
      writeLock(holder(process.ppid, hostname()));

      expect(inspectDataDirectory(directory).lock).toMatchObject({
        state: "running",
        holder: { pid: process.ppid },
      });
    });

    it("sees a lock from a process that is gone", () => {
      build();
      writeLock(holder(2 ** 22 - 3, hostname()));

      expect(inspectDataDirectory(directory).lock?.state).toBe("stale");
    });

    it("sees a lock from another host", () => {
      build();
      writeLock(holder(1, "elsewhere"));

      expect(inspectDataDirectory(directory).lock).toMatchObject({
        state: "foreign",
        holder: { hostname: "elsewhere" },
      });
    });

    it("sees a lock it cannot read", () => {
      build();
      writeFileSync(join(directory, "LOCK"), "???");

      expect(inspectDataDirectory(directory).lock?.state).toBe("unreadable");
    });
  });
});

describe("repairDataDirectory", () => {
  it("does nothing to a healthy directory", () => {
    build();

    const before = fingerprint();
    const result = repairDataDirectory({ directory, apply: true });

    expect(result.actions).toEqual([]);
    expect(result.blocked).toEqual([]);
    expect(result.quarantine).toBeUndefined();
    expect(fingerprint()).toBe(before);
  });

  it("describes the plan and changes nothing without apply", () => {
    build();
    flipByte(segmentPath(2), 30);

    const before = fingerprint();
    const result = repairDataDirectory({ directory });

    expect(result.apply).toBe(false);
    expect(result.after).toBeUndefined();
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]).toMatchObject({
      kind: "quarantine-segments",
      applied: false,
    });
    expect(fingerprint()).toBe(before);
  });

  describe("damage a snapshot covers", () => {
    it("moves the damaged segments aside and loses nothing", () => {
      const built = build();
      const damaged = segmentFiles()[2] as string;
      const covered = inspectDataDirectory(directory).log.segments[2];

      expect(covered?.lastLsn as bigint).toBeLessThanOrEqual(built.newer);
      flipByte(segmentPath(2), 30);

      const result = repairDataDirectory({ directory, apply: true });

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]).toMatchObject({
        kind: "quarantine-segments",
        dataLoss: false,
        allowed: true,
        applied: true,
      });
      expect(result.after?.recovery.recoverable).toBe(true);
      expect(result.quarantine).toBeDefined();
      expect(
        existsSync(join(result.quarantine as string, "wal", damaged)),
      ).toBe(true);
      expect(segmentFiles()).not.toContain(damaged);
      expect(keysIn()).toEqual(built.keys);
    });

    it("also handles a missing segment", () => {
      const built = build();

      rmSync(segmentPath(2));

      const result = repairDataDirectory({ directory, apply: true });

      expect(result.actions[0]?.kind).toBe("quarantine-segments");
      expect(result.actions[0]?.dataLoss).toBe(false);
      expect(result.after?.recovery.recoverable).toBe(true);
      expect(keysIn()).toEqual(built.keys);
    });

    it("can be run twice", () => {
      build();
      flipByte(segmentPath(2), 30);
      repairDataDirectory({ directory, apply: true });

      const again = repairDataDirectory({ directory, apply: true });

      expect(again.actions).toEqual([]);
      expect(again.quarantine).toBeUndefined();
    });
  });

  describe("damage after the newest snapshot", () => {
    function damageTail(): { built: Built; index: number } {
      const built = build();
      const report = inspectDataDirectory(directory);
      const index = report.log.segments.findIndex(
        (segment) => (segment.firstLsn as bigint) > built.newer + 1n,
      );

      flipByte(segmentPath(index), 30);

      return { built, index };
    }

    it("needs permission before it discards records", () => {
      damageTail();

      const before = fingerprint();
      const result = repairDataDirectory({ directory, apply: true });

      expect(result.actions[0]).toMatchObject({
        kind: "truncate-log",
        dataLoss: true,
        requires: "allowDataLoss",
        allowed: false,
        applied: false,
      });
      expect(result.after?.recovery.recoverable).toBe(false);
      expect(fingerprint()).toBe(before);
    });

    it("cuts the log at the last good record when allowed", () => {
      const { built, index } = damageTail();
      const segment = inspectDataDirectory(directory).log.segments[index];
      const later = segmentFiles().slice(index + 1);
      const lastGood = (segment?.firstLsn as bigint) - 1n;

      const result = repairDataDirectory({
        directory,
        apply: true,
        allowDataLoss: true,
      });

      expect(result.actions[0]).toMatchObject({
        kind: "truncate-log",
        applied: true,
      });
      expect(result.after?.recovery.recoverable).toBe(true);
      expect(result.after?.log.lastLsn).toBe(lastGood);
      // The first record creates the collection; each insert is one more.
      expect(keysIn()).toEqual(built.keys.slice(0, Number(lastGood) - 1));
      expect(later.length).toBeGreaterThan(0);

      for (const name of later) {
        expect(existsSync(join(result.quarantine as string, "wal", name))).toBe(
          true,
        );
        expect(segmentFiles()).not.toContain(name);
      }

      expect(statSync(segmentPath(index)).size).toBe(24);
      expect(
        statSync(
          join(
            result.quarantine as string,
            "wal",
            `${segmentFiles()[index]}.tail`,
          ),
        ).size,
      ).toBe((segment?.bytes as number) - 24);
    });

    it("keeps the intact records of a partly damaged segment", () => {
      const built = build();
      const report = inspectDataDirectory(directory);
      const index = report.log.segments.findIndex(
        (segment, position) =>
          segment.records === 2 &&
          (segment.firstLsn as bigint) > built.newer &&
          position < report.log.segments.length - 1,
      );

      expect(index).toBeGreaterThan(0);

      const segment = report.log.segments[index];
      const secondRecord = 24 + ((segment?.validBytes as number) - 24) / 2;

      flipByte(segmentPath(index), secondRecord + 5);

      const keepTo = segment?.firstLsn as bigint;

      expect(inspectDataDirectory(directory).log.damage).toMatchObject({
        offset: secondRecord,
        lastGoodLsn: keepTo,
      });

      const result = repairDataDirectory({
        directory,
        apply: true,
        allowDataLoss: true,
      });

      expect(result.after?.recovery.recoverable).toBe(true);
      expect(result.after?.log.lastLsn).toBe(keepTo);
      expect(statSync(segmentPath(index)).size).toBe(secondRecord);
      expect(keysIn()).toEqual(built.keys.slice(0, Number(keepTo) - 1));
    });
  });

  describe("a log that ends before the snapshot", () => {
    it("starts a new segment after the snapshot", () => {
      const built = build();
      const count = segmentFiles().length;

      for (const name of segmentFiles().slice(1)) {
        rmSync(join(directory, "wal", name));
      }

      expect(
        inspectDataDirectory(directory).recovery.problems.join(" "),
      ).toContain("lost records");

      const refused = repairDataDirectory({ directory, apply: true });

      expect(refused.actions.map((a) => a.kind)).toEqual([
        "quarantine-segments",
        "create-segment",
      ]);
      expect(refused.actions.every((a) => !a.applied)).toBe(true);

      const result = repairDataDirectory({
        directory,
        apply: true,
        allowDataLoss: true,
      });

      expect(count).toBeGreaterThan(2);
      expect(result.actions.every((a) => a.applied)).toBe(true);
      expect(segmentFiles()).toEqual([
        `${(built.newer + 1n).toString().padStart(20, "0")}.wal`,
      ]);
      expect(result.after?.recovery.recoverable).toBe(true);
      expect(keysIn()).toEqual(built.keys.slice(0, 14));

      const engine = StorageEngine.open({ directory });

      engine.openCollection("app", "things").insertOne({ k: "after" });
      engine.close();
      expect(keysIn()).toContain("after");
    });

    it("starts over when there is no snapshot and no readable log", () => {
      build();

      for (const name of readdirSync(join(directory, "checkpoints"))) {
        rmSync(join(directory, "checkpoints", name));
      }

      flipByte(segmentPath(0), 3);

      const result = repairDataDirectory({
        directory,
        apply: true,
        allowDataLoss: true,
      });

      expect(result.blocked).toEqual([]);
      expect(result.after?.recovery.recoverable).toBe(true);
      expect(keysIn()).toEqual([]);
    });
  });

  it("will not guess when old history is gone", () => {
    build();

    for (const name of readdirSync(join(directory, "checkpoints"))) {
      rmSync(join(directory, "checkpoints", name));
    }

    const before = fingerprint();
    const result = repairDataDirectory({
      directory,
      apply: true,
      allowDataLoss: true,
    });

    expect(result.actions).toEqual([]);
    expect(result.blocked.join(" ")).toContain("Restore it from a backup");
    expect(fingerprint()).toBe(before);
  });

  it("keeps quarantined files out of backups", () => {
    build();
    flipByte(segmentPath(2), 30);

    const result = repairDataDirectory({ directory, apply: true });

    expect(existsSync(result.quarantine as string)).toBe(true);

    createBackup({
      dataDirectory: directory,
      backupDirectory: join(root, "backup"),
    });

    expect(existsSync(join(root, "backup", "quarantine"))).toBe(false);
    expect(existsSync(join(root, "backup", "manifest.json"))).toBe(true);
  });

  describe("manifest", () => {
    it("is only rebuilt when asked", () => {
      const built = build();

      rmSync(join(directory, "manifest.json"));

      const refused = repairDataDirectory({ directory, apply: true });

      expect(refused.actions[0]).toMatchObject({
        kind: "rebuild-manifest",
        requires: "rebuildManifest",
        allowed: false,
        applied: false,
      });
      expect(existsSync(join(directory, "manifest.json"))).toBe(false);

      const result = repairDataDirectory({
        directory,
        apply: true,
        rebuildManifest: true,
      });

      expect(result.actions[0]?.applied).toBe(true);
      expect(result.after?.manifest.status).toBe("ok");
      expect(result.quarantine).toBeUndefined();
      expect(keysIn()).toEqual(built.keys);
    });

    it("keeps an unreadable manifest in quarantine", () => {
      build();
      writeFileSync(join(directory, "manifest.json"), "{broken");

      const result = repairDataDirectory({
        directory,
        apply: true,
        rebuildManifest: true,
      });

      expect(result.after?.recovery.recoverable).toBe(true);
      expect(
        readFileSync(
          join(result.quarantine as string, "manifest.json"),
          "utf8",
        ),
      ).toBe("{broken");
    });

    it.each([
      ["another kind of directory", { format: "other", formatVersion: 1 }],
      ["a newer version", { format: "sinterdb-data", formatVersion: 99 }],
    ])("is never replaced for %s", (_name, manifest) => {
      build();
      writeFileSync(join(directory, "manifest.json"), JSON.stringify(manifest));

      const before = fingerprint();
      const result = repairDataDirectory({
        directory,
        apply: true,
        rebuildManifest: true,
        allowDataLoss: true,
      });

      expect(result.actions).toEqual([]);
      expect(result.blocked).toHaveLength(1);
      expect(fingerprint()).toBe(before);
    });
  });

  describe("lock", () => {
    const writeLock = (pid: number, host: string): void => {
      writeFileSync(
        join(directory, "LOCK"),
        JSON.stringify({
          pid,
          hostname: host,
          startedAt: "2026-01-01T00:00:00.000Z",
          nonce: "n",
        }),
      );
    };

    it("refuses to touch a directory a running process holds", () => {
      build();
      flipByte(segmentPath(2), 30);
      writeLock(process.ppid, hostname());

      const before = fingerprint();
      const result = repairDataDirectory({ directory, apply: true });

      expect(result.blocked.join(" ")).toContain("running process");
      expect(result.actions.every((a) => !a.applied)).toBe(true);
      expect(fingerprint()).toBe(before);
    });

    it("needs --clear-lock for a lock from another host", () => {
      build();
      flipByte(segmentPath(2), 30);
      writeLock(1, "elsewhere");

      const before = fingerprint();
      const refused = repairDataDirectory({ directory, apply: true });

      expect(refused.actions.some((a) => a.kind === "clear-lock")).toBe(true);
      expect(refused.actions.every((a) => !a.applied)).toBe(true);
      expect(fingerprint()).toBe(before);

      const result = repairDataDirectory({
        directory,
        apply: true,
        clearLock: true,
      });

      expect(result.after?.recovery.recoverable).toBe(true);
      expect(result.after?.lock).toBeUndefined();
    });

    it("clears a lock left by a process that is gone", () => {
      build();
      flipByte(segmentPath(2), 30);
      writeLock(2 ** 22 - 3, hostname());

      const result = repairDataDirectory({ directory, apply: true });

      expect(result.after?.recovery.recoverable).toBe(true);
      expect(result.after?.lock).toBeUndefined();
    });

    it("releases its own lock when it finishes", () => {
      build();
      flipByte(segmentPath(2), 30);
      repairDataDirectory({ directory, apply: true });

      expect(existsSync(join(directory, "LOCK"))).toBe(false);
    });
  });
});
