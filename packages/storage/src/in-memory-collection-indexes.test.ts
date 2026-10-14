import { CustomId, type Document } from "sinterdb-protocol";
import { describe, expect, it } from "vitest";

import {
  StorageError,
  StorageErrorCode,
  StorageInsertManyError,
} from "./errors.js";
import {
  InMemoryCollection,
  type CollectionJournal,
} from "./in-memory-collection.js";

function expectCode(
  action: () => unknown,
  code: StorageErrorCode,
): StorageError {
  try {
    action();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(StorageError);
    expect((error as StorageError).code).toBe(code);

    return error as StorageError;
  }

  throw new Error(`Expected ${code} to be thrown.`);
}

function all(collection: InMemoryCollection): Document[] {
  return [...collection.find({})];
}

function valid(collection: InMemoryCollection): void {
  expect(collection.validateIndexes()).toMatchObject({
    valid: true,
    issues: [],
  });
}

function people(): InMemoryCollection {
  const collection = new InMemoryCollection();

  collection.insertMany(
    Array.from({ length: 20 }, (_, index) => ({
      name: `person-${index}`,
      age: 20 + (index % 5),
      team: index % 2 === 0 ? "red" : "blue",
    })),
  );

  return collection;
}

describe("index management", () => {
  it("lists the _id index first and other indexes in creation order", () => {
    const collection = people();

    collection.createIndex({ field: "age" });
    collection.createIndex({ field: "name", unique: true, name: "by_name" });

    expect(collection.listIndexes()).toEqual([
      { name: "_id_", field: "_id", direction: 1, unique: true, sparse: false },
      {
        name: "age_1",
        field: "age",
        direction: 1,
        unique: false,
        sparse: false,
      },
      {
        name: "by_name",
        field: "name",
        direction: 1,
        unique: true,
        sparse: false,
      },
    ]);
  });

  it("creates an index once and accepts an identical request again", () => {
    const collection = people();

    expect(collection.createIndex({ field: "age" })).toEqual({
      name: "age_1",
      created: true,
    });
    expect(collection.createIndex({ field: "age" })).toEqual({
      name: "age_1",
      created: false,
    });
    expect(collection.listIndexes()).toHaveLength(2);
  });

  it("rejects conflicting definitions", () => {
    const collection = people();

    collection.createIndex({ field: "age", name: "by_age" });

    expectCode(
      () =>
        collection.createIndex({ field: "age", name: "by_age", unique: true }),
      StorageErrorCode.IndexConflict,
    );
    expectCode(
      () => collection.createIndex({ field: "age", name: "other" }),
      StorageErrorCode.IndexConflict,
    );
    expectCode(
      () => collection.createIndex({ field: "team", name: "by_age" }),
      StorageErrorCode.IndexConflict,
    );
  });

  it("limits the number of indexes", () => {
    const collection = new InMemoryCollection();

    for (let index = 0; index < 32; index += 1) {
      collection.createIndex({ field: `f${index}` });
    }

    expectCode(
      () => collection.createIndex({ field: "one-too-many" }),
      StorageErrorCode.IndexConflict,
    );
  });

  it("drops indexes and refuses to drop _id or unknown indexes", () => {
    const collection = people();

    collection.createIndex({ field: "age" });
    collection.dropIndex("age_1");

    expect(collection.listIndexes()).toHaveLength(1);
    expectCode(
      () => collection.dropIndex("age_1"),
      StorageErrorCode.IndexNotFound,
    );
    expectCode(
      () => collection.dropIndex("_id_"),
      StorageErrorCode.InvalidIndex,
    );
    expect(collection.explain({ age: 20 }).stage).toBe("COLLSCAN");
  });

  it("keeps working after the last index is dropped and another is added", () => {
    const collection = people();

    collection.createIndex({ field: "age" });
    collection.dropIndex("age_1");
    collection.insertOne({ name: "late", age: 20, team: "red" });
    collection.createIndex({ field: "age" });

    expect(
      all(collection).filter((document) => document["age"] === 20),
    ).toHaveLength(5);
    valid(collection);
  });

  it("indexes nested fields", () => {
    const collection = new InMemoryCollection();

    collection.insertMany([
      { profile: { level: 1 } },
      { profile: { level: 2 } },
      { profile: { level: 2 } },
      { profile: "text" },
    ]);
    collection.createIndex({ field: "profile.level" });

    expect([...collection.find({ "profile.level": 2 })]).toHaveLength(2);
    expect(collection.explain({ "profile.level": 2 }).stage).toBe("IXSCAN");
    valid(collection);
  });

  it("can be created on a collection with no documents", () => {
    const collection = new InMemoryCollection();

    expect(collection.createIndex({ field: "a", unique: true }).created).toBe(
      true,
    );

    collection.insertOne({ a: 1 });

    expectCode(
      () => collection.insertOne({ a: 1 }),
      StorageErrorCode.DuplicateKey,
    );
  });
});

describe("query planning", () => {
  it("scans when there is no usable index", () => {
    const collection = people();

    expect(collection.explain({ age: 20 })).toMatchObject({
      stage: "COLLSCAN",
      documents: 20,
    });

    collection.createIndex({ field: "age" });

    expect(collection.explain({ name: "person-1" }).stage).toBe("COLLSCAN");
    expect(collection.explain({}).stage).toBe("COLLSCAN");
    expect(collection.explain({ $or: [{ age: 20 }, { age: 21 }] }).stage).toBe(
      "COLLSCAN",
    );
  });

  it("uses an index for equality", () => {
    const collection = people();

    collection.createIndex({ field: "name" });

    expect(collection.explain({ name: "person-3" })).toMatchObject({
      stage: "IXSCAN",
      index: "name_1",
      field: "name",
      access: "equality",
      estimatedCandidates: 1,
    });
    expect(collection.explain({ name: { $eq: "person-3" } }).stage).toBe(
      "IXSCAN",
    );
  });

  it("uses an index for ranges and reports the bounds", () => {
    const collection = people();

    collection.createIndex({ field: "name" });

    expect(
      collection.explain({ name: { $gte: "person-10", $lt: "person-12" } }),
    ).toMatchObject({
      stage: "IXSCAN",
      access: "range",
      lower: { value: "person-10", inclusive: true },
      upper: { value: "person-12", inclusive: false },
    });
  });

  it("uses an index for $in", () => {
    const collection = people();

    collection.createIndex({ field: "name" });

    expect(
      collection.explain({ name: { $in: ["person-1", "person-2"] } }),
    ).toMatchObject({ stage: "IXSCAN", access: "in", estimatedCandidates: 2 });
  });

  it("does not use an index once an array value is indexed", () => {
    const collection = new InMemoryCollection();

    collection.insertMany(
      Array.from({ length: 10 }, (_, index) => ({ tag: `t${index}` })),
    );
    collection.createIndex({ field: "tag" });

    expect(collection.explain({ tag: { $in: ["t1"] } }).stage).toBe("IXSCAN");

    collection.insertOne({ tag: ["t1", "t2"] });

    expect(collection.explain({ tag: { $in: ["t1"] } }).stage).toBe("COLLSCAN");
    expect([...collection.find({ tag: { $in: ["t2"] } })]).toHaveLength(2);
    expect(collection.explain({ tag: "t1" }).stage).toBe("COLLSCAN");
    expect([...collection.find({ tag: "t1" })]).toHaveLength(2);
    expect(collection.explain({ tag: { $gt: "t1" } }).stage).toBe("COLLSCAN");

    collection.deleteOne({ tag: ["t1", "t2"] });

    expect(collection.explain({ tag: "t1" }).stage).toBe("IXSCAN");
  });

  it("does not use an index on a path that runs through an array", () => {
    const collection = new InMemoryCollection();

    collection.insertMany(
      Array.from({ length: 10 }, (_, index) => ({
        item: { sku: `s${index}` },
      })),
    );
    collection.createIndex({ field: "item.sku" });

    expect(collection.explain({ "item.sku": "s1" }).stage).toBe("IXSCAN");

    collection.insertOne({ item: [{ sku: "s1" }, { sku: "s2" }] });

    expect(collection.explain({ "item.sku": "s1" }).stage).toBe("COLLSCAN");
    expect([...collection.find({ "item.sku": "s2" })]).toHaveLength(2);
  });

  it("uses the _id index for _id lookups", () => {
    const collection = people();
    const id = (all(collection)[3] as Document)["_id"] as CustomId;

    expect(collection.explain({ _id: id })).toMatchObject({
      stage: "IDLOOKUP",
      index: "_id_",
      estimatedCandidates: 1,
    });
    expect(
      collection.explain({ _id: { $in: [id, CustomId.generate()] } }),
    ).toMatchObject({
      stage: "IDLOOKUP",
      estimatedCandidates: 2,
    });
    expect(collection.explain({ _id: "not an id" })).toMatchObject({
      stage: "IDLOOKUP",
      estimatedCandidates: 0,
    });
    expect([...collection.find({ _id: id })]).toHaveLength(1);
  });

  it("picks the most selective index", () => {
    const collection = people();

    collection.createIndex({ field: "team" });
    collection.createIndex({ field: "name" });

    expect(collection.explain({ team: "red", name: "person-2" })).toMatchObject(
      {
        stage: "IXSCAN",
        index: "name_1",
      },
    );
  });

  it("looks inside $and but not $or", () => {
    const collection = people();

    collection.createIndex({ field: "name" });

    expect(
      collection.explain({ $and: [{ team: "red" }, { name: "person-2" }] })
        .stage,
    ).toBe("IXSCAN");
    expect(
      collection.explain({ $or: [{ name: "person-2" }, { name: "person-4" }] })
        .stage,
    ).toBe("COLLSCAN");
  });

  it("falls back to a scan when an index would not narrow the search", () => {
    const collection = new InMemoryCollection();

    collection.insertMany(
      Array.from({ length: 10 }, (_, index) => ({ kind: "same", n: index })),
    );
    collection.createIndex({ field: "kind" });
    collection.createIndex({ field: "n" });

    expect(collection.explain({ kind: "same" }).stage).toBe("COLLSCAN");
    expect(collection.explain({ n: { $gte: 0 } }).stage).toBe("COLLSCAN");
    expect(collection.explain({ n: { $gte: 5 } }).stage).toBe("IXSCAN");
  });

  it("does not use an index for operators it cannot serve", () => {
    const collection = people();

    collection.createIndex({ field: "name" });

    for (const filter of [
      { name: { $ne: "person-1" } },
      { name: { $nin: ["person-1"] } },
      { name: { $exists: true } },
      { name: { $not: { $eq: "person-1" } } },
      { $nor: [{ name: "person-1" }] },
    ]) {
      expect(collection.explain(filter).stage, JSON.stringify(filter)).toBe(
        "COLLSCAN",
      );
    }
  });

  it("validates the filter before planning", () => {
    expectCode(
      () => people().explain({ age: { $around: 1 } }),
      StorageErrorCode.InvalidFilter,
    );
  });

  it("does not use ranges that mix kinds of value", () => {
    const collection = people();

    collection.createIndex({ field: "name" });

    expect(
      collection.explain({ name: { $gt: "person-1", $lt: 5 } }).stage,
    ).toBe("COLLSCAN");
    expect([...collection.find({ name: { $gt: "person-1", $lt: 5 } })]).toEqual(
      [],
    );
  });
});

describe("indexed queries return what a scan returns", () => {
  function twin(): { indexed: InMemoryCollection; plain: InMemoryCollection } {
    const documents: Document[] = Array.from({ length: 60 }, (_, index) => ({
      _id: CustomId.generate(),
      n: index % 7,
      s: `s${index % 11}`,
      ...(index % 5 === 0 ? {} : { opt: index % 3 }),
    }));
    const indexed = new InMemoryCollection();
    const plain = new InMemoryCollection();

    indexed.insertMany(documents);
    plain.insertMany(documents);
    indexed.createIndex({ field: "n" });
    indexed.createIndex({ field: "s" });
    indexed.createIndex({ field: "opt" });

    return { indexed, plain };
  }

  it("returns the same documents in the same order", () => {
    const { indexed, plain } = twin();

    for (const filter of [
      { n: 3 },
      { s: "s4" },
      { n: { $gte: 2, $lt: 5 } },
      { n: { $in: [1, 6, 99] } },
      { s: { $in: ["s1", "s2"] }, n: { $lt: 4 } },
      { opt: 1 },
      { opt: { $gt: 0 } },
      { $and: [{ n: { $gt: 1 } }, { s: "s3" }] },
      { n: { $gt: 100 } },
    ]) {
      expect([...indexed.find(filter)], JSON.stringify(filter)).toEqual([
        ...plain.find(filter),
      ]);
    }
  });

  it("keeps insertion order after deletes, updates, and re-inserts", () => {
    const { indexed, plain } = twin();

    for (const collection of [indexed, plain]) {
      collection.deleteMany({ s: "s3" });
      collection.updateMany({ n: 2 }, { $set: { n: 4 } });
      collection.insertMany(
        Array.from({ length: 6 }, (_, index) => ({
          _id: CustomId.fromBytes(new Uint8Array(16).fill(index + 1)),
          n: index,
          s: "s3",
        })),
      );
    }

    for (const filter of [{ n: 4 }, { s: "s3" }, { n: { $lte: 2 } }]) {
      expect([...indexed.find(filter)], JSON.stringify(filter)).toEqual([
        ...plain.find(filter),
      ]);
    }

    valid(indexed);
  });

  it("applies skip, limit, and sort on top of an index", () => {
    const { indexed, plain } = twin();
    const options = {
      sort: [["s", -1]] as [string, 1 | -1][],
      skip: 2,
      limit: 5,
    };

    expect([...indexed.find({ n: { $lt: 5 } }, options)]).toEqual([
      ...plain.find({ n: { $lt: 5 } }, options),
    ]);
    expect([...indexed.find({ n: 3 }, { skip: 1, limit: 2 })]).toEqual([
      ...plain.find({ n: 3 }, { skip: 1, limit: 2 }),
    ]);
  });

  it("uses indexes for findOne, updates, and deletes", () => {
    const { indexed, plain } = twin();

    expect(indexed.findOne({ s: "s5" })).toEqual(plain.findOne({ s: "s5" }));
    expect(indexed.updateOne({ s: "s6" }, { $set: { hit: 1 } })).toEqual(
      plain.updateOne({ s: "s6" }, { $set: { hit: 1 } }),
    );
    expect(indexed.deleteOne({ n: 6 })).toEqual(plain.deleteOne({ n: 6 }));
    expect(indexed.updateMany({ n: { $lt: 3 } }, { $inc: { n: 10 } })).toEqual(
      plain.updateMany({ n: { $lt: 3 } }, { $inc: { n: 10 } }),
    );
    expect(indexed.deleteMany({ s: { $in: ["s1", "s2"] } })).toEqual(
      plain.deleteMany({ s: { $in: ["s1", "s2"] } }),
    );
    expect(all(indexed)).toEqual(all(plain));
    valid(indexed);
  });

  it("matches whole values, and array elements, the way a scan does", () => {
    const collection = new InMemoryCollection();

    collection.insertMany([
      { v: [1, 2] },
      { v: [2, 1] },
      { v: { a: 1 } },
      { v: 1 },
      { v: null },
      { w: 1 },
    ]);
    collection.createIndex({ field: "v" });

    expect([...collection.find({ v: [1, 2] })]).toHaveLength(1);
    expect([...collection.find({ v: { a: 1 } })]).toHaveLength(1);
    expect([...collection.find({ v: null })]).toHaveLength(1);
    expect([...collection.find({ v: 1 })]).toHaveLength(3);
  });
});

describe("unique indexes", () => {
  it("rejects duplicate values on insert and leaves everything unchanged", () => {
    const collection = new InMemoryCollection();

    collection.createIndex({ field: "email", unique: true });
    collection.insertOne({ email: "a@example.com" });

    const error = expectCode(
      () => collection.insertOne({ email: "a@example.com" }),
      StorageErrorCode.DuplicateKey,
    );

    expect(error.message).toContain("email_1");
    expect(error.message).toContain("a@example.com");
    expect(collection.documentCount).toBe(1);
    valid(collection);
  });

  it("allows one document without the field, or many when sparse", () => {
    const dense = new InMemoryCollection();
    const sparse = new InMemoryCollection();

    dense.createIndex({ field: "a", unique: true });
    sparse.createIndex({ field: "a", unique: true, sparse: true });

    dense.insertOne({ b: 1 });
    sparse.insertMany([{ b: 1 }, { b: 2 }, { b: 3 }]);

    expectCode(() => dense.insertOne({ b: 2 }), StorageErrorCode.DuplicateKey);
    expect(sparse.documentCount).toBe(3);
    valid(dense);
    valid(sparse);
  });

  it("treats null and a missing field as different", () => {
    const collection = new InMemoryCollection();

    collection.createIndex({ field: "a", unique: true });
    collection.insertMany([{ a: null }, { b: 1 }]);

    expectCode(
      () => collection.insertOne({ a: null }),
      StorageErrorCode.DuplicateKey,
    );
    expectCode(
      () => collection.insertOne({ c: 1 }),
      StorageErrorCode.DuplicateKey,
    );
  });

  it("keeps the inserted prefix when insertMany hits a duplicate", () => {
    const collection = new InMemoryCollection();

    collection.createIndex({ field: "a", unique: true });

    try {
      collection.insertMany([{ a: 1 }, { a: 2 }, { a: 1 }, { a: 3 }]);
      throw new Error("Expected a failure.");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(StorageInsertManyError);
      expect((error as StorageInsertManyError).insertedIds).toHaveLength(2);
      expect((error as StorageInsertManyError).failedIndex).toBe(2);
    }

    expect(all(collection).map((document) => document["a"])).toEqual([1, 2]);
    valid(collection);
    collection.insertOne({ a: 3 });
  });

  it("rejects an update that creates a duplicate and changes nothing", () => {
    const collection = new InMemoryCollection();

    collection.createIndex({ field: "a", unique: true });
    collection.insertMany([{ a: 1 }, { a: 2 }]);

    expectCode(
      () => collection.updateOne({ a: 2 }, { $set: { a: 1 } }),
      StorageErrorCode.DuplicateKey,
    );
    expect(all(collection).map((document) => document["a"])).toEqual([1, 2]);
    valid(collection);
  });

  it("applies a multi-document update as a whole", () => {
    const collection = new InMemoryCollection();

    collection.createIndex({ field: "a", unique: true });
    collection.insertMany([{ a: 1 }, { a: 2 }, { a: 3 }]);

    expect(collection.updateMany({}, { $inc: { a: 1 } })).toMatchObject({
      modifiedCount: 3,
    });
    expect(all(collection).map((document) => document["a"])).toEqual([2, 3, 4]);

    expectCode(
      () => collection.updateMany({ a: { $gt: 2 } }, { $set: { a: 9 } }),
      StorageErrorCode.DuplicateKey,
    );
    expect(all(collection).map((document) => document["a"])).toEqual([2, 3, 4]);
    valid(collection);
  });

  it("rejects replacements and upserts that create duplicates", () => {
    const collection = new InMemoryCollection();

    collection.createIndex({ field: "a", unique: true });
    collection.insertMany([{ a: 1 }, { a: 2 }]);

    expectCode(
      () => collection.replaceOne({ a: 2 }, { a: 1 }),
      StorageErrorCode.DuplicateKey,
    );
    expectCode(
      () =>
        collection.updateOne({ k: 1 }, { $set: { a: 1 } }, { upsert: true }),
      StorageErrorCode.DuplicateKey,
    );
    expectCode(
      () => collection.replaceOne({ k: 1 }, { a: 2 }, { upsert: true }),
      StorageErrorCode.DuplicateKey,
    );
    expect(collection.documentCount).toBe(2);
    valid(collection);
  });

  it("frees a value when its document is deleted or changed", () => {
    const collection = new InMemoryCollection();

    collection.createIndex({ field: "a", unique: true });
    collection.insertMany([{ a: 1 }, { a: 2 }]);
    collection.deleteOne({ a: 1 });
    collection.insertOne({ a: 1 });
    collection.updateOne({ a: 2 }, { $set: { a: 3 } });
    collection.insertOne({ a: 2 });

    expect(collection.documentCount).toBe(3);
    valid(collection);
  });

  it("does not conflict with itself when an update leaves the value alone", () => {
    const collection = new InMemoryCollection();

    collection.createIndex({ field: "a", unique: true });
    collection.insertOne({ a: 1, b: 1 });

    expect(
      collection.updateOne({ a: 1 }, { $set: { b: 2 } }).modifiedCount,
    ).toBe(1);
    expect(collection.replaceOne({ a: 1 }, { a: 1, b: 3 }).modifiedCount).toBe(
      1,
    );
  });

  it("refuses to build a unique index over existing duplicates", () => {
    const collection = new InMemoryCollection();

    collection.insertMany([{ a: 1 }, { a: 1 }]);

    expectCode(
      () => collection.createIndex({ field: "a", unique: true }),
      StorageErrorCode.DuplicateKey,
    );
    expect(collection.listIndexes()).toHaveLength(1);

    collection.createIndex({ field: "a" });
    valid(collection);
  });

  it("refuses to build a unique index over several documents without the field", () => {
    const collection = new InMemoryCollection();

    collection.insertMany([{ b: 1 }, { b: 2 }]);

    expectCode(
      () => collection.createIndex({ field: "a", unique: true }),
      StorageErrorCode.DuplicateKey,
    );
    expect(
      collection.createIndex({ field: "a", unique: true, sparse: true })
        .created,
    ).toBe(true);
  });
});

describe("indexes and failed writes", () => {
  function failingJournal(): {
    journal: CollectionJournal;
    fail: { value: boolean };
  } {
    const fail = { value: false };

    return {
      fail,
      journal: {
        commit: () => {
          if (fail.value) {
            throw new StorageError(StorageErrorCode.Io, "disk full");
          }
        },
      },
    };
  }

  it("leaves indexes untouched when the journal rejects a write", () => {
    const { journal, fail } = failingJournal();
    const collection = new InMemoryCollection({ journal });

    collection.createIndex({ field: "a", unique: true });
    collection.insertMany([{ a: 1 }, { a: 2 }, { a: 3 }]);
    fail.value = true;

    expectCode(() => collection.insertOne({ a: 4 }), StorageErrorCode.Io);
    expectCode(
      () => collection.insertMany([{ a: 5 }, { a: 6 }]),
      StorageErrorCode.Io,
    );
    expectCode(() => collection.deleteOne({ a: 1 }), StorageErrorCode.Io);
    expectCode(() => collection.deleteMany({}), StorageErrorCode.Io);
    expectCode(
      () => collection.updateOne({ a: 2 }, { $set: { a: 20 } }),
      StorageErrorCode.Io,
    );
    expectCode(
      () => collection.updateMany({}, { $inc: { a: 10 } }),
      StorageErrorCode.Io,
    );
    expectCode(
      () => collection.replaceOne({ a: 3 }, { a: 30 }),
      StorageErrorCode.Io,
    );

    fail.value = false;

    expect(all(collection).map((document) => document["a"])).toEqual([1, 2, 3]);
    valid(collection);

    collection.insertOne({ a: 4 });
    collection.updateOne({ a: 1 }, { $set: { a: 10 } });
    valid(collection);
  });

  it("does not leave a stale unique entry after a failed insert", () => {
    const { journal, fail } = failingJournal();
    const collection = new InMemoryCollection({ journal });

    collection.createIndex({ field: "a", unique: true });
    fail.value = true;
    expectCode(() => collection.insertOne({ a: 1 }), StorageErrorCode.Io);
    fail.value = false;

    collection.insertOne({ a: 1 });

    expect(collection.documentCount).toBe(1);
  });
});

describe("index validation", () => {
  type Internals = {
    indexes: {
      get(name: string):
        | {
            add(key: string, document: Document): void;
            remove(key: string, document: Document): void;
          }
        | undefined;
    };
  };

  function internals(collection: InMemoryCollection): Internals {
    return collection as unknown as Internals;
  }

  it("reports a healthy index as valid", () => {
    const collection = people();

    collection.createIndex({ field: "age" });
    collection.createIndex({ field: "name", unique: true });

    expect(collection.validateIndexes()).toEqual({
      valid: true,
      indexes: 2,
      documents: 20,
      issues: [],
    });
  });

  it("is valid with no indexes", () => {
    expect(people().validateIndexes()).toMatchObject({
      valid: true,
      indexes: 0,
    });
  });

  it("detects an entry that is missing from an index", () => {
    const collection = people();

    collection.createIndex({ field: "age" });

    const stored = all(collection)[0] as Document;

    internals(collection)
      .indexes.get("age_1")
      ?.remove((stored["_id"] as CustomId).toHexString(), stored);

    const report = collection.validateIndexes();

    expect(report.valid).toBe(false);
    expect(report.issues.map((issue) => issue.problem)).toContain(
      "document-count",
    );
  });

  it("detects an entry for a document that does not exist", () => {
    const collection = people();

    collection.createIndex({ field: "age" });
    internals(collection).indexes.get("age_1")?.add("ghost", { age: 999 });

    const report = collection.validateIndexes();

    expect(report.valid).toBe(false);
    expect(report.issues.map((issue) => issue.problem)).toContain(
      "unexpected-entry",
    );
  });

  it("detects documents filed under the wrong value", () => {
    const collection = people();

    collection.createIndex({ field: "age" });

    const stored = all(collection)[0] as Document;
    const key = (stored["_id"] as CustomId).toHexString();
    const index = internals(collection).indexes.get("age_1");

    index?.remove(key, stored);
    index?.add(key, { ...stored, age: 777 });

    const report = collection.validateIndexes();

    expect(report.valid).toBe(false);
    expect(report.issues.length).toBeGreaterThan(0);
  });
});

describe("recovered documents", () => {
  it("builds indexes from the documents it is given", () => {
    const source = people();
    const documents = new Map(source.entries());
    const collection = new InMemoryCollection({
      documents,
      indexes: [
        {
          name: "age_1",
          field: "age",
          direction: 1,
          unique: false,
          sparse: false,
        },
      ],
    });

    expect(collection.explain({ age: 20 }).stage).toBe("IXSCAN");
    expect([...collection.find({ age: 20 })]).toEqual([
      ...source.find({ age: 20 }),
    ]);
    valid(collection);
  });

  it("clears indexes with the documents", () => {
    const collection = people();

    collection.createIndex({ field: "age" });
    collection.clear();

    expect(collection.documentCount).toBe(0);
    expect(collection.listIndexes()).toHaveLength(1);
  });
});
