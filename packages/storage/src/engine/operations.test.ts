import { describe, expect, it } from "vitest";

import { StorageError, StorageErrorCode } from "../errors.js";
import type { IndexSpec } from "../indexing/spec.js";
import {
  Reader,
  decodeOperations,
  encodeIndexSpec,
  encodeOperations,
  readIndexSpec,
  type Operation,
} from "./operations.js";

const id = (seed: number): Uint8Array =>
  Uint8Array.from({ length: 16 }, (_, index) => (seed + index) % 256);

describe("operation codec", () => {
  const operations: Operation[] = [
    { kind: "createCollection", database: "app", collection: "users" },
    {
      kind: "put",
      database: "app",
      collection: "users",
      id: id(1),
      document: Uint8Array.from([1, 2, 3, 4]),
    },
    { kind: "delete", database: "app", collection: "users", id: id(9) },
    {
      kind: "put",
      database: "datenbank-ü",
      collection: "コレクション",
      id: id(200),
      document: new Uint8Array(),
    },
    {
      kind: "createIndex",
      database: "app",
      collection: "users",
      index: {
        name: "email_1",
        keys: [{ field: "email", direction: 1 }],
        unique: true,
        sparse: false,
      },
    },
    {
      kind: "createIndex",
      database: "app",
      collection: "users",
      index: {
        name: "プロフィール",
        keys: [{ field: "profile.level", direction: -1 }],
        unique: false,
        sparse: true,
      },
    },
    {
      kind: "dropIndex",
      database: "app",
      collection: "users",
      name: "email_1",
    },
  ];

  it("round-trips every operation kind", () => {
    expect(decodeOperations(encodeOperations(operations))).toEqual(operations);
  });

  it("round-trips an empty transaction", () => {
    expect(decodeOperations(encodeOperations([]))).toEqual([]);
  });

  it("round-trips large documents", () => {
    const document = new Uint8Array(3 * 1024 * 1024).fill(7);
    const decoded = decodeOperations(
      encodeOperations([
        { kind: "put", database: "a", collection: "b", id: id(0), document },
      ]),
    );

    expect((decoded[0] as { document: Uint8Array }).document).toHaveLength(
      document.byteLength,
    );
  });

  it("rejects every truncation of an encoded transaction", () => {
    const encoded = encodeOperations(operations);

    for (let length = 0; length < encoded.byteLength; length += 1) {
      expect(
        () => decodeOperations(encoded.subarray(0, length)),
        `length ${length}`,
      ).toThrow(StorageError);
    }
  });

  it("rejects trailing bytes and unknown kinds", () => {
    const encoded = encodeOperations(operations);

    expect(() =>
      decodeOperations(Buffer.concat([encoded, Buffer.from([0])])),
    ).toThrow(StorageError);

    const unknown = Buffer.from([0, 0, 0, 1, 99]);

    expect(() => decodeOperations(unknown)).toThrow(StorageError);
  });

  it("reports malformed records as corruption", () => {
    try {
      decodeOperations(Buffer.from([0, 0, 0, 1]));
      throw new Error("Expected an error.");
    } catch (error: unknown) {
      expect((error as StorageError).code).toBe(StorageErrorCode.Corruption);
    }
  });

  it("rejects invalid names and ids when encoding", () => {
    expect(() =>
      encodeOperations([
        { kind: "createCollection", database: "", collection: "x" },
      ]),
    ).toThrow(RangeError);

    expect(() =>
      encodeOperations([
        {
          kind: "delete",
          database: "a",
          collection: "b",
          id: new Uint8Array(3),
        },
      ]),
    ).toThrow(RangeError);
  });

  it("rejects names that are not valid UTF-8", () => {
    const encoded = Buffer.from(encodeOperations(operations));

    encoded[6] = 0xff;

    expect(() => decodeOperations(encoded)).toThrow(StorageError);
  });

  it("rejects an index definition that is not valid", () => {
    const encoded = Buffer.from(
      encodeOperations([
        {
          kind: "createIndex",
          database: "a",
          collection: "b",
          index: {
            name: "bad",
            keys: [{ field: "x.y", direction: 1 }],
            unique: false,
            sparse: false,
          },
        },
      ]),
    );
    const position = encoded.indexOf(Buffer.from("x.y"));

    encoded[position] = "$".charCodeAt(0);

    try {
      decodeOperations(encoded);
      throw new Error("Expected an error.");
    } catch (error: unknown) {
      expect((error as StorageError).code).toBe(StorageErrorCode.Corruption);
      expect((error as Error).message).toContain("index definition");
    }
  });
});

describe("index definitions in the operation codec", () => {
  const roundTrip = (index: IndexSpec): IndexSpec => {
    const [operation] = decodeOperations(
      encodeOperations([
        { kind: "createIndex", database: "a", collection: "b", index },
      ]),
    );

    return (operation as { index: IndexSpec }).index;
  };

  it("round-trips a compound index with mixed directions", () => {
    const index: IndexSpec = {
      name: "by_country_age",
      keys: [
        { field: "country", direction: 1 },
        { field: "profile.age", direction: -1 },
        { field: "name", direction: 1 },
      ],
      unique: true,
      sparse: true,
    };

    expect(roundTrip(index)).toEqual(index);
  });

  it("writes a single-field index exactly as storage format 2 did", () => {
    const bytes = Buffer.from(
      encodeIndexSpec({
        name: "n",
        keys: [{ field: "f", direction: -1 }],
        unique: true,
        sparse: false,
      }),
    );

    expect([...bytes]).toEqual([0, 1, 110, 0, 1, 102, 1 | 4]);
  });

  it("rejects an index definition with unknown flags", () => {
    const bytes = Buffer.from(
      encodeIndexSpec({
        name: "n",
        keys: [{ field: "f", direction: 1 }],
        unique: false,
        sparse: false,
      }),
    );

    bytes[bytes.length - 1] = 16;

    expect(() => readIndexSpec(new Reader(bytes))).toThrow(StorageError);
  });

  it("rejects a compound definition with a repeated field", () => {
    const bytes = Buffer.from(
      encodeIndexSpec({
        name: "n",
        keys: [
          { field: "a", direction: 1 },
          { field: "b", direction: 1 },
        ],
        unique: false,
        sparse: false,
      }),
    );
    const position = bytes.lastIndexOf(Buffer.from("b"));

    bytes[position] = "a".charCodeAt(0);

    expect(() => readIndexSpec(new Reader(bytes))).toThrow(StorageError);
  });
});
