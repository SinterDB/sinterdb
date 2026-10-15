import { type Document } from "sinterdb-protocol";
import { describe, expect, it } from "vitest";

import { StorageError, StorageErrorCode } from "../errors.js";
import { InMemoryCollection } from "../in-memory-collection.js";

function codeOf(action: () => unknown): StorageErrorCode {
  try {
    action();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(StorageError);

    return (error as StorageError).code;
  }

  throw new Error("Expected an error.");
}

function stock(): InMemoryCollection {
  const collection = new InMemoryCollection();

  collection.insertMany([
    { shop: "north", kind: "tea", qty: 5 },
    { shop: "north", kind: "tea", qty: 7 },
    { shop: "north", kind: "coffee", qty: 1 },
    { shop: "south", kind: "tea", qty: 2 },
    { shop: "south", kind: "coffee", qty: 9 },
    { shop: "south", qty: 4 },
    { kind: "tea", qty: 3 },
  ]);

  return collection;
}

const byShopKind = {
  keys: [
    ["shop", 1],
    ["kind", 1],
  ],
} as const;

function quantities(collection: InMemoryCollection, filter: Document) {
  return [...collection.find(filter)].map((document) => document["qty"]).sort();
}

describe("compound indexes", () => {
  it("is listed with its keys in order", () => {
    const collection = stock();

    collection.createIndex({
      keys: [
        ["shop", 1],
        ["qty", -1],
      ],
    });

    expect(collection.listIndexes()[1]).toEqual({
      name: "shop_1_qty_-1",
      keys: [
        { field: "shop", direction: 1 },
        { field: "qty", direction: -1 },
      ],
      unique: false,
      sparse: false,
    });
  });

  it("answers a query that fixes the first field", () => {
    const collection = stock();

    collection.createIndex(byShopKind);

    expect(collection.explain({ shop: "north" })).toMatchObject({
      stage: "IXSCAN",
      index: "shop_1_kind_1",
      field: "shop",
      fields: ["shop", "kind"],
      prefixLength: 1,
      access: "equality",
      estimatedCandidates: 3,
    });
    expect(quantities(collection, { shop: "north" })).toEqual([1, 5, 7]);
  });

  it("answers a query that fixes every field", () => {
    const collection = stock();

    collection.createIndex(byShopKind);

    expect(collection.explain({ shop: "north", kind: "tea" })).toMatchObject({
      stage: "IXSCAN",
      prefixLength: 2,
      estimatedCandidates: 2,
    });
    expect(quantities(collection, { shop: "north", kind: "tea" })).toEqual([
      5, 7,
    ]);
  });

  it("combines equality with other conditions on the same query", () => {
    const collection = stock();

    collection.createIndex(byShopKind);

    const filter = { shop: "north", kind: "tea", qty: { $gt: 5 } };

    expect(collection.explain(filter)).toMatchObject({ prefixLength: 2 });
    expect(quantities(collection, filter)).toEqual([7]);
  });

  it("is not used when the first field is not fixed", () => {
    const collection = stock();

    collection.createIndex(byShopKind);

    expect(collection.explain({ kind: "tea" }).stage).toBe("COLLSCAN");
    expect(collection.explain({ shop: { $gt: "a" } }).stage).toBe("COLLSCAN");
    expect(collection.explain({ shop: { $in: ["north"] } }).stage).toBe(
      "COLLSCAN",
    );
    expect(quantities(collection, { kind: "tea" })).toEqual([2, 3, 5, 7]);
  });

  it("stops at the first field that is not fixed by equality", () => {
    const collection = stock();

    collection.createIndex({
      keys: [
        ["shop", 1],
        ["kind", 1],
        ["qty", 1],
      ],
    });

    expect(collection.explain({ shop: "north", qty: 5 })).toMatchObject({
      prefixLength: 1,
    });
  });

  it("finds documents that lack a later field", () => {
    const collection = stock();

    collection.createIndex(byShopKind);

    expect(quantities(collection, { shop: "south" })).toEqual([2, 4, 9]);
    expect(collection.explain({ shop: "south" })).toMatchObject({
      prefixLength: 1,
      estimatedCandidates: 3,
    });
  });

  it("matches null only against a stored null", () => {
    const collection = new InMemoryCollection();

    collection.insertMany([
      { a: 1, b: null, tag: "null" },
      { a: 1, tag: "missing" },
      { a: 1, b: 2, tag: "two" },
    ]);
    collection.createIndex({
      keys: [
        ["a", 1],
        ["b", 1],
      ],
    });

    expect(
      [...collection.find({ a: 1, b: null })].map((d) => d["tag"]),
    ).toEqual(["null"]);
  });

  it("keeps 1 and 1n apart", () => {
    const collection = new InMemoryCollection();

    collection.insertMany([
      { a: 1, b: 1, tag: "number" },
      { a: 1, b: 1n, tag: "bigint" },
    ]);
    collection.createIndex({
      keys: [
        ["a", 1],
        ["b", 1],
      ],
    });

    expect([...collection.find({ a: 1, b: 1n })].map((d) => d["tag"])).toEqual([
      "bigint",
    ]);
    expect([...collection.find({ a: 1, b: 1 })].map((d) => d["tag"])).toEqual([
      "number",
    ]);
  });

  it("follows inserts, updates and deletes", () => {
    const collection = stock();

    collection.createIndex(byShopKind);
    collection.insertOne({ shop: "east", kind: "tea", qty: 11 });
    collection.updateMany(
      { shop: "north", kind: "coffee" },
      { $set: { shop: "east" } },
    );
    collection.deleteMany({ shop: "south", kind: "tea" });

    expect(quantities(collection, { shop: "east" })).toEqual([1, 11]);
    expect(quantities(collection, { shop: "north" })).toEqual([5, 7]);
    expect(quantities(collection, { shop: "south", kind: "tea" })).toEqual([]);
    expect(collection.validateIndexes()).toMatchObject({ valid: true });
  });

  it("can be dropped", () => {
    const collection = stock();

    collection.createIndex(byShopKind);
    collection.dropIndex("shop_1_kind_1");

    expect(collection.explain({ shop: "north" }).stage).toBe("COLLSCAN");
    expect(collection.listIndexes()).toHaveLength(1);
  });

  it("is set aside once a document holds an array in one of its fields", () => {
    const collection = stock();

    collection.createIndex(byShopKind);
    expect(collection.explain({ shop: "north" }).stage).toBe("IXSCAN");

    collection.insertOne({ shop: "west", kind: ["tea", "herbal"], qty: 6 });

    expect(collection.explain({ shop: "north" }).stage).toBe("COLLSCAN");
    expect(quantities(collection, { shop: "west", kind: "tea" })).toEqual([6]);
    expect(collection.validateIndexes()).toMatchObject({ valid: true });
  });

  it("finds documents by a descending leading field", () => {
    const collection = stock();

    collection.createIndex({
      keys: [
        ["qty", -1],
        ["shop", 1],
      ],
    });

    expect(collection.explain({ qty: 9 })).toMatchObject({
      prefixLength: 1,
      estimatedCandidates: 1,
    });
    expect(quantities(collection, { qty: 9 })).toEqual([9]);
    expect(quantities(collection, { qty: 2, shop: "south" })).toEqual([2]);
    expect(quantities(collection, { qty: 100 })).toEqual([]);
  });

  it("loses to a more selective single-field index", () => {
    const collection = stock();

    collection.createIndex(byShopKind);
    collection.createIndex({ field: "qty" });

    expect(collection.explain({ shop: "north", qty: 7 })).toMatchObject({
      index: "qty_1",
    });
  });

  it("is chosen over a single-field index when it is more selective", () => {
    const collection = stock();

    collection.createIndex({ field: "shop" });
    collection.createIndex(byShopKind);

    expect(collection.explain({ shop: "north", kind: "coffee" })).toMatchObject(
      { index: "shop_1_kind_1", estimatedCandidates: 1 },
    );
  });
});

describe("creating compound indexes", () => {
  it("accepts an identical request again", () => {
    const collection = stock();

    expect(collection.createIndex(byShopKind).created).toBe(true);
    expect(collection.createIndex(byShopKind).created).toBe(false);
  });

  it("refuses the same fields under another definition", () => {
    const collection = stock();

    collection.createIndex(byShopKind);

    expect(
      codeOf(() =>
        collection.createIndex({
          keys: [
            ["shop", -1],
            ["kind", 1],
          ],
        }),
      ),
    ).toBe(StorageErrorCode.IndexConflict);
  });

  it("allows the same fields in another order", () => {
    const collection = stock();

    collection.createIndex(byShopKind);
    collection.createIndex({
      keys: [
        ["kind", 1],
        ["shop", 1],
      ],
    });

    expect(collection.listIndexes()).toHaveLength(3);
  });

  it("allows a compound index beside a single-field index on its first field", () => {
    const collection = stock();

    collection.createIndex({ field: "shop" });
    collection.createIndex(byShopKind);

    expect(collection.listIndexes()).toHaveLength(3);
  });

  it("rejects invalid keys", () => {
    const collection = stock();

    expect(
      codeOf(() =>
        collection.createIndex({
          keys: [
            ["shop", 1],
            ["shop", 1],
          ],
        }),
      ),
    ).toBe(StorageErrorCode.InvalidIndex);
  });
});

describe("unique compound indexes", () => {
  const unique = {
    keys: [
      ["shop", 1],
      ["kind", 1],
    ],
    unique: true,
  } as const;

  it("allows a repeated first field but not a repeated combination", () => {
    const collection = new InMemoryCollection();

    collection.createIndex(unique);
    collection.insertOne({ shop: "a", kind: "x" });
    collection.insertOne({ shop: "a", kind: "y" });
    collection.insertOne({ shop: "b", kind: "x" });

    expect(codeOf(() => collection.insertOne({ shop: "a", kind: "x" }))).toBe(
      StorageErrorCode.DuplicateKey,
    );
    expect([...collection.find({})]).toHaveLength(3);
  });

  it("names the fields and the values in the error", () => {
    const collection = new InMemoryCollection();

    collection.createIndex(unique);
    collection.insertOne({ shop: "a", kind: "x" });

    try {
      collection.insertOne({ shop: "a", kind: "x" });
      throw new Error("Expected a duplicate key error.");
    } catch (error: unknown) {
      const message = (error as Error).message;

      expect(message).toContain('fields "shop, kind"');
      expect(message).toContain('shop: "a"');
      expect(message).toContain('kind: "x"');
    }
  });

  it("treats a missing field as a value of its own", () => {
    const collection = new InMemoryCollection();

    collection.createIndex(unique);
    collection.insertOne({ shop: "a" });
    collection.insertOne({ shop: "b" });
    collection.insertOne({ kind: "x" });

    expect(codeOf(() => collection.insertOne({ shop: "a" }))).toBe(
      StorageErrorCode.DuplicateKey,
    );

    // A stored null is not the same as a missing field.
    expect(() => collection.insertOne({ shop: "a", kind: null })).not.toThrow();
  });

  it("can swap values between documents in one update", () => {
    const collection = new InMemoryCollection();

    collection.createIndex(unique);
    collection.insertMany([
      { shop: "a", kind: "x", n: 1 },
      { shop: "a", kind: "y", n: 2 },
    ]);

    expect(
      codeOf(() => collection.updateMany({}, { $set: { kind: "x" } })),
    ).toBe(StorageErrorCode.DuplicateKey);
    expect(collection.validateIndexes()).toMatchObject({ valid: true });
  });

  it("refuses to build over existing duplicates", () => {
    const collection = new InMemoryCollection();

    collection.insertMany([
      { shop: "a", kind: "x" },
      { shop: "a", kind: "x" },
    ]);

    expect(codeOf(() => collection.createIndex(unique))).toBe(
      StorageErrorCode.DuplicateKey,
    );
    expect(collection.listIndexes()).toHaveLength(1);
  });
});

describe("sparse compound indexes", () => {
  it("leaves out only documents that have none of the fields", () => {
    const collection = new InMemoryCollection();

    collection.createIndex({
      keys: [
        ["a", 1],
        ["b", 1],
      ],
      unique: true,
      sparse: true,
    });
    collection.insertOne({});
    collection.insertOne({ other: 1 });
    collection.insertOne({ a: 1 });
    collection.insertOne({ b: 1 });

    expect(codeOf(() => collection.insertOne({ a: 1 }))).toBe(
      StorageErrorCode.DuplicateKey,
    );
    expect(collection.validateIndexes()).toMatchObject({
      valid: true,
      issues: [],
    });
  });

  it("is not sparse by default", () => {
    const collection = new InMemoryCollection();

    collection.createIndex({
      keys: [
        ["a", 1],
        ["b", 1],
      ],
      unique: true,
    });
    collection.insertOne({});

    expect(codeOf(() => collection.insertOne({ other: 1 }))).toBe(
      StorageErrorCode.DuplicateKey,
    );
  });
});
