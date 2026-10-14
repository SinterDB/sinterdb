import { CustomId, type Document, type DocumentValue } from "sinterdb-protocol";
import { describe, expect, it } from "vitest";

import { StorageErrorCode } from "./errors.js";
import { InMemoryCollection } from "./in-memory-collection.js";

function collectionOf(documents: Document[]): InMemoryCollection {
  const collection = new InMemoryCollection();

  collection.insertMany(documents);

  return collection;
}

function expectInvalid(action: () => unknown, code: string): void {
  expect(action).toThrowError(expect.objectContaining({ code }));
}

describe("count", () => {
  const people = (): InMemoryCollection =>
    collectionOf([
      { name: "Ada", age: 36, tags: ["a", "b"] },
      { name: "Grace", age: 85, tags: ["b"] },
      { name: "Katherine", age: 101 },
    ]);

  it("counts every document for an empty filter", () => {
    expect(people().count({})).toBe(3);
    expect(new InMemoryCollection().count({})).toBe(0);
  });

  it("counts matching documents", () => {
    const collection = people();

    expect(collection.count({ age: { $gt: 50 } })).toBe(2);
    expect(collection.count({ tags: "b" })).toBe(2);
    expect(collection.count({ tags: { $exists: false } })).toBe(1);
    expect(collection.count({ name: "Nobody" })).toBe(0);
  });

  it("agrees with find", () => {
    const collection = people();

    for (const filter of [
      {},
      { age: { $lt: 90 } },
      { $or: [{ name: "Ada" }, { tags: "b" }] },
      { tags: { $size: 1 } },
    ]) {
      expect(collection.count(filter)).toBe(
        [...collection.find(filter)].length,
      );
    }
  });

  it("uses indexes without changing the answer", () => {
    const collection = people();
    const before = collection.count({ age: { $gte: 36, $lte: 85 } });

    collection.createIndex({ field: "age" });

    expect(collection.explain({ age: { $gte: 36, $lte: 85 } }).index).toBe(
      "age_1",
    );
    expect(collection.count({ age: { $gte: 36, $lte: 85 } })).toBe(before);
    expect(before).toBe(2);
  });

  it("tracks inserts, updates, and deletes", () => {
    const collection = people();

    collection.insertOne({ name: "Linus", age: 55 });
    expect(collection.count({})).toBe(4);
    expect(collection.count({ age: { $gt: 50 } })).toBe(3);

    collection.deleteOne({ name: "Grace" });
    expect(collection.count({})).toBe(3);

    collection.updateMany({}, { $set: { age: 1 } });
    expect(collection.count({ age: 1 })).toBe(3);
  });

  it("rejects an invalid filter, even for an empty collection", () => {
    expectInvalid(
      () => new InMemoryCollection().count({ a: { $nope: 1 } }),
      StorageErrorCode.InvalidFilter,
    );
    expectInvalid(
      () => people().count({ $and: [] }),
      StorageErrorCode.InvalidFilter,
    );
  });
});

describe("distinct", () => {
  it("returns each value once, in sort order", () => {
    const collection = collectionOf([
      { n: 3 },
      { n: 1 },
      { n: 3 },
      { n: 2 },
      { n: 1 },
    ]);

    expect(collection.distinct("n")).toEqual([1, 2, 3]);
  });

  it("skips documents without the field and keeps null", () => {
    const collection = collectionOf([{ a: 1 }, { b: 2 }, { a: null }]);

    expect(collection.distinct("a")).toEqual([null, 1]);
  });

  it("returns the elements of arrays", () => {
    const collection = collectionOf([
      { tags: ["b", "a"] },
      { tags: ["b", "c"] },
      { tags: [] },
      { tags: "z" },
    ]);

    expect(collection.distinct("tags")).toEqual(["a", "b", "c", "z"]);
  });

  it("keeps nested arrays as values", () => {
    const collection = collectionOf([{ a: [[1], [1], 2] }]);

    expect(collection.distinct("a")).toEqual([2, [1]]);
  });

  it("reads nested paths and paths through arrays of documents", () => {
    const collection = collectionOf([
      { user: { city: "A" }, items: [{ sku: "x" }, { sku: "y" }] },
      { user: { city: "B" }, items: [{ sku: "y" }, { qty: 1 }] },
      { user: { city: "A" } },
    ]);

    expect(collection.distinct("user.city")).toEqual(["A", "B"]);
    expect(collection.distinct("items.sku")).toEqual(["x", "y"]);
    expect(collection.distinct("items.0.sku")).toEqual(["x", "y"]);
    expect(collection.distinct("user.city.deeper")).toEqual([]);
  });

  it("only looks at documents that match the filter", () => {
    const collection = collectionOf([
      { team: "a", n: 1 },
      { team: "b", n: 2 },
      { team: "a", n: 3 },
    ]);

    expect(collection.distinct("n", { team: "a" })).toEqual([1, 3]);
    expect(collection.distinct("n", { team: "none" })).toEqual([]);
  });

  it("treats values of different types as different", () => {
    const collection = collectionOf([
      { a: 1 },
      { a: 1n },
      { a: "1" },
      { a: true },
      { a: 0 },
      { a: -0 },
      { a: Number.NaN },
      { a: Number.NaN },
    ]);
    const values = collection.distinct("a");

    expect(values).toHaveLength(7);
    expect(values.filter((value) => typeof value === "bigint")).toEqual([1n]);
    expect(values.filter((value) => Number.isNaN(value))).toHaveLength(1);
    expect(values.filter((value) => Object.is(value, -0))).toHaveLength(1);
    expect(values.filter((value) => Object.is(value, 0))).toHaveLength(1);
  });

  it("orders kinds as documented", () => {
    const id = CustomId.generate();
    const date = new Date(5);
    const bytes = new Uint8Array([1]);
    const input: DocumentValue[] = [
      { x: 1 },
      date,
      true,
      id,
      bytes,
      "s",
      1,
      null,
    ];
    const collection = collectionOf(input.map((a) => ({ a })));
    const values = collection.distinct("a");

    expect(values).toEqual([null, 1, "s", bytes, id, true, date, { x: 1 }]);
  });

  it("is distinct by value for dates, binary values, and documents", () => {
    const collection = collectionOf([
      { a: new Date(5) },
      { a: new Date(5) },
      { a: new Uint8Array([1, 2]) },
      { a: new Uint8Array([1, 2]) },
      { a: { x: 1, y: 2 } },
      { a: { y: 2, x: 1 } },
    ]);

    expect(collection.distinct("a")).toHaveLength(3);
  });

  it("returns the ids for _id", () => {
    const collection = collectionOf([{ n: 1 }, { n: 2 }]);
    const values = collection.distinct("_id");

    expect(values).toHaveLength(2);
    expect(values.every((value) => value instanceof CustomId)).toBe(true);
  });

  it("works with an index and tracks changes", () => {
    const collection = collectionOf([
      { team: "a", n: 1 },
      { team: "b", n: 2 },
    ]);

    collection.createIndex({ field: "team" });
    expect(collection.distinct("n", { team: "b" })).toEqual([2]);

    collection.insertOne({ team: "b", n: 9 });
    collection.deleteMany({ n: 2 });
    expect(collection.distinct("n", { team: "b" })).toEqual([9]);
  });

  it("returns nothing for an empty collection", () => {
    expect(new InMemoryCollection().distinct("a")).toEqual([]);
  });

  it("rejects an invalid field or filter", () => {
    const collection = collectionOf([{ a: 1 }]);

    for (const field of ["", ".a", "a.", "a..b", "$a", "a.$b", "__proto__"]) {
      expectInvalid(
        () => collection.distinct(field),
        StorageErrorCode.InvalidFindOptions,
      );
    }

    expectInvalid(
      () => collection.distinct(1 as unknown as string),
      StorageErrorCode.InvalidFindOptions,
    );
    expectInvalid(
      () => collection.distinct("a", { a: { $nope: 1 } }),
      StorageErrorCode.InvalidFilter,
    );
  });
});
