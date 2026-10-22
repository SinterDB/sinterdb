import { withTestServer } from "@sinterdb-internal/test-utils";
import { CustomId } from "sinterdb-protocol";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { SinterClient } from "./client.js";
import { SinterCompatibilityError, SinterServerError } from "./errors.js";

interface Person {
  _id: CustomId;
  name: string;
  age: number;
  secret: string;
  nickname?: string;
  profile: { level: number; bio: string };
  orders: { sku: string; qty: number }[];
}

const people = [
  {
    name: "Ada",
    age: 36,
    secret: "a",
    profile: { level: 2, bio: "math" },
    orders: [{ sku: "x", qty: 1 }],
  },
  {
    name: "Grace",
    age: 85,
    secret: "g",
    profile: { level: 3, bio: "navy" },
    orders: [
      { sku: "y", qty: 2 },
      { sku: "z", qty: 3 },
    ],
  },
  {
    name: "Katherine",
    age: 101,
    secret: "k",
    nickname: "Kat",
    profile: { level: 1, bio: "nasa" },
    orders: [],
  },
];

describe("projection integration", () => {
  it("returns only the included fields, typed", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Person>("people");

        await collection.insertMany(people);

        const found = await collection
          .find({}, { projection: { name: 1, age: 1 }, sort: [["age", 1]] })
          .toArray();

        expectTypeOf(found[0]?.name).toEqualTypeOf<string | undefined>();
        expect(found.map((person) => Object.keys(person))).toEqual([
          ["_id", "age", "name"],
          ["_id", "age", "name"],
          ["_id", "age", "name"],
        ]);
        expect(found[0]?._id).toBeInstanceOf(CustomId);
        expect(found.map((person) => person.name)).toEqual([
          "Ada",
          "Grace",
          "Katherine",
        ]);
      } finally {
        await client.close();
      }
    });
  });

  it("can leave out _id", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Person>("people");

        await collection.insertMany(people);

        const found = await collection
          .find({}, { projection: { name: 1, _id: 0 }, sort: [["age", -1]] })
          .toArray();

        expect(found).toEqual([
          { name: "Katherine" },
          { name: "Grace" },
          { name: "Ada" },
        ]);

        const ids = await collection
          .find({}, { projection: { _id: 1 } })
          .toArray();

        expect(ids.every((doc) => doc._id instanceof CustomId)).toBe(true);
        expect(ids.every((doc) => Object.keys(doc).length === 1)).toBe(true);
      } finally {
        await client.close();
      }
    });
  });

  it("excludes fields", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Person>("people");

        await collection.insertMany(people);

        const found = await collection
          .find({ name: "Grace" }, { projection: { secret: 0, orders: 0 } })
          .toArray();

        expect(found).toHaveLength(1);
        expect(Object.keys(found[0] ?? {})).toEqual([
          "_id",
          "age",
          "name",
          "profile",
        ]);
      } finally {
        await client.close();
      }
    });
  });

  it("projects nested paths and arrays of documents", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Person>("people");

        await collection.insertMany(people);

        const found = await collection
          .find(
            { name: "Grace" },
            { projection: { "profile.level": 1, "orders.sku": 1, _id: 0 } },
          )
          .toArray();

        expect(found).toEqual([
          {
            profile: { level: 3 },
            orders: [{ sku: "y" }, { sku: "z" }],
          },
        ]);

        expectTypeOf(found[0]?.orders).toEqualTypeOf<
          { sku: string }[] | undefined
        >();
      } finally {
        await client.close();
      }
    });
  });

  it("projects across batches", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Person>("people");

        await collection.insertMany(people);

        const names: string[] = [];

        for await (const person of collection.find(
          {},
          { projection: { name: 1, _id: 0 }, batchSize: 1, sort: [["age", 1]] },
        )) {
          names.push(person.name);
        }

        expect(names).toEqual(["Ada", "Grace", "Katherine"]);
      } finally {
        await client.close();
      }
    });
  });

  it("projects findOne", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Person>("people");

        await collection.insertMany(people);

        const person = await collection.findOne(
          { name: "Ada" },
          { projection: { age: 1, _id: 0 } },
        );

        expect(person).toEqual({ age: 36 });
        expectTypeOf(person).toEqualTypeOf<{ age: number } | null>();

        expect(
          await collection.findOne(
            { name: "Nobody" },
            { projection: { age: 1 } },
          ),
        ).toBeNull();

        const whole = await collection.findOne({ name: "Ada" });

        expect(whole?.secret).toBe("a");
      } finally {
        await client.close();
      }
    });
  });

  it("returns whole documents without a projection", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Person>("people");

        await collection.insertMany(people);

        const found = await collection.find({ name: "Ada" }, {}).toArray();

        expect(found[0]?.secret).toBe("a");
        expect(
          await collection.find({ name: "Ada" }, { projection: {} }).toArray(),
        ).toEqual(found);
      } finally {
        await client.close();
      }
    });
  });

  it("rejects an invalid projection", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Person>("people");

        await collection.insertMany(people);

        const mixed = { name: 1, secret: 0 } as never;

        await expect(
          collection.find({}, { projection: mixed }).toArray(),
        ).rejects.toThrow(SinterServerError);
        await expect(
          collection.findOne({}, { projection: mixed }),
        ).rejects.toThrow(SinterServerError);
      } finally {
        await client.close();
      }
    });
  });
});

describe("projection against an older server", () => {
  function clientWithCapabilities(capabilities: readonly string[]): {
    client: SinterClient;
    executeCommand: ReturnType<typeof vi.spyOn>;
  } {
    const client = new SinterClient("sinterdb://127.0.0.1/application");

    vi.spyOn(client, "serverInfo", "get").mockReturnValue({
      protocolVersion: 1,
      product: "sinterdb",
      productVersion: "0.2.0",
      capabilities,
    });

    const executeCommand = vi
      .spyOn(client, "executeCommand")
      .mockResolvedValue({ cursorId: null, documents: [] });

    return { client, executeCommand };
  }

  it("refuses to send a projection to a server without the capability", async () => {
    const { client, executeCommand } = clientWithCapabilities([
      "typed-documents",
      "streaming",
    ]);
    const collection = client.db().collection<Person>("people");

    await expect(
      collection.find({}, { projection: { name: 1 } }).toArray(),
    ).rejects.toBeInstanceOf(SinterCompatibilityError);
    await expect(
      collection.findOne({}, { projection: { name: 1 } }),
    ).rejects.toBeInstanceOf(SinterCompatibilityError);

    expect(executeCommand).not.toHaveBeenCalled();
  });

  it("still sends queries without a projection", async () => {
    const { client, executeCommand } = clientWithCapabilities([
      "typed-documents",
      "streaming",
    ]);
    const collection = client.db().collection<Person>("people");

    await collection.find({}).toArray();

    expect(executeCommand).toHaveBeenCalledTimes(1);
  });

  it("sends the projection when the server advertises the capability", async () => {
    const { client, executeCommand } = clientWithCapabilities([
      "typed-documents",
      "streaming",
      "projection",
    ]);
    const collection = client.db().collection<Person>("people");

    await collection.find({}, { projection: { name: 1 } }).toArray();

    expect(executeCommand).toHaveBeenCalledWith(
      "application",
      "find",
      expect.objectContaining({ projection: { name: 1 } }),
    );
  });
});
