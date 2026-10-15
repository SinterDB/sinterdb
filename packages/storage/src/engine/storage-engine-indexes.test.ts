import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CustomId, type Document } from "sinterdb-protocol";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  StorageCorruptionError,
  StorageError,
  StorageErrorCode,
} from "../errors.js";
import { WriteAheadLog } from "../wal/index.js";
import { readCheckpoint } from "./checkpoint.js";
import { encodeOperations } from "./operations.js";
import {
  STORAGE_FORMAT,
  STORAGE_FORMAT_VERSION,
  StorageEngine,
  type StorageEngineOptions,
} from "./storage-engine.js";

let directory: string;
const opened: StorageEngine[] = [];

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "sinterdb-indexes-"));
});

afterEach(() => {
  for (const engine of opened.splice(0)) {
    try {
      engine.close();
    } catch {
      // Tests that damage the directory on purpose may fail to close cleanly.
    }
  }

  rmSync(directory, { recursive: true, force: true });
});

function open(options: Partial<StorageEngineOptions> = {}): StorageEngine {
  const engine = StorageEngine.open({ directory, ...options });

  opened.push(engine);

  return engine;
}

function crash(engine: StorageEngine): void {
  const index = opened.indexOf(engine);

  if (index >= 0) {
    opened.splice(index, 1);
  }

  engine.close();
}

function reopenAfterCrash(
  engine: StorageEngine,
  options: Partial<StorageEngineOptions> = {},
): StorageEngine {
  crash(engine);

  return open({ checkpointOnClose: false, ...options });
}

function users(engine: StorageEngine) {
  return engine.openCollection("app", "users");
}

function names(engine: StorageEngine): string[] {
  return (engine.getCollection("app", "users")?.listIndexes() ?? []).map(
    (index) => index.name,
  );
}

function expectCode(action: () => unknown, code: StorageErrorCode): void {
  try {
    action();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(StorageError);
    expect((error as StorageError).code).toBe(code);

    return;
  }

  throw new Error(`Expected ${code} to be thrown.`);
}

function everyIndexValid(engine: StorageEngine): void {
  for (const entry of engine.validateIndexes()) {
    expect(entry.report, `${entry.database}.${entry.collection}`).toMatchObject(
      {
        valid: true,
        issues: [],
      },
    );
  }
}

function seed(engine: StorageEngine): void {
  users(engine).insertMany(
    Array.from({ length: 30 }, (_, index) => ({
      email: `user-${index}@example.com`,
      age: 20 + (index % 6),
      team: index % 2 === 0 ? "red" : "blue",
    })),
  );
}

describe("indexes survive a restart", () => {
  it("rebuilds them from the log", () => {
    let engine = open({ checkpointOnClose: false });

    seed(engine);
    users(engine).createIndex({ field: "email", unique: true });
    users(engine).createIndex({ field: "age", direction: -1 });
    engine = reopenAfterCrash(engine);

    expect(names(engine)).toEqual(["_id_", "email_1", "age_-1"]);
    expect(engine.recovery.rebuiltIndexes).toBe(2);
    expect(users(engine).explain({ email: "user-3@example.com" }).stage).toBe(
      "IXSCAN",
    );
    expect(users(engine).listIndexes()[1]).toMatchObject({
      unique: true,
      sparse: false,
    });
    everyIndexValid(engine);
  });

  it("rebuilds them from a snapshot", () => {
    let engine = open({ checkpointOnClose: false });

    seed(engine);
    users(engine).createIndex({ field: "email", unique: true });
    engine.checkpoint();
    engine = reopenAfterCrash(engine);

    expect(engine.recovery.checkpointLsn).toBeGreaterThan(0n);
    expect(engine.recovery.replayedRecords).toBe(0);
    expect(engine.recovery.rebuiltIndexes).toBe(1);
    expect(names(engine)).toEqual(["_id_", "email_1"]);
    everyIndexValid(engine);
  });

  it("combines a snapshot with index changes made after it", () => {
    let engine = open({ checkpointOnClose: false });

    seed(engine);
    users(engine).createIndex({ field: "email", unique: true });
    engine.checkpoint();
    users(engine).createIndex({ field: "age" });
    users(engine).dropIndex("email_1");
    users(engine).createIndex({ field: "team", sparse: true });
    engine = reopenAfterCrash(engine);

    expect(names(engine)).toEqual(["_id_", "age_1", "team_1"]);
    expect(engine.recovery.replayedRecords).toBe(3);
    everyIndexValid(engine);
  });

  it("rebuilds a compound index from the log", () => {
    let engine = open({ checkpointOnClose: false });

    seed(engine);
    users(engine).createIndex({
      keys: [
        ["team", 1],
        ["age", -1],
      ],
      unique: false,
    });
    engine = reopenAfterCrash(engine);

    expect(names(engine)).toEqual(["_id_", "team_1_age_-1"]);
    expect(users(engine).listIndexes()[1]?.keys).toEqual([
      { field: "team", direction: 1 },
      { field: "age", direction: -1 },
    ]);
    expect(users(engine).explain({ team: "red", age: 20 })).toMatchObject({
      stage: "IXSCAN",
      prefixLength: 2,
    });
    everyIndexValid(engine);
  });

  it("rebuilds a compound index from a snapshot", () => {
    let engine = open({ checkpointOnClose: false });

    seed(engine);
    users(engine).createIndex({
      keys: [
        ["team", 1],
        ["email", 1],
      ],
      unique: true,
      sparse: true,
    });
    engine.checkpoint();
    engine = reopenAfterCrash(engine);

    expect(engine.recovery.replayedRecords).toBe(0);
    expect(users(engine).listIndexes()[1]).toMatchObject({
      name: "team_1_email_1",
      unique: true,
      sparse: true,
    });
    expect([
      ...users(engine).find({ team: "blue", email: "user-3@example.com" }),
    ]).toHaveLength(1);
    everyIndexValid(engine);
  });

  it("keeps indexes through a clean shutdown", () => {
    let engine = open();

    seed(engine);
    users(engine).createIndex({ field: "email", unique: true });
    engine.close();
    opened.pop();
    engine = open();

    expect(names(engine)).toEqual(["_id_", "email_1"]);
    expect(engine.recovery.replayedRecords).toBe(0);
    everyIndexValid(engine);
  });

  it("returns the same query results before and after a restart", () => {
    let engine = open({ checkpointOnClose: false });

    seed(engine);
    users(engine).createIndex({ field: "age" });

    const filters = [
      { age: 22 },
      { age: { $gte: 21, $lt: 24 } },
      { age: { $in: [20, 25] } },
    ];
    const before = filters.map((filter) => [...users(engine).find(filter)]);

    engine = reopenAfterCrash(engine);

    expect(filters.map((filter) => [...users(engine).find(filter)])).toEqual(
      before,
    );
    expect(users(engine).explain({ age: 22 }).stage).toBe("IXSCAN");
  });

  it("keeps maintaining indexes for writes made after recovery", () => {
    let engine = open({ checkpointOnClose: false });

    seed(engine);
    users(engine).createIndex({ field: "email", unique: true });
    engine = reopenAfterCrash(engine);
    users(engine).insertOne({ email: "new@example.com", age: 99 });
    users(engine).updateOne(
      { email: "user-1@example.com" },
      { $set: { email: "moved@example.com" } },
    );
    engine = reopenAfterCrash(engine);

    expect([
      ...users(engine).find({ email: "moved@example.com" }),
    ]).toHaveLength(1);
    expect([...users(engine).find({ email: "user-1@example.com" })]).toEqual(
      [],
    );
    expect(users(engine).documentCount).toBe(31);
    everyIndexValid(engine);
  });

  it("preserves the order in which indexes were created", () => {
    let engine = open({ checkpointOnClose: false });

    for (const field of ["zeta", "alpha", "mid"]) {
      users(engine).createIndex({ field });
    }

    engine.checkpoint();
    users(engine).createIndex({ field: "later" });
    engine = reopenAfterCrash(engine);

    expect(names(engine)).toEqual([
      "_id_",
      "zeta_1",
      "alpha_1",
      "mid_1",
      "later_1",
    ]);
  });
});

describe("unique constraints across restarts", () => {
  it("still rejects duplicates after recovery", () => {
    let engine = open({ checkpointOnClose: false });

    seed(engine);
    users(engine).createIndex({ field: "email", unique: true });
    engine = reopenAfterCrash(engine);

    expectCode(
      () => users(engine).insertOne({ email: "user-4@example.com" }),
      StorageErrorCode.DuplicateKey,
    );
    expect(users(engine).documentCount).toBe(30);

    engine.checkpoint();
    engine = reopenAfterCrash(engine);

    expectCode(
      () => users(engine).insertOne({ email: "user-4@example.com" }),
      StorageErrorCode.DuplicateKey,
    );
  });

  it("does not persist a write that violates a unique index", () => {
    let engine = open({ checkpointOnClose: false });

    users(engine).createIndex({ field: "a", unique: true });
    users(engine).insertMany([{ a: 1 }, { a: 2 }]);

    const before = engine.lastLsn;

    expectCode(
      () => users(engine).insertOne({ a: 1 }),
      StorageErrorCode.DuplicateKey,
    );
    expectCode(
      () => users(engine).updateMany({}, { $set: { a: 1 } }),
      StorageErrorCode.DuplicateKey,
    );
    expectCode(
      () => users(engine).replaceOne({ a: 2 }, { a: 1 }),
      StorageErrorCode.DuplicateKey,
    );

    expect(engine.lastLsn).toBe(before);

    engine = reopenAfterCrash(engine);

    expect(
      [...users(engine).find({})].map((document) => document["a"]),
    ).toEqual([1, 2]);
    everyIndexValid(engine);
  });

  it("frees values when documents are removed before the restart", () => {
    let engine = open({ checkpointOnClose: false });

    users(engine).createIndex({ field: "a", unique: true });
    users(engine).insertMany([{ a: 1 }, { a: 2 }]);
    users(engine).deleteOne({ a: 1 });
    engine = reopenAfterCrash(engine);
    users(engine).insertOne({ a: 1 });

    expect(users(engine).documentCount).toBe(2);
  });
});

describe("index operations in the log", () => {
  it("writes one record per index change and none for a repeat", () => {
    const engine = open({ checkpointOnClose: false });

    users(engine).insertOne({ a: 1 });

    const base = engine.lastLsn;

    users(engine).createIndex({ field: "a" });
    expect(engine.lastLsn).toBe(base + 1n);

    users(engine).createIndex({ field: "a" });
    expect(engine.lastLsn).toBe(base + 1n);

    users(engine).dropIndex("a_1");
    expect(engine.lastLsn).toBe(base + 2n);
  });

  it("does not log an index that could not be built", () => {
    let engine = open({ checkpointOnClose: false });

    users(engine).insertMany([{ a: 1 }, { a: 1 }]);

    const before = engine.lastLsn;

    expectCode(
      () => users(engine).createIndex({ field: "a", unique: true }),
      StorageErrorCode.DuplicateKey,
    );
    expectCode(
      () => users(engine).createIndex({ field: "$bad" }),
      StorageErrorCode.InvalidIndex,
    );
    expect(engine.lastLsn).toBe(before);

    engine = reopenAfterCrash(engine);

    expect(names(engine)).toEqual(["_id_"]);
  });

  it("does not leave an index behind when the log rejects it", () => {
    const engine = open({ checkpointOnClose: false });
    const collection = users(engine);

    collection.insertOne({ a: 1 });
    engine.close();

    expectCode(
      () => collection.createIndex({ field: "a" }),
      StorageErrorCode.Closed,
    );
    expect(collection.listIndexes()).toHaveLength(1);
    expect(collection.explain({ a: 1 }).stage).toBe("COLLSCAN");
  });

  it("keeps an index when dropping it fails to reach the log", () => {
    const engine = open({ checkpointOnClose: false });
    const collection = users(engine);

    collection.createIndex({ field: "a" });
    engine.close();

    expectCode(() => collection.dropIndex("a_1"), StorageErrorCode.Closed);
    expect(collection.listIndexes()).toHaveLength(2);
  });

  it("can drop and recreate an index with different options", () => {
    let engine = open({ checkpointOnClose: false });

    users(engine).insertMany([{ a: 1 }, { a: 2 }]);
    users(engine).createIndex({ field: "a", name: "by_a" });
    users(engine).dropIndex("by_a");
    users(engine).createIndex({ field: "a", name: "by_a", unique: true });
    engine = reopenAfterCrash(engine);

    expect(users(engine).listIndexes()[1]).toMatchObject({
      name: "by_a",
      unique: true,
    });
  });

  it("indexes collections in different databases independently", () => {
    let engine = open({ checkpointOnClose: false });

    engine.openCollection("one", "items").createIndex({ field: "x" });
    engine.openCollection("two", "items").createIndex({ field: "y" });
    engine = reopenAfterCrash(engine);

    expect(
      engine
        .getCollection("one", "items")
        ?.listIndexes()
        .map((i) => i.keys[0]?.field),
    ).toEqual(["_id", "x"]);
    expect(
      engine
        .getCollection("two", "items")
        ?.listIndexes()
        .map((i) => i.keys[0]?.field),
    ).toEqual(["_id", "y"]);
  });
});

describe("snapshots store index definitions", () => {
  it("includes them in the snapshot file", () => {
    const engine = open({ checkpointOnClose: false });

    seed(engine);
    users(engine).createIndex({ field: "email", unique: true });
    users(engine).createIndex({ field: "age", direction: -1, sparse: true });

    const result = engine.checkpoint();
    const read = readCheckpoint(
      join(directory, "checkpoints", result?.file as string),
    );

    expect(read.collections[0]?.indexes).toEqual([
      {
        name: "email_1",
        keys: [{ field: "email", direction: 1 }],
        unique: true,
        sparse: false,
      },
      {
        name: "age_-1",
        keys: [{ field: "age", direction: -1 }],
        unique: false,
        sparse: true,
      },
    ]);
  });

  it("does not store index contents", () => {
    const engine = open({ checkpointOnClose: false });

    seed(engine);

    const withoutIndexes = engine.checkpoint();
    const plainSize = readFileSync(
      join(directory, "checkpoints", withoutIndexes?.file as string),
    ).byteLength;

    users(engine).createIndex({ field: "email" });
    users(engine).createIndex({ field: "age" });
    users(engine).insertOne({ email: "extra@example.com", age: 1 });

    const withIndexes = engine.checkpoint();
    const indexedSize = readFileSync(
      join(directory, "checkpoints", withIndexes?.file as string),
    ).byteLength;

    expect(indexedSize - plainSize).toBeLessThan(400);
  });
});

describe("storage format upgrade", () => {
  function manifest(): Record<string, unknown> {
    return JSON.parse(
      readFileSync(join(directory, "manifest.json"), "utf8"),
    ) as Record<string, unknown>;
  }

  it("creates new directories at the current version", () => {
    open();

    expect(manifest()).toMatchObject({
      format: STORAGE_FORMAT,
      formatVersion: STORAGE_FORMAT_VERSION,
    });
    expect(manifest()).not.toHaveProperty("upgradedFrom");
  });

  it("upgrades a version 1 directory in place and keeps its data", () => {
    let engine = open({ checkpointOnClose: false });

    seed(engine);
    engine = reopenAfterCrash(engine);
    crash(engine);

    writeFileSync(
      join(directory, "manifest.json"),
      JSON.stringify({
        format: STORAGE_FORMAT,
        formatVersion: 1,
        createdAt: "2026-07-01T00:00:00.000Z",
      }),
    );

    engine = open();

    expect(users(engine).documentCount).toBe(30);
    expect(manifest()).toMatchObject({
      formatVersion: STORAGE_FORMAT_VERSION,
      createdAt: "2026-07-01T00:00:00.000Z",
      upgradedFrom: 1,
    });
    expect(typeof manifest()["upgradedAt"]).toBe("string");
  });

  it("upgrades a version 2 directory and keeps its single-field indexes", () => {
    let engine = open({ checkpointOnClose: false });

    seed(engine);
    users(engine).createIndex({ field: "email", unique: true });
    users(engine).createIndex({ field: "age", direction: -1, sparse: true });
    engine.checkpoint();
    users(engine).createIndex({ field: "team" });
    crash(engine);

    writeFileSync(
      join(directory, "manifest.json"),
      JSON.stringify({
        format: STORAGE_FORMAT,
        formatVersion: 2,
        createdAt: "2026-08-01T00:00:00.000Z",
      }),
    );

    engine = open();

    expect(names(engine)).toEqual(["_id_", "email_1", "age_-1", "team_1"]);
    expect(users(engine).documentCount).toBe(30);
    expect(manifest()).toMatchObject({
      formatVersion: STORAGE_FORMAT_VERSION,
      createdAt: "2026-08-01T00:00:00.000Z",
      upgradedFrom: 2,
    });
    everyIndexValid(engine);
  });

  it("makes older servers refuse the upgraded directory", () => {
    open().close();
    opened.pop();

    writeFileSync(
      join(directory, "manifest.json"),
      JSON.stringify({
        format: STORAGE_FORMAT,
        formatVersion: 1,
        createdAt: "2026-07-01T00:00:00.000Z",
      }),
    );
    open().close();
    opened.pop();

    // A version 1 server only accepts versions up to 1.
    expect(Number(manifest()["formatVersion"])).toBeGreaterThan(1);
  });

  it("rejects an invalid format version", () => {
    open().close();
    opened.pop();

    for (const formatVersion of [0, -1, 1.5, "1"]) {
      writeFileSync(
        join(directory, "manifest.json"),
        JSON.stringify({ format: STORAGE_FORMAT, formatVersion }),
      );

      expect(() => StorageEngine.open({ directory })).toThrow(
        StorageCorruptionError,
      );
    }
  });
});

describe("recovery refuses inconsistent index records", () => {
  function appendRaw(operations: Parameters<typeof encodeOperations>[0]): void {
    const log = WriteAheadLog.open({ directory: join(directory, "wal") });

    log.append(1, encodeOperations(operations));
    log.close();
  }

  function createOperation(
    field: string,
    options: { unique?: boolean; name?: string } = {},
  ) {
    return {
      kind: "createIndex" as const,
      database: "app",
      collection: "users",
      index: {
        name: options.name ?? `${field}_1`,
        keys: [{ field, direction: 1 as const }],
        unique: options.unique ?? false,
        sparse: false,
      },
    };
  }

  function prepare(documents: Document[]): void {
    const engine = open({ checkpointOnClose: false });

    users(engine).insertMany(documents);
    crash(engine);
  }

  it("fails when a unique index cannot be rebuilt from the documents", () => {
    prepare([{ a: 1 }, { a: 1 }]);
    appendRaw([createOperation("a", { unique: true })]);

    try {
      StorageEngine.open({ directory });
      throw new Error("Expected recovery to fail.");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(StorageCorruptionError);
      expect((error as Error).message).toContain("cannot be rebuilt");
      expect((error as Error).message).toContain("app.users");
    }

    expect(readdirSync(directory)).not.toContain("LOCK");
  });

  it("fails when an index is dropped that was never created", () => {
    prepare([{ a: 1 }]);
    appendRaw([
      {
        kind: "dropIndex",
        database: "app",
        collection: "users",
        name: "ghost",
      },
    ]);

    expect(() => StorageEngine.open({ directory })).toThrow(
      StorageCorruptionError,
    );
  });

  it("fails when an index is created with a conflicting definition", () => {
    prepare([{ a: 1 }]);
    appendRaw([createOperation("a", { name: "by_a" })]);
    appendRaw([createOperation("a", { name: "by_a", unique: true })]);

    expect(() => StorageEngine.open({ directory })).toThrow(
      StorageCorruptionError,
    );
  });

  it("fails when an index belongs to a collection that does not exist", () => {
    prepare([{ a: 1 }]);
    appendRaw([
      {
        ...createOperation("a"),
        collection: "missing",
      },
    ]);

    expect(() => StorageEngine.open({ directory })).toThrow(
      StorageCorruptionError,
    );
  });

  it("accepts an identical repeated create record", () => {
    prepare([{ a: 1 }]);
    appendRaw([createOperation("a")]);
    appendRaw([createOperation("a")]);

    const engine = open();

    expect(names(engine)).toEqual(["_id_", "a_1"]);
  });

  it("starts normally once the inconsistent record is removed", () => {
    prepare([{ a: 1 }, { a: 2 }]);
    appendRaw([createOperation("a", { unique: true })]);

    expect(names(open())).toEqual(["_id_", "a_1"]);
  });
});

describe("validating indexes through the engine", () => {
  it("reports every collection", () => {
    const engine = open({ checkpointOnClose: false });

    users(engine).createIndex({ field: "a" });
    engine.openCollection("other", "things").createIndex({ field: "b" });

    const reports = engine.validateIndexes();

    expect(
      reports.map((entry) => `${entry.database}.${entry.collection}`),
    ).toEqual(["app.users", "other.things"]);
    expect(reports.every((entry) => entry.report.valid)).toBe(true);
  });

  it("stays valid through random writes and restarts", () => {
    let engine = open({
      checkpointOnClose: false,
      checkpointThresholdBytes: 800,
    });
    let seedValue = 99;
    const random = (limit: number): number => {
      seedValue = (seedValue * 1103515245 + 12345) & 0x7fffffff;

      return seedValue % limit;
    };

    users(engine).createIndex({ field: "key", unique: true });
    users(engine).createIndex({ field: "group" });

    for (let step = 0; step < 300; step += 1) {
      const key = random(25);
      const collection = users(engine);

      try {
        switch (random(5)) {
          case 0:
            collection.insertOne({ key, group: random(4) });
            break;
          case 1:
            collection.updateMany({ key }, { $set: { group: random(4) } });
            break;
          case 2:
            collection.deleteMany({ key });
            break;
          case 3:
            collection.updateMany({}, { $inc: { bump: 1 } });
            break;
          default:
            collection.updateMany({ key }, { $set: { key: random(25) } });
        }
      } catch (error: unknown) {
        if (
          !(error instanceof StorageError) ||
          error.code !== StorageErrorCode.DuplicateKey
        ) {
          throw error;
        }
      }

      if (step % 50 === 49) {
        engine = reopenAfterCrash(engine, { checkpointThresholdBytes: 800 });
        everyIndexValid(engine);
      }
    }

    everyIndexValid(engine);
  });
});

describe("a collection that gains its first index later", () => {
  it("keeps results identical to a scan", () => {
    const engine = open({ checkpointOnClose: false });
    const collection = users(engine);

    collection.insertMany(
      Array.from({ length: 20 }, (_, index) => ({
        _id: CustomId.generate(),
        n: index % 4,
      })),
    );

    const scan = [...collection.find({ n: 2 })];

    collection.createIndex({ field: "n" });

    expect([...collection.find({ n: 2 })]).toEqual(scan);
  });
});
