import type { CustomId } from "sinterdb-protocol";
import { describe, expect, expectTypeOf, it } from "vitest";

import type { SinterCollection, WithId } from "./collection.js";
import type { Filter, Sort } from "./filter.js";
import type {
  CreateIndexResult,
  ExplainResult,
  IndexDefinition,
  IndexInfo,
  IndexValidationResult,
} from "./indexes.js";
import type { ProjectedDocument, Projection } from "./projection.js";
import type { DeleteResult, UpdateFilter, UpdateResult } from "./update.js";

interface User {
  _id: CustomId;
  name: string;
  age: number;
  score?: number;
  big: bigint;
  active: boolean;
  tags: string[];
  createdAt: Date;
  email?: string;
  profile: { bio: string; stats: { level: number; badges: string[] } };
}

interface Order {
  _id: CustomId;
  tags: string[];
  scores: number[];
  items: { sku: string; qty: number; options: { color: string }[] }[];
  note?: string;
}

describe("Filter<TDocument> types for arrays", () => {
  it("accepts element matches, array operators, and paths through arrays", () => {
    const filters: Filter<Order>[] = [
      { tags: "db" },
      { tags: ["db", "fast"] },
      { tags: { $eq: "db" } },
      { tags: { $ne: "db" } },
      { scores: { $gt: 90 } },
      { scores: { $gte: 1, $lt: 5 } },
      { tags: { $size: 2 } },
      { scores: { $elemMatch: { $gt: 1, $lt: 5 } } },
      { items: { $elemMatch: { sku: "a", qty: { $gt: 1 } } } },
      { "items.sku": "a", "items.qty": { $gte: 2 } },
      { "items.options.color": { $in: ["red"] } },
      { items: { $elemMatch: { options: { $elemMatch: { color: "red" } } } } },
    ];

    expect(filters).toHaveLength(12);
  });

  it("rejects what arrays cannot do", () => {
    // @ts-expect-error $size is only for arrays
    const sizeOnScalar: Filter<Order> = { note: { $size: 1 } };
    // @ts-expect-error $elemMatch is only for arrays
    const elemMatchOnScalar: Filter<Order> = { note: { $elemMatch: {} } };
    // @ts-expect-error an element of a number array is a number
    const wrongElement: Filter<Order> = { scores: "high" };
    // @ts-expect-error range operators take the element type
    const wrongRange: Filter<Order> = { scores: { $gt: "1" } };
    // @ts-expect-error $elemMatch filters use the element's fields
    const wrongField: Filter<Order> = { items: { $elemMatch: { nope: 1 } } };
    // @ts-expect-error a path through an array reads the element's field type
    const wrongPathValue: Filter<Order> = { "items.qty": "many" };
    // @ts-expect-error unknown field behind an array
    const unknownBehindArray: Filter<Order> = { "items.nope": 1 };

    expect([
      sizeOnScalar,
      elemMatchOnScalar,
      wrongElement,
      wrongRange,
      wrongField,
      wrongPathValue,
      unknownBehindArray,
    ]).toHaveLength(7);
  });

  it("does not offer paths through arrays for sorting", () => {
    const sorts: Sort<Order>[] = [[["note", 1]], [["_id", -1]]];
    // @ts-expect-error sorting treats a path through an array as missing
    const throughArray: Sort<Order> = [["items.sku", 1]];

    expect(sorts).toHaveLength(2);
    expect(throughArray).toHaveLength(1);
  });
});

describe("Filter<TDocument> types", () => {
  it("accepts valid filters", () => {
    const filters: Filter<User>[] = [
      {},
      { name: "Ada" },
      { age: { $gte: 18, $lt: 65 } },
      { $or: [{ active: true }, { age: { $gt: 5 } }] },
      { "profile.bio": "x", "profile.stats.level": { $gt: 3 } },
      { tags: { $in: ["db"] } },
      { email: { $exists: true }, age: { $not: { $gt: 5 } } },
      { createdAt: { $gt: new Date() } },
      { $and: [{ $nor: [{ name: "x" }] }] },
    ];

    expect(filters).toHaveLength(9);
  });

  it("rejects invalid filters", () => {
    // @ts-expect-error unknown field
    const unknownField: Filter<User> = { nope: 1 };
    // @ts-expect-error wrong value type
    const wrongType: Filter<User> = { age: "18" };
    // @ts-expect-error comparison operators are not offered for booleans
    const booleanComparison: Filter<User> = { active: { $gt: true } };
    // @ts-expect-error $in needs an array
    const scalarIn: Filter<User> = { age: { $in: 5 } };
    // @ts-expect-error nested path has the wrong type
    const nestedWrong: Filter<User> = { "profile.stats.level": "x" };
    // @ts-expect-error logical operators need arrays
    const objectOr: Filter<User> = { $or: { name: "x" } };
    // @ts-expect-error unknown operator
    const unknownOperator: Filter<User> = { age: { $around: 1 } };

    expect([
      unknownField,
      wrongType,
      booleanComparison,
      scalarIn,
      nestedWrong,
      objectOr,
      unknownOperator,
    ]).toHaveLength(7);
  });
});

describe("Sort<TDocument> types", () => {
  it("accepts known paths and directions", () => {
    const sorts: Sort<User>[] = [
      [["age", 1]],
      [
        ["name", -1],
        ["profile.stats.level", 1],
      ],
      [["_id", 1]],
    ];

    expect(sorts).toHaveLength(3);
  });

  it("rejects unknown paths and directions", () => {
    // @ts-expect-error unknown path
    const unknownPath: Sort<User> = [["nope", 1]];
    // @ts-expect-error direction must be 1 or -1
    const badDirection: Sort<User> = [["age", 2]];

    expect([unknownPath, badDirection]).toHaveLength(2);
  });
});

describe("UpdateFilter<TDocument> types", () => {
  it("accepts valid updates", () => {
    const updates: UpdateFilter<User>[] = [
      { $set: { name: "x", "profile.bio": "y", email: "e", tags: ["a"] } },
      { $inc: { age: 1, score: 2, big: 3n, "profile.stats.level": 1 } },
      { $push: { tags: "a", "profile.stats.badges": "b" } },
      { $addToSet: { tags: "a" }, $pull: { "profile.stats.badges": "b" } },
      {
        $min: { age: 1, createdAt: new Date(), name: "a" },
        $max: { age: 9, active: true },
      },
      { $unset: { email: 1, "profile.bio": true } },
    ];

    expect(updates).toHaveLength(6);
  });

  it("rejects invalid updates", () => {
    // @ts-expect-error _id cannot be set
    const setId: UpdateFilter<User> = { $set: { _id: undefined as never } };
    // @ts-expect-error _id cannot be unset
    const unsetId: UpdateFilter<User> = { $unset: { _id: 1 } };
    // @ts-expect-error $inc is only offered for numeric fields
    const incString: UpdateFilter<User> = { $inc: { name: 1 } };
    // @ts-expect-error $inc operand must be numeric
    const incWrongOperand: UpdateFilter<User> = { $inc: { age: "1" } };
    // @ts-expect-error bigint fields need bigint operands
    const incBigint: UpdateFilter<User> = { $inc: { big: 1 } };
    // @ts-expect-error $push is only offered for array fields
    const pushScalar: UpdateFilter<User> = { $push: { name: "a" } };
    // @ts-expect-error $push element type is checked
    const pushWrongElement: UpdateFilter<User> = { $push: { tags: 1 } };
    // @ts-expect-error $min is not offered for arrays
    const minArray: UpdateFilter<User> = { $min: { tags: "a" } };
    // @ts-expect-error unknown field
    const unknownField: UpdateFilter<User> = { $set: { nope: 1 } };
    // @ts-expect-error $set value type is checked
    const setWrongType: UpdateFilter<User> = { $set: { age: "x" } };
    // @ts-expect-error unsupported operator
    const rename: UpdateFilter<User> = { $rename: { name: "x" } };

    expect([
      setId,
      unsetId,
      incString,
      incWrongOperand,
      incBigint,
      pushScalar,
      pushWrongElement,
      minArray,
      unknownField,
      setWrongType,
      rename,
    ]).toHaveLength(11);
  });
});

describe("collection method types", () => {
  it("types write results and arguments", () => {
    async function neverCalled(users: SinterCollection<User>): Promise<void> {
      const updated = await users.updateOne(
        { name: "a" },
        { $inc: { age: 1 } },
        { upsert: true },
      );
      const updatedMany = await users.updateMany(
        {},
        { $set: { active: false } },
      );
      const replaced = await users.replaceOne(
        { name: "a" },
        {
          name: "b",
          age: 1,
          big: 1n,
          active: true,
          tags: [],
          createdAt: new Date(),
          profile: { bio: "", stats: { level: 1, badges: [] } },
        },
      );
      const deleted = await users.deleteOne({ age: { $gt: 5 } });
      const deletedMany = await users.deleteMany({ $or: [{ active: false }] });

      expectTypeOf(updated).toEqualTypeOf<UpdateResult>();
      expectTypeOf(updatedMany).toEqualTypeOf<UpdateResult>();
      expectTypeOf(replaced).toEqualTypeOf<UpdateResult>();
      expectTypeOf(deleted).toEqualTypeOf<DeleteResult>();
      expectTypeOf(deletedMany).toEqualTypeOf<DeleteResult>();
      expectTypeOf(updated.upsertedId).toEqualTypeOf<CustomId | null>();

      // @ts-expect-error a replacement must be a complete document
      await users.replaceOne({ name: "a" }, { name: "b" });
      // @ts-expect-error deleteMany requires an explicit filter
      await users.deleteMany();
      // @ts-expect-error deleteOne requires an explicit filter
      await users.deleteOne();
      // @ts-expect-error updates must use operators
      await users.updateOne({}, { name: "plain" });
      // @ts-expect-error upsert must be a boolean
      await users.updateOne({}, { $set: { age: 1 } }, { upsert: "yes" });
    }

    expect(typeof neverCalled).toBe("function");
  });

  describe("IndexDefinition<TDocument> types", () => {
    it("accepts known fields and options", () => {
      const definitions: IndexDefinition<User>[] = [
        { field: "name" },
        { field: "profile.stats.level", unique: true },
        { field: "tags", sparse: true, direction: -1, name: "by_tags" },
        { field: "createdAt", direction: 1 },
      ];

      expect(definitions).toHaveLength(4);
    });

    it("accepts compound definitions", () => {
      const definitions: IndexDefinition<User>[] = [
        {
          keys: [
            ["name", 1],
            ["profile.stats.level", -1],
          ],
        },
        { keys: [["name", 1]], unique: true, sparse: true, name: "only_name" },
      ];

      expect(definitions).toHaveLength(2);
    });

    it("rejects bad compound definitions", () => {
      const unknownField: IndexDefinition<User> = {
        keys: [
          ["name", 1],
          // @ts-expect-error unknown field
          ["nope", 1],
        ],
      };
      const onId: IndexDefinition<User> = {
        keys: [
          // @ts-expect-error _id always has its own index
          ["_id", 1],
        ],
      };
      const badDirection: IndexDefinition<User> = {
        keys: [
          // @ts-expect-error direction must be 1 or -1
          ["name", 2],
        ],
      };
      const both: IndexDefinition<User> = {
        field: "name",
        // @ts-expect-error field and keys cannot be combined
        keys: [["name", 1]],
      };
      const outerDirection: IndexDefinition<User> = {
        // @ts-expect-error direction goes inside each pair
        keys: [["name", 1]],
        direction: 1,
      };

      expect([
        unknownField,
        onId,
        badDirection,
        both,
        outerDirection,
      ]).toHaveLength(5);
    });

    it("rejects _id, unknown fields, and bad options", () => {
      // @ts-expect-error _id always has its own index
      const onId: IndexDefinition<User> = { field: "_id" };
      // @ts-expect-error unknown field
      const unknownField: IndexDefinition<User> = { field: "nope" };
      const badDirection: IndexDefinition<User> = {
        field: "age",
        // @ts-expect-error direction must be 1 or -1
        direction: 2,
      };
      // @ts-expect-error unique must be a boolean
      const badUnique: IndexDefinition<User> = { field: "age", unique: "yes" };
      // @ts-expect-error a field is required
      const noField: IndexDefinition<User> = { unique: true };
      const unknownOption: IndexDefinition<User> = {
        field: "age",
        // @ts-expect-error unknown option
        background: true,
      };

      expect([
        onId,
        unknownField,
        badDirection,
        badUnique,
        noField,
        unknownOption,
      ]).toHaveLength(6);
    });

    it("types the index methods", () => {
      async function neverCalled(users: SinterCollection<User>): Promise<void> {
        const created = await users.createIndex({ field: "age" });
        const listed = await users.indexes();
        const validation = await users.validateIndexes();
        const plan = await users.find({ age: 1 }).explain();

        expectTypeOf(created).toEqualTypeOf<CreateIndexResult>();
        expectTypeOf(listed).toEqualTypeOf<IndexInfo[]>();
        expectTypeOf(validation).toEqualTypeOf<IndexValidationResult>();
        expectTypeOf(plan).toEqualTypeOf<ExplainResult>();
        expectTypeOf(await users.dropIndex("age_1")).toEqualTypeOf<void>();

        // @ts-expect-error dropIndex needs a name
        await users.dropIndex();
        // @ts-expect-error createIndex needs a definition
        await users.createIndex();
      }

      expect(typeof neverCalled).toBe("function");
    });
  });
});

interface Account {
  _id: CustomId;
  name: string;
  nickname?: string;
  address?: { city: string; zip: string };
  owner: { name: string; tags: string[] } | null;
  lines: { sku: string; qty: number }[];
}

describe("ProjectedDocument types", () => {
  it("is the whole document without a projection", () => {
    expectTypeOf<ProjectedDocument<Account, undefined>>().toEqualTypeOf<
      WithId<Account>
    >();
    expectTypeOf<ProjectedDocument<Account, {}>>().toEqualTypeOf<
      WithId<Account>
    >();
  });

  it("keeps only included fields and _id", () => {
    type Result = ProjectedDocument<Account, { name: 1; nickname: true }>;

    expectTypeOf<Result>().toEqualTypeOf<{
      readonly _id: CustomId;
      name: string;
      nickname?: string;
    }>();
  });

  it("leaves _id out when it is set to 0", () => {
    expectTypeOf<
      ProjectedDocument<Account, { name: 1; _id: 0 }>
    >().toEqualTypeOf<{
      name: string;
    }>();
    expectTypeOf<
      ProjectedDocument<Account, { name: 1; _id: false }>
    >().toEqualTypeOf<{
      name: string;
    }>();
  });

  it("returns only the id for { _id: 1 }", () => {
    expectTypeOf<ProjectedDocument<Account, { _id: 1 }>>().toEqualTypeOf<{
      readonly _id: CustomId;
    }>();
  });

  it("removes excluded fields", () => {
    type Result = ProjectedDocument<
      Account,
      { nickname: 0; address: false; owner: 0; lines: 0 }
    >;

    expectTypeOf<Result>().toEqualTypeOf<{
      name: string;
      readonly _id: CustomId;
    }>();
    expectTypeOf<ProjectedDocument<Account, { _id: 0 }>>().toEqualTypeOf<{
      name: string;
      nickname?: string;
      address?: { city: string; zip: string };
      owner: { name: string; tags: string[] } | null;
      lines: { sku: string; qty: number }[];
    }>();
  });

  it("follows nested paths and arrays of documents", () => {
    type Result = ProjectedDocument<
      Account,
      { "lines.sku": 1; "address.city": 1; _id: 0 }
    >;

    expectTypeOf<Result>().toEqualTypeOf<{
      address?: { city: string };
      lines: { sku: string }[];
    }>();
  });

  it("makes a nested field optional when its parent can be null", () => {
    expectTypeOf<
      ProjectedDocument<Account, { "owner.name": 1; _id: 0 }>
    >().toEqualTypeOf<{ owner?: { name: string } }>();
  });

  it("removes nested fields", () => {
    expectTypeOf<
      ProjectedDocument<Account, { "address.zip": 0; "lines.qty": 0; _id: 0 }>
    >().toEqualTypeOf<{
      name: string;
      nickname?: string;
      address?: { city: string };
      owner: { name: string; tags: string[] } | null;
      lines: { sku: string }[];
    }>();
  });

  it("makes everything optional when the flags are not literals", () => {
    expectTypeOf<ProjectedDocument<Account, { name: boolean }>>().toEqualTypeOf<
      Partial<WithId<Account>>
    >();
    expectTypeOf<ProjectedDocument<Account, { name: number }>>().toEqualTypeOf<
      Partial<WithId<Account>>
    >();
  });

  it("only accepts real paths and flags", () => {
    const valid: Projection<Account> = {
      name: 1,
      "address.city": true,
      "lines.sku": 1,
      _id: 0,
    };

    expectTypeOf(valid).not.toBeAny();

    // @ts-expect-error unknown path
    const unknown: Projection<Account> = { nope: 1 };
    // @ts-expect-error positions are not supported
    const position: Projection<Account> = { "lines.0": 1 };
    // @ts-expect-error flags are 0, 1, true or false
    const flag: Projection<Account> = { name: 2 };

    void [unknown, position, flag];
  });
});

describe("distinct types", () => {
  interface Shop {
    _id: CustomId;
    tags: string[];
    score?: number;
    items: { sku: string; qty: number }[];
    owner: { name: string } | null;
  }

  // These checks run in the compiler only: the collection is never used.
  const shop = undefined as unknown as SinterCollection<Shop>;

  it("types the values from the field", () => {
    const check = (): void => {
      expectTypeOf(shop.distinct("tags")).resolves.toEqualTypeOf<string[]>();
      expectTypeOf(shop.distinct("score")).resolves.toEqualTypeOf<number[]>();
      expectTypeOf(shop.distinct("items.sku")).resolves.toEqualTypeOf<
        string[]
      >();
      expectTypeOf(shop.distinct("items.qty")).resolves.toEqualTypeOf<
        number[]
      >();
      expectTypeOf(shop.distinct("_id")).resolves.toEqualTypeOf<CustomId[]>();
      expectTypeOf(shop.distinct("owner.name")).resolves.toEqualTypeOf<
        string[]
      >();
    };

    expect(check).toBeTypeOf("function");
  });

  it("only accepts real fields and a typed filter", () => {
    const check = (): void => {
      // @ts-expect-error unknown field
      void shop.distinct("nope");
      // @ts-expect-error filter values are typed
      void shop.distinct("tags", { score: "high" });
      // @ts-expect-error the filter must be a filter of this collection
      void shop.countDocuments({ nope: 1 });

      expectTypeOf(shop.countDocuments()).resolves.toEqualTypeOf<number>();
      expectTypeOf(
        shop.estimatedDocumentCount(),
      ).resolves.toEqualTypeOf<number>();
    };

    expect(check).toBeTypeOf("function");
  });
});
