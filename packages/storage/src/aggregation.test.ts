import type { Document } from "sinterdb-protocol";
import { describe, expect, it } from "vitest";

import { compilePipeline, MAX_PIPELINE_STAGES } from "./aggregation.js";
import { StorageError, StorageErrorCode } from "./errors.js";
import { InMemoryCollection } from "./in-memory-collection.js";
import { compileSort, compileTopN } from "./sort.js";

function people(): InMemoryCollection {
  const collection = new InMemoryCollection();

  collection.insertMany([
    { name: "ada", age: 36, team: "a", tags: ["x"] },
    { name: "bob", age: 29, team: "b" },
    { name: "cyd", age: 36, team: "a" },
    { name: "dee", age: 41, team: "b" },
    { name: "eli", age: 29, team: "a" },
    { name: "fay", team: "b" },
  ]);

  return collection;
}

function run(collection: InMemoryCollection, pipeline: Document[]) {
  return [...collection.aggregate(pipeline)];
}

function names(documents: Document[]) {
  return documents.map((document) => document["name"]);
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

describe("aggregation stages", () => {
  it("returns every document for an empty pipeline", () => {
    expect(names(run(people(), []))).toEqual([
      "ada",
      "bob",
      "cyd",
      "dee",
      "eli",
      "fay",
    ]);
  });

  it("filters with $match, at the start and later", () => {
    const collection = people();

    expect(names(run(collection, [{ $match: { team: "a" } }]))).toEqual([
      "ada",
      "cyd",
      "eli",
    ]);
    expect(
      names(
        run(collection, [
          { $match: { team: "a" } },
          { $match: { age: { $gt: 30 } } },
        ]),
      ),
    ).toEqual(["ada", "cyd"]);
    expect(
      names(
        run(collection, [
          { $project: { name: 1, age: 1 } },
          { $match: { age: 29 } },
        ]),
      ),
    ).toEqual(["bob", "eli"]);
  });

  it("uses an index for a leading $match", () => {
    const collection = people();

    collection.createIndex({ field: "team" });

    expect(
      names(run(collection, [{ $match: { team: "b" } }, { $limit: 2 }])),
    ).toEqual(["bob", "dee"]);
  });

  it("reshapes documents with $project", () => {
    const projected = run(people(), [
      { $project: { _id: 0, name: 1 } },
      { $limit: 2 },
    ]);

    expect(projected).toEqual([{ name: "ada" }, { name: "bob" }]);
  });

  it("sorts with $sort, keeping the order of equal documents", () => {
    const collection = people();

    expect(
      names(
        run(collection, [{ $sort: [["age", 1]] }, { $project: { name: 1 } }]),
      ),
    ).toEqual(["fay", "bob", "eli", "ada", "cyd", "dee"]);
    expect(
      names(
        run(collection, [
          {
            $sort: [
              ["age", -1],
              ["name", -1],
            ],
          },
        ]),
      ),
    ).toEqual(["dee", "cyd", "ada", "eli", "bob", "fay"]);
  });

  it("skips and limits", () => {
    const collection = people();

    expect(names(run(collection, [{ $skip: 4 }]))).toEqual(["eli", "fay"]);
    expect(names(run(collection, [{ $limit: 2 }]))).toEqual(["ada", "bob"]);
    expect(names(run(collection, [{ $skip: 1 }, { $limit: 2 }]))).toEqual([
      "bob",
      "cyd",
    ]);
    expect(names(run(collection, [{ $skip: 10 }]))).toEqual([]);
    expect(names(run(collection, [{ $limit: 1 }, { $skip: 1 }]))).toEqual([]);
  });

  it("counts with $count", () => {
    const collection = people();

    expect(run(collection, [{ $count: "n" }])).toEqual([{ n: 6 }]);
    expect(
      run(collection, [{ $match: { team: "a" } }, { $count: "members" }]),
    ).toEqual([{ members: 3 }]);
    expect(
      run(collection, [{ $limit: 4 }, { $skip: 1 }, { $count: "n" }]),
    ).toEqual([{ n: 3 }]);
  });

  it("returns nothing from $count when no document reaches it", () => {
    expect(
      run(people(), [{ $match: { team: "zzz" } }, { $count: "n" }]),
    ).toEqual([]);
    expect(run(new InMemoryCollection(), [{ $count: "n" }])).toEqual([]);
  });

  it("applies the stages in order", () => {
    const collection = people();

    expect(
      names(
        run(collection, [
          { $match: { age: { $exists: true } } },
          { $sort: [["age", -1]] },
          { $skip: 1 },
          { $limit: 3 },
          { $project: { _id: 0, name: 1 } },
        ]),
      ),
    ).toEqual(["ada", "cyd", "bob"]);
  });

  it("stops reading once $limit is satisfied", () => {
    let read = 0;

    function* source(): Generator<Document> {
      for (let index = 0; index < 1000; index += 1) {
        read += 1;
        yield { n: index };
      }
    }

    const found = [
      ...compilePipeline([{ $skip: 2 }, { $limit: 3 }]).run(source()),
    ];

    expect(found.map((document) => document["n"])).toEqual([2, 3, 4]);
    expect(read).toBe(5);
  });
});

describe("aggregation validation", () => {
  it("rejects a pipeline that is not an array of stages", () => {
    invalid({});
    invalid("$match");
    invalid([1]);
    invalid([null]);
    invalid([[]]);
    invalid([{}]);
    invalid([{ $match: {}, $limit: 1 }]);
  });

  it("rejects unknown stages and names the supported ones", () => {
    expect(invalid([{ $lookup: {} }])).toContain("$lookup");
    expect(invalid([{ $lookup: {} }])).toContain("$group");
    invalid([{ match: {} }]);
  });

  it("rejects bad stage arguments", () => {
    invalid([{ $match: 5 }]);
    invalid([{ $match: [] }]);
    invalid([{ $project: "a" }]);
    invalid([{ $skip: -1 }]);
    invalid([{ $skip: 1.5 }]);
    invalid([{ $skip: "1" }]);
    invalid([{ $limit: 0 }]);
    invalid([{ $limit: -3 }]);
    invalid([{ $limit: Number.MAX_SAFE_INTEGER + 2 }]);
    invalid([{ $count: "" }]);
    invalid([{ $count: "$n" }]);
    invalid([{ $count: "a.b" }]);
    invalid([{ $count: 5 }]);
  });

  it("limits the number of stages", () => {
    const stages = Array.from({ length: MAX_PIPELINE_STAGES }, () => ({
      $skip: 0,
    }));

    expect(() => compilePipeline(stages)).not.toThrow();
    invalid([...stages, { $skip: 0 }]);
  });

  it("reports an invalid filter, projection or sort as an error", () => {
    expect(() => compilePipeline([{ $match: { a: { $bogus: 1 } } }])).toThrow(
      StorageError,
    );
    expect(() =>
      compilePipeline([{ $skip: 0 }, { $match: { a: { $bogus: 1 } } }]),
    ).toThrow(StorageError);
    expect(() => compilePipeline([{ $project: { a: 1, b: 0 } }])).toThrow(
      StorageError,
    );
    expect(() => compilePipeline([{ $sort: [] }])).toThrow(StorageError);
    expect(() => compilePipeline([{ $sort: { a: 1 } }])).toThrow(StorageError);
    expect(() => compilePipeline([{ $sort: [["a", 2]] }])).toThrow(
      StorageError,
    );
  });

  it("checks the whole pipeline before reading any document", () => {
    const collection = people();

    expect(() => collection.aggregate([{ $limit: 1 }, { $skip: -1 }])).toThrow(
      StorageError,
    );
  });
});

describe("sorting for the first results", () => {
  function randomDocuments(seed: number, count: number): Document[] {
    let state = seed;
    const next = (limit: number): number => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;

      return state % limit;
    };

    return Array.from({ length: count }, (_, index) => {
      const document: Document = { index };

      if (next(5) !== 0) {
        document["a"] = next(4);
      }

      if (next(5) !== 0) {
        document["b"] = ["x", "y", "z"][next(3)] as string;
      }

      return document;
    });
  }

  it("gives the same documents as sorting everything", () => {
    const documents = randomDocuments(7, 300);
    const specs = [
      [["a", 1]],
      [["a", -1]],
      [
        ["a", 1],
        ["b", -1],
      ],
      [
        ["b", 1],
        ["a", 1],
      ],
    ] as const;

    for (const spec of specs) {
      const everything = compileSort(spec as never)(documents);

      for (const count of [1, 2, 7, 50, 299, 300, 301, 1000]) {
        expect(
          compileTopN(spec as never, count)(documents),
          `${JSON.stringify(spec)} first ${count}`,
        ).toEqual(everything.slice(0, count));
      }
    }
  });

  it("is chosen only when a $limit follows the $sort", () => {
    const plan = (pipeline: Document[]) => compilePipeline(pipeline).plan;
    const sort = { $sort: [["a", 1]] };

    expect(plan([sort])).toEqual(["$sort"]);
    expect(plan([sort, { $limit: 5 }])).toEqual(["$sort (first 5)", "$limit"]);
    expect(plan([sort, { $skip: 2 }, { $skip: 1 }, { $limit: 5 }])).toEqual([
      "$sort (first 8)",
      "$skip",
      "$skip",
      "$limit",
    ]);
    expect(plan([sort, { $project: { a: 1 } }, { $limit: 5 }])).toEqual([
      "$sort",
      "$project",
      "$limit",
    ]);
    expect(plan([sort, { $match: {} }, { $limit: 5 }])[0]).toBe("$sort");
    expect(plan([{ $match: { a: 1 } }, sort, { $limit: 5 }])).toEqual([
      "$match",
      "$sort (first 5)",
      "$limit",
    ]);
  });

  it("is used by a $sort followed by $limit, with a $skip between", () => {
    const collection = new InMemoryCollection();

    collection.insertMany(randomDocuments(11, 200));

    for (const tail of [
      [{ $limit: 5 }],
      [{ $skip: 3 }, { $limit: 5 }],
      [{ $skip: 190 }, { $limit: 50 }],
    ]) {
      const sorted: Document[] = [
        {
          $sort: [
            ["a", -1],
            ["b", 1],
          ],
        },
      ];

      expect(run(collection, [...sorted, ...tail])).toEqual(
        run(collection, [...sorted, { $project: {} }, ...tail]),
      );
    }

    const found = [
      ...collection.find({}, { sort: [["a", 1]], skip: 3, limit: 5 }),
    ];

    expect(
      run(collection, [{ $sort: [["a", 1]] }, { $skip: 3 }, { $limit: 5 }]),
    ).toEqual(found);
  });
});
