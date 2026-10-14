import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { CustomId, type Document, type DocumentValue } from "sinterdb-protocol";
import { describe, expect, it } from "vitest";

import { StorageErrorCode } from "./errors.js";
import { compareStrings, compileFilter } from "./filter.js";
import { InMemoryCollection } from "./in-memory-collection.js";
import { compileProjection } from "./projection.js";
import { compileSort } from "./sort.js";

// docs/query-semantics.md defines how values compare. The example table and
// the sort order table on that page are read and run here, and the rules the
// tables cannot express (bigints, NaN, dates, binary values) are checked below.

const markdown = readFileSync(
  fileURLToPath(new URL("../../../docs/query-semantics.md", import.meta.url)),
  "utf8",
);

function matches(filter: Document, document: Document): boolean {
  return compileFilter(filter)(document);
}

function order(values: readonly (DocumentValue | undefined)[]): number[] {
  const documents = values.map((value, index) =>
    value === undefined ? { index } : { index, a: value },
  );

  return compileSort([["a", 1]])(documents).map(
    (document) => document["index"] as number,
  );
}

describe("the examples in docs/query-semantics.md", () => {
  const rows = [
    ...markdown.matchAll(
      /^\|\s*`(\{.*?\})`\s*\|\s*`(\{.*?\})`\s*\|\s*(yes|no)\s*\|$/gm,
    ),
  ].map((row) => ({
    filter: JSON.parse(row[1] as string) as Document,
    document: JSON.parse(row[2] as string) as Document,
    expected: row[3] === "yes",
  }));

  it("has examples to run", () => {
    expect(rows.length).toBeGreaterThanOrEqual(55);
  });

  it.each(rows.map((row) => [JSON.stringify(row), row] as const))(
    "%s",
    (_name, row) => {
      expect(matches(row.filter, row.document)).toBe(row.expected);
    },
  );
});

describe("the sort order in docs/query-semantics.md", () => {
  const samples: Record<string, DocumentValue | undefined> = {
    missing: undefined,
    null: null,
    number: 1,
    string: "s",
    binary: new Uint8Array([1]),
    id: CustomId.generate(),
    boolean: true,
    date: new Date(5),
    array: [1],
    document: { x: 1 },
  };

  const documented = [
    ...markdown.matchAll(/^\|\s*\d+\s*\|\s*`(\w+)`\s*\|$/gm),
  ].map((row) => row[1] as string);

  it("lists every kind once", () => {
    expect([...documented].sort()).toEqual(Object.keys(samples).sort());
  });

  it("sorts one value of each kind in the documented order", () => {
    const shuffled = [...documented].reverse();
    const sorted = order(shuffled.map((kind) => samples[kind]));

    expect(sorted.map((index) => shuffled[index])).toEqual(documented);
  });

  it("reverses for descending order", () => {
    const documents = documented.map((kind, index) =>
      samples[kind] === undefined
        ? { index }
        : { index, a: samples[kind] as DocumentValue },
    );
    const sorted = compileSort([["a", -1]])(documents).map(
      (document) => document["index"] as number,
    );

    expect(sorted).toEqual(documented.map((_kind, index) => index).reverse());
  });
});

describe("numbers", () => {
  it("never equals a bigint, in either direction", () => {
    expect(matches({ a: 1 }, { a: 1n })).toBe(false);
    expect(matches({ a: 1n }, { a: 1 })).toBe(false);
    expect(matches({ a: 1n }, { a: 1n })).toBe(true);
  });

  it("does not compare a number with a bigint in a range", () => {
    expect(matches({ a: { $gt: 0 } }, { a: 1n })).toBe(false);
    expect(matches({ a: { $gt: 0n } }, { a: 1 })).toBe(false);
    expect(matches({ a: { $gt: 0n } }, { a: 1n })).toBe(true);
  });

  it("sorts numbers and bigints together by value", () => {
    expect(order([2, 1n, 1.5, 3n, 0.5])).toEqual([4, 1, 2, 0, 3]);
  });

  it("equals NaN to NaN, but rejects NaN and infinity as a range operand", () => {
    expect(matches({ a: Number.NaN }, { a: Number.NaN })).toBe(true);

    for (const operand of [Number.NaN, Infinity, -Infinity]) {
      expect(() => compileFilter({ a: { $gt: operand } })).toThrow(
        expect.objectContaining({ code: StorageErrorCode.InvalidFilter }),
      );
    }
  });

  it("never matches a stored NaN or infinity in a range", () => {
    for (const stored of [Number.NaN, Infinity, -Infinity]) {
      expect(matches({ a: { $gt: -1e308 } }, { a: stored })).toBe(false);
      expect(matches({ a: { $lt: 1e308 } }, { a: stored })).toBe(false);
    }
  });

  it("sorts NaN before every other number", () => {
    expect(order([1, Number.NaN, -Infinity, Infinity])).toEqual([1, 2, 0, 3]);
  });

  it("treats 0 and -0 as different for equality but equal otherwise", () => {
    expect(matches({ a: 0 }, { a: -0 })).toBe(false);
    expect(matches({ a: { $gte: 0, $lte: 0 } }, { a: -0 })).toBe(true);
    expect(matches({ a: { $gt: -0 } }, { a: 0 })).toBe(false);
    expect(order([0, -0, 0])).toEqual([0, 1, 2]);
  });
});

describe("strings", () => {
  it("order by code point, not by UTF-16 code unit", () => {
    const emoji = "\u{1F600}";

    expect(matches({ a: { $gt: "\uffff" } }, { a: emoji })).toBe(true);
    expect(matches({ a: { $lt: emoji } }, { a: "\uffff" })).toBe(true);
    expect(order([emoji, "\uffff", "a"])).toEqual([2, 1, 0]);
    expect(compareStrings("\ud800", "\ue000")).toBe(1);
  });

  it("agrees with the order of the UTF-8 bytes", () => {
    const samples = [
      "",
      "a",
      "B",
      "\u00e9",
      "e\u0301",
      "\uffff",
      "\u{10000}",
      "ab",
    ];
    const bytes = (text: string): number[] => [...Buffer.from(text, "utf8")];

    for (const left of samples) {
      for (const right of samples) {
        const byteOrder = Buffer.compare(
          Buffer.from(left, "utf8"),
          Buffer.from(right, "utf8"),
        );

        expect(
          compareStrings(left, right),
          `${bytes(left)} ${bytes(right)}`,
        ).toBe(Math.sign(byteOrder));
      }
    }
  });

  it("compare exactly as stored", () => {
    expect(matches({ a: { $lt: "b" } }, { a: "B" })).toBe(true);
    expect(matches({ a: "\u00e9" }, { a: "e\u0301" })).toBe(false);
    expect(matches({ a: { $gt: "a" } }, { a: "ab" })).toBe(true);
  });
});

describe("dates, binary values, and identifiers", () => {
  it("compare dates by time", () => {
    expect(matches({ a: { $gt: new Date(1) } }, { a: new Date(2) })).toBe(true);
    expect(matches({ a: { $lt: new Date(1) } }, { a: new Date(2) })).toBe(
      false,
    );
    expect(matches({ a: new Date(1) }, { a: new Date(1) })).toBe(true);
  });

  it("do not compare an invalid date", () => {
    expect(() => compileFilter({ a: { $gt: new Date(Number.NaN) } })).toThrow();
    expect(
      matches({ a: { $gt: new Date(0) } }, { a: new Date(Number.NaN) }),
    ).toBe(false);
  });

  it("compare binary values byte by byte, a prefix first", () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([1, 2, 0]);
    const c = new Uint8Array([1, 3]);

    expect(matches({ x: { $lt: b } }, { x: a })).toBe(true);
    expect(matches({ x: { $lt: c } }, { x: b })).toBe(true);
    expect(matches({ x: { $gt: c } }, { x: b })).toBe(false);
    expect(order([c, b, a])).toEqual([2, 1, 0]);
  });

  it("compare identifiers by their bytes", () => {
    const low = CustomId.fromBytes(new Uint8Array(16));
    const high = CustomId.fromBytes(new Uint8Array(16).fill(255));

    expect(matches({ a: { $gt: low } }, { a: high })).toBe(true);
    expect(matches({ a: { $lt: low } }, { a: high })).toBe(false);
    expect(order([high, low])).toEqual([1, 0]);
  });

  it("reject operands that cannot be ordered", () => {
    for (const operand of [null, true, [1], { x: 1 }]) {
      expect(() =>
        compileFilter({ a: { $gte: operand as DocumentValue } }),
      ).toThrow(
        expect.objectContaining({ code: StorageErrorCode.InvalidFilter }),
      );
    }
  });
});

describe("sorting", () => {
  it("keeps equal values in their existing order", () => {
    expect(order(["a", "a", "a"])).toEqual([0, 1, 2]);
    expect(order([[3], [1], [2]])).toEqual([0, 1, 2]);
    expect(order([{ x: 2 }, { x: 1 }])).toEqual([0, 1]);
  });

  it("orders false before true", () => {
    expect(order([true, false])).toEqual([1, 0]);
  });

  it("breaks ties with the next sort field", () => {
    const documents: Document[] = [
      { id: 1, a: 2, b: 1 },
      { id: 2, a: 1, b: 2 },
      { id: 3, a: 1, b: 1 },
    ];
    const sorted = compileSort([
      ["a", 1],
      ["b", -1],
    ])(documents).map((document) => document["id"]);

    expect(sorted).toEqual([2, 3, 1]);
  });

  it("sorts a missing field first, and a nested path through a non-document as missing", () => {
    const documents: Document[] = [
      { id: 1, a: { b: 1 } },
      { id: 2, a: 5 },
      { id: 3 },
    ];
    const sorted = compileSort([["a.b", 1]])(documents).map(
      (document) => document["id"],
    );

    expect(sorted).toEqual([2, 3, 1]);
  });
});

describe("indexes agree with scans", () => {
  const values: DocumentValue[] = [
    "\u{1F600}",
    "\uffff",
    "B",
    "a",
    "ab",
    -1,
    0,
    1.5,
    Infinity,
    Number.NaN,
    new Date(1),
    new Uint8Array([1]),
  ];

  it("returns the same documents for a range with and without an index", () => {
    const plain = new InMemoryCollection();
    const indexed = new InMemoryCollection();

    indexed.createIndex({ field: "a" });

    values.forEach((value, index) => {
      plain.insertOne({ n: index, a: value });
      indexed.insertOne({ n: index, a: value });
    });

    for (const filter of [
      { a: { $gt: "\uffff" } },
      { a: { $gte: "B", $lt: "ab" } },
      { a: { $lt: "\u{1F600}" } },
      { a: { $gt: -1 } },
      { a: { $lte: 1.5 } },
    ] as Document[]) {
      const ids = (collection: InMemoryCollection): unknown[] =>
        [...collection.find(filter)].map((document) => document["n"]);

      expect(ids(indexed), JSON.stringify(filter)).toEqual(ids(plain));
    }
  });
});

describe("array operators", () => {
  function invalid(filter: Document): void {
    expect(() => compileFilter(filter)).toThrow(
      expect.objectContaining({ code: StorageErrorCode.InvalidFilter }),
    );
  }

  it("rejects a $size that is not a non-negative integer", () => {
    for (const size of [-1, 1.5, Number.NaN, Infinity, "2", null, [2]]) {
      invalid({ a: { $size: size as DocumentValue } });
    }
  });

  it("rejects an $elemMatch that is not a document", () => {
    for (const operand of [1, "x", null, [1], true]) {
      invalid({ a: { $elemMatch: operand as DocumentValue } });
    }
  });

  it("rejects a bad operator inside $elemMatch", () => {
    invalid({ a: { $elemMatch: { $gt: 1, $bad: 2 } } });
    invalid({ a: { $elemMatch: { $gt: 1, b: 2 } } });
    invalid({ a: { $elemMatch: { $gt: null } } });
  });

  it("nests $elemMatch", () => {
    const filter = { a: { $elemMatch: { b: { $elemMatch: { $gt: 5 } } } } };

    expect(matches(filter, { a: [{ b: [1, 9] }] })).toBe(true);
    expect(matches(filter, { a: [{ b: [1, 2] }] })).toBe(false);
    expect(matches(filter, { a: [{ b: 9 }] })).toBe(false);
  });

  it("combines logical operators inside an $elemMatch filter", () => {
    const filter = {
      a: { $elemMatch: { $or: [{ b: 1 }, { c: { $gt: 5 } }] } },
    };

    expect(matches(filter, { a: [{ b: 2 }, { c: 9 }] })).toBe(true);
    expect(matches(filter, { a: [{ b: 2 }, { c: 3 }] })).toBe(false);
  });

  it("ignores elements that are not documents in an $elemMatch filter", () => {
    expect(
      matches({ a: { $elemMatch: { b: 1 } } }, { a: [1, "x", null] }),
    ).toBe(false);
  });

  it("never matches $elemMatch or $size on a missing field", () => {
    expect(matches({ a: { $elemMatch: { $gt: 1 } } }, {})).toBe(false);
    expect(matches({ a: { $size: 0 } }, {})).toBe(false);
    expect(matches({ a: { $not: { $size: 0 } } }, {})).toBe(true);
  });

  it("selects an element by position without searching the others", () => {
    expect(matches({ "a.0": 1 }, { a: [1, 2] })).toBe(true);
    expect(matches({ "a.0": 2 }, { a: [1, 2] })).toBe(false);
    expect(matches({ "a.0.b": 1 }, { a: [{ b: 1 }, { b: 2 }] })).toBe(true);
    expect(matches({ "a.0.b": 2 }, { a: [{ b: 1 }, { b: 2 }] })).toBe(false);
  });

  it("reads a numeric field name from a document", () => {
    expect(matches({ "a.0": 1 }, { a: { "0": 1 } })).toBe(true);
  });

  it("collects the values of every element for a path through an array", () => {
    const document = { a: [{ b: 1 }, { b: 5 }, { c: 9 }] };

    expect(matches({ "a.b": { $gt: 4 } }, document)).toBe(true);
    expect(matches({ "a.b": { $gt: 9 } }, document)).toBe(false);
    expect(matches({ "a.b": { $in: [5] } }, document)).toBe(true);
    expect(matches({ "a.b": { $ne: 1 } }, document)).toBe(false);
    expect(matches({ "a.c": { $exists: true } }, document)).toBe(true);
    expect(matches({ "a.d": { $exists: false } }, document)).toBe(true);
  });

  it("searches one level of an array, not nested arrays", () => {
    expect(matches({ a: 1 }, { a: [[1, 2]] })).toBe(false);
    expect(matches({ a: [1, 2] }, { a: [[1, 2]] })).toBe(true);
    expect(matches({ a: { $gt: 0 } }, { a: [[1, 2]] })).toBe(false);
  });

  it("finds documents through a collection", () => {
    const collection = new InMemoryCollection();

    collection.insertMany([
      { n: 1, tags: ["a", "b"], items: [{ sku: "x", qty: 1 }] },
      {
        n: 2,
        tags: ["b"],
        items: [
          { sku: "x", qty: 5 },
          { sku: "y", qty: 1 },
        ],
      },
      { n: 3, tags: [], items: [] },
      { n: 4 },
    ]);

    const find = (filter: Document): unknown[] =>
      [...collection.find(filter, { sort: [["n", 1]] })].map(
        (document) => document["n"],
      );

    expect(find({ tags: "b" })).toEqual([1, 2]);
    expect(find({ tags: { $ne: "a" } })).toEqual([2, 3, 4]);
    expect(find({ tags: { $size: 0 } })).toEqual([3]);
    expect(find({ "items.sku": "y" })).toEqual([2]);
    expect(
      find({ items: { $elemMatch: { sku: "x", qty: { $gt: 2 } } } }),
    ).toEqual([2]);
    expect(find({ "items.qty": { $gt: 2 }, "items.sku": "y" })).toEqual([2]);
    expect(
      find({ items: { $elemMatch: { sku: "y", qty: { $gt: 2 } } } }),
    ).toEqual([]);
  });
});

describe("the projection examples in docs/query-semantics.md", () => {
  const rows = [
    ...markdown.matchAll(
      /^\|\s*`(\{.*?\})`\s*\|\s*`(\{.*?\})`\s*\|\s*(`\{.*\}`|error)\s*\|$/gm,
    ),
  ].map((row) => ({
    projection: JSON.parse(row[1] as string) as Document,
    document: JSON.parse(row[2] as string) as Document,
    expected: row[3] === "error" ? undefined : (row[3] as string).slice(1, -1),
  }));

  it("has examples to run", () => {
    expect(rows.length).toBeGreaterThanOrEqual(40);
    expect(rows.some((row) => row.expected === undefined)).toBe(true);
  });

  it.each(rows.map((row) => [JSON.stringify(row), row] as const))(
    "%s",
    (_name, row) => {
      if (row.expected === undefined) {
        expect(() => compileProjection(row.projection)).toThrowError(
          expect.objectContaining({
            code: StorageErrorCode.InvalidFindOptions,
          }),
        );

        return;
      }

      // Comparing the JSON text also checks that the field order is kept.
      expect(
        JSON.stringify(compileProjection(row.projection)(row.document)),
      ).toBe(row.expected);
    },
  );
});
