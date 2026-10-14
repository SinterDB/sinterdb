import { CustomId, type Document } from "sinterdb-protocol";
import { describe, expect, it } from "vitest";

import { StorageErrorCode } from "./errors.js";
import { InMemoryCollection } from "./in-memory-collection.js";
import { compileProjection } from "./projection.js";

function expectInvalid(action: () => unknown): void {
  expect(action).toThrowError(
    expect.objectContaining({ code: StorageErrorCode.InvalidFindOptions }),
  );
}

function people(): InMemoryCollection {
  const collection = new InMemoryCollection();

  collection.insertMany([
    { name: "Ada", age: 36, team: "b", address: { city: "London", zip: "1" } },
    { name: "Grace", age: 85, team: "a", address: { city: "NYC", zip: "2" } },
    { name: "Katherine", age: 101, team: "b" },
  ]);

  return collection;
}

describe("compileProjection", () => {
  it("rejects a projection that is not a document", () => {
    expectInvalid(() => compileProjection([] as unknown as Document));
    expectInvalid(() => compileProjection(null as unknown as Document));
    expectInvalid(() => compileProjection("a" as unknown as Document));
    expectInvalid(() => compileProjection(new Date(0) as unknown as Document));
  });

  it("rejects non-flag values, including bigint and nested documents", () => {
    expectInvalid(() => compileProjection({ a: 1n }));
    expectInvalid(() => compileProjection({ a: { $slice: 1 } }));
    expectInvalid(() => compileProjection({ a: -1 }));
    expectInvalid(() => compileProjection({ a: 1.5 }));
  });

  it("returns the same document for an empty projection", () => {
    const document = { _id: 1, a: 1 };

    expect(compileProjection({})(document)).toBe(document);
  });

  it("does not change the document it projects", () => {
    const document = { _id: 1, a: { b: 1, c: 2 }, d: [{ e: 1, f: 2 }] };
    const copy = structuredClone(document);

    compileProjection({ "a.b": 1, "d.e": 1 })(document);
    compileProjection({ "a.b": 0, "d.e": 0 })(document);

    expect(document).toEqual(copy);
  });

  it("keeps a field called __proto__ as an ordinary field", () => {
    const document: Document = {};

    Object.defineProperty(document, "__proto__", {
      value: 1,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(document, "a", {
      value: 2,
      enumerable: true,
      configurable: true,
      writable: true,
    });

    const result = compileProjection({ a: 0 })(document);

    expect(Object.keys(result)).toEqual(["__proto__"]);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(({} as Document)["polluted"]).toBeUndefined();
  });

  it("keeps values that are not plain documents intact", () => {
    const date = new Date(5);
    const bytes = new Uint8Array([1, 2]);
    const id = CustomId.generate();

    const result = compileProjection({ "a.b": 0 })({
      _id: id,
      a: { b: 1, date, bytes },
    });

    expect(result["_id"]).toBe(id);
    expect(result["a"]).toEqual({ date, bytes });
    expect((result["a"] as Document)["date"]).toBe(date);
  });

  it("does not look inside dates, binary values, or ids", () => {
    const result = compileProjection({ "a.b": 1 })({
      _id: 1,
      a: new Date(5),
      c: new Uint8Array([1]),
    });

    expect(result).toEqual({ _id: 1 });
  });
});

describe("find with a projection", () => {
  it("returns only the projected fields", () => {
    const found = [
      ...people().find({}, { projection: { name: 1 }, sort: [["age", 1]] }),
    ];

    expect(found.map((document) => Object.keys(document))).toEqual([
      ["_id", "name"],
      ["_id", "name"],
      ["_id", "name"],
    ]);
    expect(found.map((document) => document["name"])).toEqual([
      "Ada",
      "Grace",
      "Katherine",
    ]);
  });

  it("sorts, skips, and limits by fields it does not return", () => {
    const found = [
      ...people().find(
        { age: { $gte: 36 } },
        {
          projection: { name: 1, _id: 0 },
          sort: [["age", -1]],
          skip: 1,
          limit: 1,
        },
      ),
    ];

    expect(found).toEqual([{ name: "Grace" }]);
  });

  it("filters by fields it does not return", () => {
    const found = [
      ...people().find({ team: "a" }, { projection: { name: 1, _id: 0 } }),
    ];

    expect(found).toEqual([{ name: "Grace" }]);
  });

  it("excludes fields", () => {
    const found = [
      ...people().find({ name: "Ada" }, { projection: { address: 0, age: 0 } }),
    ];

    expect(found).toHaveLength(1);
    expect(Object.keys(found[0] as Document)).toEqual(["_id", "name", "team"]);
  });

  it("projects nested paths and skips documents without them", () => {
    const found = [
      ...people().find(
        {},
        { projection: { "address.city": 1, _id: 0 }, sort: [["age", 1]] },
      ),
    ];

    expect(found).toEqual([
      { address: { city: "London" } },
      { address: { city: "NYC" } },
      {},
    ]);
  });

  it("projects results read through an index", () => {
    const collection = people();

    collection.createIndex({ field: "age" });

    expect(
      [
        ...collection.find(
          { age: { $gt: 50 } },
          { projection: { age: 1, _id: 0 } },
        ),
      ].map((document) => document["age"]),
    ).toEqual([85, 101]);
    expect(collection.explain({ age: { $gt: 50 } }).index).toBe("age_1");
  });

  it("rejects an invalid projection before reading any document", () => {
    expectInvalid(() => people().find({}, { projection: { a: 1, b: 0 } }));
    expectInvalid(() =>
      new InMemoryCollection().find({}, { projection: { a: 2 } }),
    );
  });

  it("does not change stored documents", () => {
    const collection = people();

    [...collection.find({}, { projection: { name: 1 } })];

    expect(
      [...collection.find({})].every((document) => "age" in document),
    ).toBe(true);
  });
});

describe("findOne with a projection", () => {
  it("projects the first match", () => {
    const collection = people();

    expect(
      collection.findOne({ name: "Grace" }, { projection: { age: 1, _id: 0 } }),
    ).toEqual({ age: 85 });
  });

  it("projects a lookup by _id", () => {
    const collection = people();
    const ada = collection.findOne({ name: "Ada" }) as Document;

    expect(
      collection.findOne(
        { _id: ada["_id"] as CustomId },
        { projection: { name: 1 } },
      ),
    ).toEqual({ _id: ada["_id"], name: "Ada" });
  });

  it("returns undefined when nothing matches", () => {
    expect(
      people().findOne({ name: "Nobody" }, { projection: { name: 1 } }),
    ).toBeUndefined();
  });

  it("rejects an invalid projection even when nothing matches", () => {
    expectInvalid(() =>
      people().findOne({ name: "Nobody" }, { projection: { name: 3 } }),
    );
  });
});
