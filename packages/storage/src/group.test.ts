import type { Document } from "sinterdb-protocol";
import { describe, expect, it } from "vitest";

import { compilePipeline } from "./aggregation.js";
import { StorageError, StorageErrorCode } from "./errors.js";
import { MAX_GROUPS, MAX_GROUP_KEY_FIELDS } from "./group.js";
import { InMemoryCollection } from "./in-memory-collection.js";

function people(): InMemoryCollection {
  const collection = new InMemoryCollection();

  collection.insertMany([
    { name: "ada", age: 36, team: "a", pay: 10, address: { city: "x" } },
    { name: "bob", age: 29, team: "b", pay: 20, address: { city: "y" } },
    { name: "cyd", age: 36, team: "a", pay: 30, address: { city: "x" } },
    { name: "dee", age: 41, team: "b", pay: 40 },
    { name: "eli", age: 29, team: "a", address: { city: "y" } },
    { name: "fay", team: "b", pay: "n/a" },
  ]);

  return collection;
}

function group(spec: Document, ...after: Document[]): Document[] {
  return [...people().aggregate([{ $group: spec }, ...after])];
}

function invalid(pipeline: unknown): string {
  try {
    compilePipeline(pipeline as Document[]);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(StorageError);
    expect((error as StorageError).code).toBe(StorageErrorCode.InvalidPipeline);

    return (error as StorageError).message;
  }

  throw new Error("Expected an invalid pipeline.");
}

function failsWhenRun(pipeline: Document[], source: Document[]): string {
  try {
    [...compilePipeline(pipeline).run(source)];
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(StorageError);
    expect((error as StorageError).code).toBe(StorageErrorCode.InvalidPipeline);

    return (error as StorageError).message;
  }

  throw new Error("Expected the pipeline to fail.");
}

describe("$group keys", () => {
  it("groups by a field, in order of first appearance", () => {
    expect(group({ _id: "$team", n: { $count: {} } })).toEqual([
      { _id: "a", n: 3 },
      { _id: "b", n: 3 },
    ]);
  });

  it("puts everything in one group for a null or literal key", () => {
    expect(group({ _id: null, n: { $count: {} } })).toEqual([
      { _id: null, n: 6 },
    ]);
    expect(group({ _id: "all", n: { $count: {} } })).toEqual([
      { _id: "all", n: 6 },
    ]);
  });

  it("groups documents that lack the field under null", () => {
    expect(group({ _id: "$age", n: { $count: {} } })).toEqual([
      { _id: 36, n: 2 },
      { _id: 29, n: 2 },
      { _id: 41, n: 1 },
      { _id: null, n: 1 },
    ]);
  });

  it("reads nested paths", () => {
    expect(group({ _id: "$address.city", n: { $count: {} } })).toEqual([
      { _id: "x", n: 2 },
      { _id: "y", n: 2 },
      { _id: null, n: 2 },
    ]);
  });

  it("builds a compound key", () => {
    expect(
      group({ _id: { team: "$team", age: "$age" }, n: { $count: {} } }),
    ).toEqual([
      { _id: { team: "a", age: 36 }, n: 2 },
      { _id: { team: "b", age: 29 }, n: 1 },
      { _id: { team: "b", age: 41 }, n: 1 },
      { _id: { team: "a", age: 29 }, n: 1 },
      { _id: { team: "b", age: null }, n: 1 },
    ]);
  });

  it("allows literals inside a compound key", () => {
    expect(group({ _id: { kind: "person", team: "$team" } })).toEqual([
      { _id: { kind: "person", team: "a" } },
      { _id: { kind: "person", team: "b" } },
    ]);
  });

  it("keeps values of different types in different groups", () => {
    const source = [{ v: 1 }, { v: 1n }, { v: 0 }, { v: -0 }, { v: "1" }];
    const out = [
      ...compilePipeline([{ $group: { _id: "$v", n: { $count: {} } } }]).run(
        source,
      ),
    ];

    expect(out.map((entry) => entry["n"])).toEqual([1, 1, 1, 1, 1]);
  });

  it("treats NaN as one group", () => {
    const out = [
      ...compilePipeline([{ $group: { _id: "$v", n: { $count: {} } } }]).run([
        { v: Number.NaN },
        { v: Number.NaN },
      ]),
    ];

    expect(out).toHaveLength(1);
    expect(out[0]?.["n"]).toBe(2);
  });

  it("yields nothing for no input", () => {
    expect([
      ...compilePipeline([{ $group: { _id: null, n: { $count: {} } } }]).run(
        [],
      ),
    ]).toEqual([]);
  });
});

describe("$group accumulators", () => {
  it("counts, sums and averages", () => {
    expect(
      group({
        _id: "$team",
        n: { $count: {} },
        total: { $sum: "$pay" },
        mean: { $avg: "$pay" },
        ones: { $sum: 1 },
      }),
    ).toEqual([
      { _id: "a", n: 3, total: 40, mean: 20, ones: 3 },
      { _id: "b", n: 3, total: 60, mean: 30, ones: 3 },
    ]);
  });

  it("sums to 0 and averages to null when nothing is numeric", () => {
    expect(
      group({
        _id: "$team",
        total: { $sum: "$missing" },
        mean: { $avg: "$missing" },
      }),
    ).toEqual([
      { _id: "a", total: 0, mean: null },
      { _id: "b", total: 0, mean: null },
    ]);
  });

  it("sums bigint values as bigint", () => {
    const out = [
      ...compilePipeline([
        { $group: { _id: null, total: { $sum: "$v" } } },
      ]).run([{ v: 5n }, { v: 7n }, { v: "x" }]),
    ];

    expect(out).toEqual([{ _id: null, total: 12n }]);
  });

  it("rejects mixing numbers and bigint in a $sum, in either order", () => {
    const pipeline = [{ $group: { _id: null, total: { $sum: "$v" } } }];

    expect(failsWhenRun(pipeline, [{ v: 1 }, { v: 2n }])).toContain("bigint");
    expect(failsWhenRun(pipeline, [{ v: 2n }, { v: 1 }])).toContain("bigint");
  });

  it("rejects a bigint $sum that leaves the 64-bit range", () => {
    const pipeline = [{ $group: { _id: null, total: { $sum: "$v" } } }];
    const big = 2n ** 62n * 2n - 1n;

    expect(failsWhenRun(pipeline, [{ v: big }, { v: 1n }])).toContain("64-bit");
    expect(failsWhenRun(pipeline, [{ v: -big - 1n }, { v: -1n }])).toContain(
      "64-bit",
    );
  });

  it("accepts bigint sums that reach the 64-bit limits exactly", () => {
    const pipeline = [{ $group: { _id: null, total: { $sum: "$v" } } }];
    const max = 2n ** 63n - 1n;
    const min = -(2n ** 63n);

    expect([...compilePipeline(pipeline).run([{ v: max }])]).toEqual([
      { _id: null, total: max },
    ]);
    expect([...compilePipeline(pipeline).run([{ v: min }])]).toEqual([
      { _id: null, total: min },
    ]);
  });

  it("rejects bigint values in $avg", () => {
    expect(
      failsWhenRun(
        [{ $group: { _id: null, mean: { $avg: "$v" } } }],
        [{ v: 1n }],
      ),
    ).toContain("$avg");
  });

  it("finds the smallest and largest by sort order", () => {
    expect(
      group({
        _id: "$team",
        youngest: { $min: "$age" },
        oldest: { $max: "$age" },
        firstPay: { $min: "$pay" },
        lastPay: { $max: "$pay" },
      }),
    ).toEqual([
      { _id: "a", youngest: 29, oldest: 36, firstPay: 10, lastPay: 30 },
      { _id: "b", youngest: 29, oldest: 41, firstPay: 20, lastPay: "n/a" },
    ]);
  });

  it("lets null take part in $min, but not a missing field", () => {
    const source = [{ v: 3 }, {}, { v: null }, { v: 2 }];
    const min = [
      ...compilePipeline([{ $group: { _id: null, r: { $min: "$v" } } }]).run(
        source,
      ),
    ];
    const max = [
      ...compilePipeline([{ $group: { _id: null, r: { $max: "$v" } } }]).run(
        source,
      ),
    ];

    expect(min).toEqual([{ _id: null, r: null }]);
    expect(max).toEqual([{ _id: null, r: 3 }]);
    expect([
      ...compilePipeline([{ $group: { _id: null, r: { $min: "$v" } } }]).run([
        {},
      ]),
    ]).toEqual([{ _id: null, r: null }]);
  });

  it("keeps the earlier value when $min and $max tie", () => {
    const out = [
      ...compilePipeline([
        {
          $group: {
            _id: null,
            lo: { $min: "$v" },
            hi: { $max: "$v" },
          },
        },
      ]).run([{ v: [1] }, { v: [1] }]),
    ];

    expect(out).toEqual([{ _id: null, lo: [1], hi: [1] }]);
  });

  it("takes the first and last value in arrival order", () => {
    expect(
      group({
        _id: "$team",
        first: { $first: "$name" },
        last: { $last: "$name" },
      }),
    ).toEqual([
      { _id: "a", first: "ada", last: "eli" },
      { _id: "b", first: "bob", last: "fay" },
    ]);
  });

  it("gives null for $first and $last of a missing field", () => {
    expect(
      group({
        _id: "$team",
        first: { $first: "$address.city" },
        last: { $last: "$address.city" },
      }),
    ).toEqual([
      { _id: "a", first: "x", last: "y" },
      { _id: "b", first: "y", last: null },
    ]);
  });

  it("uses the first document even when its field is missing", () => {
    const out = [
      ...compilePipeline([
        { $group: { _id: null, first: { $first: "$v" } } },
      ]).run([{}, { v: 1 }]),
    ];

    expect(out).toEqual([{ _id: null, first: null }]);
  });

  it("runs with later stages", () => {
    expect(
      group(
        { _id: "$team", n: { $count: {} } },
        { $sort: [["n", -1]] },
        { $limit: 1 },
      ),
    ).toEqual([{ _id: "a", n: 3 }]);
  });

  it("uses an index for a leading $match", () => {
    const collection = people();

    collection.createIndex({ name: "team", keys: [["team", 1]] });

    expect([
      ...collection.aggregate([
        { $match: { team: "a" } },
        { $group: { _id: "$team", n: { $count: {} } } },
      ]),
    ]).toEqual([{ _id: "a", n: 3 }]);
  });
});

describe("$group limits", () => {
  it("fails when there are more groups than the limit", () => {
    const source = function* () {
      for (let value = 0; value <= MAX_GROUPS; value += 1) {
        yield { v: value };
      }
    };

    expect(failsWhenRun([{ $group: { _id: "$v" } }], [...source()])).toContain(
      String(MAX_GROUPS),
    );
  });

  it("allows exactly the limit", () => {
    const source: Document[] = [];

    for (let value = 0; value < MAX_GROUPS; value += 1) {
      source.push({ v: value });
    }

    expect([
      ...compilePipeline([{ $group: { _id: "$v" } }]).run(source),
    ]).toHaveLength(MAX_GROUPS);
  });
});

describe("$group validation", () => {
  it("needs a document with an _id", () => {
    expect(invalid([{ $group: 5 }])).toContain("needs a document");
    expect(invalid([{ $group: [] }])).toContain("needs a document");
    expect(invalid([{ $group: { n: { $count: {} } } }])).toContain('"_id"');
  });

  it("checks key expressions", () => {
    expect(invalid([{ $group: { _id: "$" } }])).toContain("not a valid path");
    expect(invalid([{ $group: { _id: "$$x" } }])).toContain("not a valid path");
    expect(invalid([{ $group: { _id: "$a..b" } }])).toContain(
      "not a valid path",
    );
    expect(invalid([{ $group: { _id: "$a.$b" } }])).toContain(
      "not a valid path",
    );
    expect(invalid([{ $group: { _id: [1] } }])).toContain("not an array");
    expect(invalid([{ $group: { _id: {} } }])).toContain("1 to");
    expect(invalid([{ $group: { _id: { a: { b: 1 } } } }])).toContain(
      "not an array or a document",
    );
  });

  it("limits compound key size and checks its names", () => {
    const fields: Document = {};

    for (let index = 0; index <= MAX_GROUP_KEY_FIELDS; index += 1) {
      fields[`f${index}`] = `$f${index}`;
    }

    expect(invalid([{ $group: { _id: fields } }])).toContain("1 to");

    const allowed: Document = {};

    for (let index = 0; index < MAX_GROUP_KEY_FIELDS; index += 1) {
      allowed[`f${index}`] = `$f${index}`;
    }

    expect(() => compilePipeline([{ $group: { _id: allowed } }])).not.toThrow();
    expect(invalid([{ $group: { _id: { "a.b": "$x" } } }])).toContain(
      "must not be empty",
    );
    expect(invalid([{ $group: { _id: { $a: "$x" } } }])).toContain(
      "must not be empty",
    );
  });

  it("checks output names", () => {
    for (const name of ["", "$n", "a.b", "__proto__"]) {
      const spec = Object.fromEntries([
        ["_id", null],
        [name, { $count: {} }],
      ]);

      expect(invalid([{ $group: spec }])).toContain("must not be empty");
    }
  });

  it("checks accumulators", () => {
    const check = (value: unknown) =>
      invalid([{ $group: { _id: null, n: value } }]);

    expect(check(5)).toContain("needs an accumulator");
    expect(check({})).toContain("exactly one accumulator");
    expect(check({ $sum: "$a", $max: "$a" })).toContain("exactly one");
    expect(check({ $push: "$a" })).toContain("not a supported accumulator");
    expect(check({ sum: "$a" })).toContain("not a supported accumulator");
    expect(check({ $count: 1 })).toContain("empty document");
    expect(check({ $count: { a: 1 } })).toContain("empty document");
    expect(check({ $sum: [1] })).toContain("not an array");
    expect(check({ $sum: { a: 1 } })).toContain("not an array or a document");
    expect(check({ $sum: "$$a" })).toContain("not a valid path");
  });

  it("validates for a missing collection and before reading documents", () => {
    expect(() => new InMemoryCollection().aggregate([{ $group: 5 }])).toThrow(
      StorageError,
    );
  });

  it("accepts a null-prototype group document", () => {
    const spec = Object.create(null) as Document;

    spec["_id"] = "$team";
    spec["n"] = { $count: {} };

    expect([...people().aggregate([{ $group: spec }])]).toHaveLength(2);
  });
});
