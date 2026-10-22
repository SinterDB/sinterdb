import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { withTestServer } from "@sinterdb-internal/test-utils";
import { describe, expect, it } from "vitest";

// The ODM is developed in its own repository and may use only what the
// `sinterdb` package root exports. This file is written the way an ODM would
// write it: every driver import below comes from "sinterdb", the package's
// public entry point, and never from a relative path. The package `exports`
// map makes any other path unreachable, and the last test checks that this
// file keeps to the rule. `pnpm build` must have run first, because "sinterdb"
// resolves to the built package.
import {
  CustomId,
  SinterClient,
  SinterCompatibilityError,
  SinterError,
  SinterErrorCode,
  SinterServerError,
  type Filter,
  type OptionalId,
  type QueryBudgetOptions,
  type SinterCollection,
  type Sort,
  type UpdateFilter,
  type WithId,
} from "sinterdb";

const SOURCE = readFileSync(fileURLToPath(import.meta.url), "utf8");

interface UserShape {
  _id: CustomId;
  name: string;
  age: number;
  team: string;
}

/**
 * A small model layer, the kind of thing an ODM builds on the driver. It
 * touches the driver only through its public types and methods.
 */
class Model<TShape extends object> {
  public constructor(private readonly collection: SinterCollection<TShape>) {}

  public create(data: OptionalId<TShape>): Promise<WithId<TShape>> {
    return this.collection.insertOne(data).then(async (result) => {
      const stored = await this.collection.findOne({
        _id: result.insertedId,
      } as Filter<TShape>);

      if (stored === null) {
        throw new Error("The inserted document is missing.");
      }

      return stored as WithId<TShape>;
    });
  }

  public findMany(
    filter: Filter<TShape>,
    options: { sort?: Sort<TShape>; limit?: number } & QueryBudgetOptions = {},
  ): Promise<WithId<TShape>[]> {
    return this.collection.find(filter, options).toArray();
  }

  public update(
    filter: Filter<TShape>,
    update: UpdateFilter<TShape>,
  ): Promise<number> {
    return this.collection
      .updateMany(filter, update)
      .then((result) => result.modifiedCount);
  }

  public count(filter: Filter<TShape>): Promise<number> {
    return this.collection.countDocuments(filter);
  }
}

async function withModel(
  run: (
    model: Model<UserShape>,
    collection: SinterCollection<UserShape>,
    client: SinterClient,
  ) => Promise<void>,
): Promise<void> {
  await withTestServer(async ({ uri }) => {
    const client = new SinterClient(`${uri}/odm`);

    try {
      await client.connect();

      const collection = client.db().collection<UserShape>("users");

      await run(new Model(collection), collection, client);
    } finally {
      await client.close();
    }
  });
}

describe("what the ODM builds on the public driver API", () => {
  it("creates, queries, updates, and counts through typed filters", async () => {
    await withModel(async (model) => {
      await model.create({ name: "Ada", age: 36, team: "a" });
      await model.create({ name: "Grace", age: 45, team: "a" });
      await model.create({ name: "Linus", age: 28, team: "b" });

      const team = await model.findMany(
        { team: "a" },
        { sort: [["age", -1]], limit: 5 },
      );

      expect(team.map((user) => user.name)).toEqual(["Grace", "Ada"]);
      expect(team[0]?._id).toBeInstanceOf(CustomId);
      expect(await model.update({ team: "a" }, { $inc: { age: 1 } })).toBe(2);
      expect(await model.count({ age: { $gt: 36 } })).toBe(2);
    });
  });

  it("creates indexes, reads them back, and validates them", async () => {
    await withModel(async (_model, users) => {
      await users.insertMany([
        { name: "Ada", age: 36, team: "a" },
        { name: "Linus", age: 28, team: "b" },
      ]);

      const created = await users.createIndex({
        keys: [
          ["team", 1],
          ["age", 1],
        ],
        unique: false,
      });
      const indexes = await users.indexes();

      expect(indexes.map((index) => index.name)).toContain(created.name);
      expect((await users.validateIndexes()).valid).toBe(true);
    });
  });

  it("runs an aggregation with a query budget", async () => {
    await withModel(async (_model, users) => {
      await users.insertMany([
        { name: "Ada", age: 36, team: "a" },
        { name: "Grace", age: 45, team: "a" },
        { name: "Linus", age: 28, team: "b" },
      ]);

      const totals = await users
        .aggregate<{ _id: string; total: number }>(
          [
            { $group: { _id: "$team", total: { $sum: "$age" } } },
            { $sort: [["_id", 1]] },
          ],
          { maxTimeMS: 5000, maxScanned: 100 },
        )
        .toArray();

      expect(totals).toEqual([
        { _id: "a", total: 81 },
        { _id: "b", total: 28 },
      ]);
    });
  });

  it("tells a server error from a client error by class and code", async () => {
    await withModel(async (_model, users) => {
      await users.insertMany([
        { name: "Ada", age: 36, team: "a" },
        { name: "Grace", age: 45, team: "a" },
        { name: "Linus", age: 28, team: "b" },
      ]);

      const failure: unknown = await users
        .find({}, { maxScanned: 1 })
        .toArray()
        .then(
          () => undefined,
          (error: unknown) => error,
        );

      // The driver's errors form one hierarchy that an ODM can map to its own.
      expect(failure).toBeInstanceOf(SinterError);
      expect(failure).toBeInstanceOf(SinterServerError);
      expect((failure as SinterServerError).code).toBe(
        SinterErrorCode.ServerError,
      );

      expect(new SinterCompatibilityError("x")).toBeInstanceOf(SinterError);
    });
  });
});

describe("the public entry point", () => {
  it("is the only path the ODM test imports from", () => {
    const specifiers = [
      ...SOURCE.matchAll(
        /^\s*\} from "([^"]+)";|^import "([^"]+)";|^import .* from "([^"]+)";/gm,
      ),
    ].map((match) => match[1] ?? match[2] ?? match[3]);

    expect(specifiers.sort()).toEqual([
      "@sinterdb-internal/test-utils",
      "node:fs",
      "node:url",
      "sinterdb",
      "vitest",
    ]);
  });

  it("cannot be reached through a path other than the package root", async () => {
    const reach = (path: string): Promise<unknown> =>
      import(/* @vite-ignore */ path);

    await expect(reach("sinterdb/dist/client.js")).rejects.toThrow();
    await expect(reach("sinterdb/src/index.ts")).rejects.toThrow();
  });
});
