import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32 } from "node:zlib";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  CheckpointDamagedError,
  checkpointFileName,
  listCheckpoints,
  readCheckpoint,
  removeTemporaryCheckpoints,
  writeCheckpoint,
  type CheckpointCollection,
} from "./checkpoint.js";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "sinterdb-snap-"));
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

const key = (seed: number): string =>
  Buffer.from(
    Uint8Array.from({ length: 16 }, (_, index) => (seed + index) % 256),
  ).toString("hex");

function collection(
  database: string,
  name: string,
  documents: [string, Uint8Array][],
): CheckpointCollection {
  return {
    database,
    collection: name,
    documents,
    documentCount: documents.length,
    indexes: [],
  };
}

function write(lsn: bigint, collections: CheckpointCollection[]): string {
  const file = writeCheckpoint(directory, lsn, collections, () => undefined);

  return join(directory, file);
}

function name(value: string): Buffer {
  const bytes = Buffer.from(value, "utf8");
  const encoded = Buffer.alloc(2 + bytes.byteLength);

  encoded.writeUInt16BE(bytes.byteLength, 0);
  encoded.set(bytes, 2);

  return encoded;
}

function buildSnapshot(
  version: number,
  lsn: bigint,
  collections: {
    database: string;
    collection: string;
    indexes?: Buffer[];
    documents: [string, Uint8Array][];
  }[],
): Buffer {
  const parts: Buffer[] = [];
  const header = Buffer.alloc(24);

  Buffer.from("SINTSNP\0", "latin1").copy(header, 0);
  header.writeUInt32BE(version, 8);
  header.writeBigUInt64BE(lsn, 12);
  header.writeUInt32BE(collections.length, 20);
  parts.push(header);

  for (const entry of collections) {
    parts.push(name(entry.database), name(entry.collection));

    if (version >= 2) {
      const count = Buffer.alloc(2);

      count.writeUInt16BE(entry.indexes?.length ?? 0, 0);
      parts.push(count, ...(entry.indexes ?? []));
    }

    const documentCount = Buffer.alloc(4);

    documentCount.writeUInt32BE(entry.documents.length, 0);
    parts.push(documentCount);

    for (const [documentKey, document] of entry.documents) {
      const prefix = Buffer.alloc(20);

      Buffer.from(documentKey, "hex").copy(prefix, 0);
      prefix.writeUInt32BE(document.byteLength, 16);
      parts.push(prefix, Buffer.from(document));
    }
  }

  const body = Buffer.concat(parts);
  const footer = Buffer.alloc(12);

  footer.writeUInt32BE(crc32(body), 0);
  Buffer.from("SINTEND\0", "latin1").copy(footer, 4);

  return Buffer.concat([body, footer]);
}

function indexBytes(indexName: string, field: string, flags: number): Buffer {
  return Buffer.concat([name(indexName), name(field), Buffer.from([flags])]);
}

describe("checkpoint files", () => {
  it("round-trips collections, empty collections, and unicode names", () => {
    const path = write(42n, [
      collection("app", "users", [
        [key(1), Uint8Array.from([1, 2, 3])],
        [key(2), new Uint8Array()],
      ]),
      collection("app", "empty", []),
      collection("datenbank-ü", "コレクション", [[key(9), Uint8Array.of(7)]]),
    ]);

    const read = readCheckpoint(path);

    expect(read.lsn).toBe(42n);
    expect(read.collections).toHaveLength(3);
    expect(read.collections[0]).toMatchObject({
      database: "app",
      collection: "users",
    });
    expect([...(read.collections[0]?.documents.entries() ?? [])]).toEqual([
      [key(1), Uint8Array.from([1, 2, 3])],
      [key(2), new Uint8Array()],
    ]);
    expect(read.collections[1]?.documents.size).toBe(0);
    expect(read.collections[2]).toMatchObject({
      database: "datenbank-ü",
      collection: "コレクション",
    });
  });

  it("round-trips an empty snapshot and large documents", () => {
    expect(readCheckpoint(write(1n, [])).collections).toEqual([]);

    const big = new Uint8Array(3 * 1024 * 1024).fill(9);
    const read = readCheckpoint(
      write(2n, [collection("a", "b", [[key(1), big]])]),
    );

    expect(read.collections[0]?.documents.get(key(1))?.byteLength).toBe(
      big.byteLength,
    );
  });

  it("names files by sequence number so they sort", () => {
    expect(checkpointFileName(7n)).toBe("00000000000000000007.snap");

    write(5n, []);
    write(30n, []);
    write(12n, []);

    expect(listCheckpoints(directory).map((entry) => entry.lsn)).toEqual([
      30n,
      12n,
      5n,
    ]);
  });

  it("writes through a temporary file that is gone afterwards", () => {
    write(3n, [collection("a", "b", [[key(1), Uint8Array.of(1)]])]);

    expect(readdirSync(directory)).toEqual([checkpointFileName(3n)]);
  });

  it("reports each stage in order", () => {
    const stages: string[] = [];

    writeCheckpoint(directory, 1n, [], (stage) => stages.push(stage));

    expect(stages).toEqual(["snapshot-written", "snapshot-renamed"]);
  });

  it("leaves no visible snapshot when it is aborted before the rename", () => {
    expect(() =>
      writeCheckpoint(directory, 1n, [], (stage) => {
        if (stage === "snapshot-written") {
          throw new Error("crash");
        }
      }),
    ).toThrow("crash");

    expect(listCheckpoints(directory)).toEqual([]);
  });

  it("removes leftover temporary files", () => {
    writeFileSync(join(directory, "00000000000000000009.snap.tmp"), "partial");
    write(1n, []);

    expect(removeTemporaryCheckpoints(directory)).toBe(1);
    expect(readdirSync(directory)).toEqual([checkpointFileName(1n)]);
  });

  it("rejects every truncation of a snapshot", () => {
    const path = write(5n, [
      collection("app", "users", [[key(1), Uint8Array.from([1, 2, 3, 4])]]),
    ]);
    const original = readFileSync(path);

    for (let length = 0; length < original.byteLength; length += 1) {
      writeFileSync(path, original.subarray(0, length));

      expect(() => readCheckpoint(path), `length ${length}`).toThrow(
        CheckpointDamagedError,
      );
    }
  });

  it("rejects every single-byte change to a snapshot", () => {
    const path = write(5n, [
      collection("app", "users", [[key(1), Uint8Array.from([1, 2, 3, 4])]]),
    ]);
    const original = readFileSync(path);

    for (let index = 0; index < original.byteLength; index += 1) {
      const damaged = Buffer.from(original);

      damaged[index] = (damaged[index] as number) ^ 0x01;
      writeFileSync(path, damaged);

      expect(() => readCheckpoint(path), `byte ${index}`).toThrow(
        CheckpointDamagedError,
      );
    }
  });

  it("rejects a file that is not a snapshot even with a valid footer", () => {
    const path = write(1n, []);

    writeFileSync(path, Buffer.alloc(64));

    expect(() => readCheckpoint(path)).toThrow(CheckpointDamagedError);
    expect(existsSync(path)).toBe(true);
  });
});

describe("checkpoint index definitions", () => {
  it("round-trips index definitions", () => {
    const path = write(9n, [
      {
        ...collection("app", "users", [[key(1), Uint8Array.of(1)]]),
        indexes: [
          {
            name: "email_1",
            keys: [{ field: "email", direction: 1 }],
            unique: true,
            sparse: false,
          },
          {
            name: "by_level",
            keys: [{ field: "profile.level", direction: -1 }],
            unique: false,
            sparse: true,
          },
        ],
      },
      collection("app", "plain", []),
    ]);

    const read = readCheckpoint(path);

    expect(read.collections[0]?.indexes).toEqual([
      {
        name: "email_1",
        keys: [{ field: "email", direction: 1 }],
        unique: true,
        sparse: false,
      },
      {
        name: "by_level",
        keys: [{ field: "profile.level", direction: -1 }],
        unique: false,
        sparse: true,
      },
    ]);
    expect(read.collections[1]?.indexes).toEqual([]);
  });

  it("still reads snapshots written before indexes existed", () => {
    const path = join(directory, checkpointFileName(4n));

    writeFileSync(
      path,
      buildSnapshot(1, 4n, [
        {
          database: "app",
          collection: "users",
          documents: [[key(1), Uint8Array.from([1, 2])]],
        },
      ]),
    );

    const read = readCheckpoint(path);

    expect(read.lsn).toBe(4n);
    expect(read.collections[0]?.indexes).toEqual([]);
    expect([...(read.collections[0]?.documents.keys() ?? [])]).toEqual([
      key(1),
    ]);
  });

  it("reads a version 2 snapshot built by hand", () => {
    const path = join(directory, checkpointFileName(5n));

    writeFileSync(
      path,
      buildSnapshot(2, 5n, [
        {
          database: "app",
          collection: "users",
          indexes: [indexBytes("age_1", "age", 0)],
          documents: [],
        },
      ]),
    );

    expect(readCheckpoint(path).collections[0]?.indexes).toEqual([
      {
        name: "age_1",
        keys: [{ field: "age", direction: 1 }],
        unique: false,
        sparse: false,
      },
    ]);
  });

  it("rejects an invalid index definition even when the checksum is valid", () => {
    const path = join(directory, checkpointFileName(6n));

    writeFileSync(
      path,
      buildSnapshot(2, 6n, [
        {
          database: "app",
          collection: "users",
          indexes: [indexBytes("bad", "$field", 0)],
          documents: [],
        },
      ]),
    );

    expect(() => readCheckpoint(path)).toThrow(CheckpointDamagedError);
  });

  it("rejects a snapshot from a newer format", () => {
    const path = join(directory, checkpointFileName(7n));

    writeFileSync(path, buildSnapshot(4, 7n, []));

    expect(() => readCheckpoint(path)).toThrow(CheckpointDamagedError);
  });

  it("rejects every truncation of a snapshot with indexes", () => {
    const path = write(8n, [
      {
        ...collection("app", "users", [[key(1), Uint8Array.of(1, 2, 3)]]),
        indexes: [
          {
            name: "email_1",
            keys: [{ field: "email", direction: 1 }],
            unique: true,
            sparse: false,
          },
        ],
      },
    ]);
    const original = readFileSync(path);

    for (let length = 0; length < original.byteLength; length += 1) {
      writeFileSync(path, original.subarray(0, length));

      expect(() => readCheckpoint(path), `length ${length}`).toThrow(
        CheckpointDamagedError,
      );
    }
  });
});
