import { withTestServer } from "@sinterdb-internal/test-utils";
import { CustomId } from "sinterdb-protocol";
import { describe, expect, expectTypeOf, it } from "vitest";

import { SinterClient } from "./client.js";
import { SinterServerError } from "./errors.js";

interface Person {
  _id: CustomId;
  name: string;
  age: number;
  team: string;
  nickname?: string;
  tags: string[];
  orders: { sku: string; qty: number }[];
}

const people = [
  {
    name: "Ada",
    age: 36,
    team: "a",
    tags: ["math", "code"],
    orders: [{ sku: "x", qty: 1 }],
  },
  {
    name: "Grace",
    age: 85,
    team: "b",
    tags: ["code"],
    orders: [
      { sku: "y", qty: 2 },
      { sku: "x", qty: 3 },
    ],
  },
  {
    name: "Katherine",
    age: 101,
    team: "a",
    nickname: "Kat",
    tags: [],
    orders: [],
  },
];

describe("countDocuments", () => {
  it("counts all or matching documents", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Person>("people");

        await collection.insertMany(people);

        expect(await collection.countDocuments()).toBe(3);
        expect(await collection.countDocuments({})).toBe(3);
        expect(await collection.countDocuments({ team: "a" })).toBe(2);
        expect(await collection.countDocuments({ age: { $gt: 90 } })).toBe(1);
        expect(await collection.countDocuments({ tags: "code" })).toBe(2);
        expect(await collection.countDocuments({ name: "Nobody" })).toBe(0);
      } finally {
        await client.close();
      }
    });
  });

  it("follows writes", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Person>("people");

        await collection.insertMany(people);
        await collection.deleteOne({ name: "Ada" });
        await collection.updateMany({}, { $set: { team: "z" } });

        expect(await collection.countDocuments()).toBe(2);
        expect(await collection.countDocuments({ team: "z" })).toBe(2);
      } finally {
        await client.close();
      }
    });
  });

  it("counts zero in a collection that does not exist", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Person>("missing");

        expect(await collection.countDocuments()).toBe(0);
        expect(await collection.countDocuments({ team: "a" })).toBe(0);
        expect(await collection.estimatedDocumentCount()).toBe(0);
      } finally {
        await client.close();
      }
    });
  });

  it("rejects an invalid filter, whether or not the collection exists", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const bad = { age: { $nope: 1 } } as never;
        const real = client.db().collection<Person>("people");

        await real.insertMany(people);

        await expect(real.countDocuments(bad)).rejects.toThrow(
          SinterServerError,
        );
        await expect(
          client.db().collection<Person>("missing").countDocuments(bad),
        ).rejects.toThrow(SinterServerError);
        await expect(
          client.db().collection<Person>("missing").find(bad).toArray(),
        ).rejects.toThrow(SinterServerError);
        await expect(
          client.db().collection<Person>("missing").findOne(bad),
        ).rejects.toThrow(SinterServerError);
      } finally {
        await client.close();
      }
    });
  });
});

describe("estimatedDocumentCount", () => {
  it("counts the whole collection", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Person>("people");

        await collection.insertMany(people);

        expect(await collection.estimatedDocumentCount()).toBe(3);

        await collection.deleteMany({ team: "a" });

        expect(await collection.estimatedDocumentCount()).toBe(1);
      } finally {
        await client.close();
      }
    });
  });
});

describe("distinct", () => {
  it("returns distinct values in order, typed", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Person>("people");

        await collection.insertMany(people);

        const teams = await collection.distinct("team");
        const ages = await collection.distinct("age", { team: "a" });
        const nicknames = await collection.distinct("nickname");

        expect(teams).toEqual(["a", "b"]);
        expect(ages).toEqual([36, 101]);
        expect(nicknames).toEqual(["Kat"]);
        expectTypeOf(teams).toEqualTypeOf<string[]>();
        expectTypeOf(ages).toEqualTypeOf<number[]>();
        expectTypeOf(nicknames).toEqualTypeOf<string[]>();
      } finally {
        await client.close();
      }
    });
  });

  it("returns the elements of arrays and paths through arrays", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Person>("people");

        await collection.insertMany(people);

        const tags = await collection.distinct("tags");
        const skus = await collection.distinct("orders.sku");

        expect(tags).toEqual(["code", "math"]);
        expect(skus).toEqual(["x", "y"]);
        expectTypeOf(tags).toEqualTypeOf<string[]>();
        expectTypeOf(skus).toEqualTypeOf<string[]>();
      } finally {
        await client.close();
      }
    });
  });

  it("returns ids, dates, bigints, and nulls as their own types", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection("mixed");
        const date = new Date(1_000);

        await collection.insertMany([
          { v: 1 },
          { v: 1n },
          { v: date },
          { v: null },
          { v: date },
        ]);

        const values = await collection.distinct("v");

        expect(values).toEqual([null, 1, 1n, date]);

        const ids = await collection.distinct("_id");

        expect(ids).toHaveLength(5);
        expect(ids.every((id) => id instanceof CustomId)).toBe(true);
      } finally {
        await client.close();
      }
    });
  });

  it("returns nothing for a missing field or collection", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Person>("people");

        await collection.insertMany(people);

        expect(await collection.distinct("nickname", { team: "b" })).toEqual(
          [],
        );
        expect(
          await client.db().collection<Person>("missing").distinct("team"),
        ).toEqual([]);
      } finally {
        await client.close();
      }
    });
  });

  it("rejects an invalid field or filter", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Person>("people");

        await collection.insertMany(people);

        await expect(collection.distinct("$team" as never)).rejects.toThrow(
          SinterServerError,
        );
        await expect(
          collection.distinct("team", { age: { $nope: 1 } } as never),
        ).rejects.toThrow(SinterServerError);
        await expect(
          client
            .db()
            .collection<Person>("missing")
            .distinct("team", { age: { $nope: 1 } } as never),
        ).rejects.toThrow(SinterServerError);
      } finally {
        await client.close();
      }
    });
  });
});
