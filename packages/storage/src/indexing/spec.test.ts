import { describe, expect, it } from "vitest";

import { StorageError, StorageErrorCode } from "../errors.js";
import {
  idIndexSpec,
  normalizeIndexSpec,
  sameDefinition,
  sameFields,
  type CreateIndexInput,
} from "./spec.js";

function expectInvalid(input: unknown): void {
  try {
    normalizeIndexSpec(input as CreateIndexInput);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(StorageError);
    expect((error as StorageError).code).toBe(StorageErrorCode.InvalidIndex);

    return;
  }

  throw new Error("Expected an invalid index error.");
}

describe("normalizeIndexSpec", () => {
  it("fills in defaults", () => {
    expect(normalizeIndexSpec({ field: "email" })).toEqual({
      name: "email_1",
      keys: [{ field: "email", direction: 1 }],
      unique: false,
      sparse: false,
    });
  });

  it("keeps explicit options", () => {
    expect(
      normalizeIndexSpec({
        field: "profile.level",
        direction: -1,
        unique: true,
        sparse: true,
        name: "by_level",
      }),
    ).toEqual({
      name: "by_level",
      keys: [{ field: "profile.level", direction: -1 }],
      unique: true,
      sparse: true,
    });
  });

  it("names indexes after the field and direction", () => {
    expect(normalizeIndexSpec({ field: "a.b", direction: -1 }).name).toBe(
      "a.b_-1",
    );
  });

  it("rejects invalid fields", () => {
    for (const field of [
      "",
      "a..b",
      ".a",
      "a.",
      "$a",
      "a.$b",
      "__proto__",
      5,
    ]) {
      expectInvalid({ field });
    }

    expectInvalid({});
  });

  it("rejects indexes on _id", () => {
    expectInvalid({ field: "_id" });
    expectInvalid({ field: "_id.x" });
  });

  it("rejects invalid options and names", () => {
    expectInvalid({ field: "a", direction: 2 });
    expectInvalid({ field: "a", direction: "asc" });
    expectInvalid({ field: "a", unique: "yes" });
    expectInvalid({ field: "a", sparse: 1 });
    expectInvalid({ field: "a", name: "" });
    expectInvalid({ field: "a", name: "x".repeat(128) });
    expectInvalid({ field: "a", name: "bad\nname" });
    expectInvalid({ field: "a", name: "_id_" });
    expectInvalid(null);
    expectInvalid("a");
    expectInvalid([]);
  });

  it("compares definitions without the name", () => {
    const left = normalizeIndexSpec({ field: "a", name: "one" });
    const right = normalizeIndexSpec({ field: "a", name: "two" });
    const different = normalizeIndexSpec({ field: "a", unique: true });

    expect(sameDefinition(left, right)).toBe(true);
    expect(sameDefinition(left, different)).toBe(false);
  });

  it("describes the _id index", () => {
    expect(idIndexSpec()).toEqual({
      name: "_id_",
      keys: [{ field: "_id", direction: 1 }],
      unique: true,
      sparse: false,
    });
  });
});

describe("compound index definitions", () => {
  it("takes ordered [field, direction] pairs", () => {
    expect(
      normalizeIndexSpec({
        keys: [
          ["country", 1],
          ["profile.age", -1],
        ],
      }),
    ).toEqual({
      name: "country_1_profile.age_-1",
      keys: [
        { field: "country", direction: 1 },
        { field: "profile.age", direction: -1 },
      ],
      unique: false,
      sparse: false,
    });
  });

  it("treats a single pair like the field shorthand", () => {
    expect(normalizeIndexSpec({ keys: [["a", -1]] })).toEqual(
      normalizeIndexSpec({ field: "a", direction: -1 }),
    );
  });

  it("requires exactly one of field and keys", () => {
    expectInvalid({});
    expectInvalid({ field: "a", keys: [["b", 1]] });
    expectInvalid({ keys: [["a", 1]], direction: 1 });
  });

  it("rejects invalid keys", () => {
    expectInvalid({ keys: [] });
    expectInvalid({ keys: "a" });
    expectInvalid({ keys: ["a"] });
    expectInvalid({ keys: [["a"]] });
    expectInvalid({ keys: [["a", 1, 1]] });
    expectInvalid({ keys: [["a", 2]] });
    expectInvalid({ keys: [[5, 1]] });
    expectInvalid({
      keys: [
        ["a", 1],
        ["$b", 1],
      ],
    });
    expectInvalid({
      keys: [
        ["a", 1],
        ["_id", 1],
      ],
    });
    expectInvalid({
      keys: [
        ["a", 1],
        ["a", -1],
      ],
    });
  });

  it("allows at most 8 fields", () => {
    const fields = Array.from({ length: 9 }, (_, index) => [`f${index}`, 1]);

    expect(
      normalizeIndexSpec({ keys: fields.slice(0, 8) as [string, 1][] }).keys,
    ).toHaveLength(8);
    expectInvalid({ keys: fields });
  });

  it("compares keys in order, with directions", () => {
    const base = normalizeIndexSpec({
      keys: [
        ["a", 1],
        ["b", 1],
      ],
    });

    expect(
      sameDefinition(
        base,
        normalizeIndexSpec({
          keys: [
            ["a", 1],
            ["b", 1],
          ],
          name: "other",
        }),
      ),
    ).toBe(true);
    expect(
      sameDefinition(
        base,
        normalizeIndexSpec({
          keys: [
            ["b", 1],
            ["a", 1],
          ],
        }),
      ),
    ).toBe(false);
    expect(
      sameDefinition(
        base,
        normalizeIndexSpec({
          keys: [
            ["a", 1],
            ["b", -1],
          ],
        }),
      ),
    ).toBe(false);
    expect(
      sameFields(
        base,
        normalizeIndexSpec({
          keys: [
            ["a", -1],
            ["b", -1],
          ],
        }),
      ),
    ).toBe(true);
  });
});
