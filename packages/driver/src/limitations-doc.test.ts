import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { withTestServer } from "@sinterdb-internal/test-utils";
import { describe, expect, it } from "vitest";

import { SinterClient } from "./client.js";
import { SinterErrorCode, SinterServerError } from "./errors.js";

// docs/limitations.md says what SinterDB does not do. Each statement below is
// run against a real server, so the page cannot go on claiming a limitation
// that has been lifted, or hide one that has appeared. When a test here fails
// because a feature now exists, update the page and then this test.

const markdown = readFileSync(
  fileURLToPath(new URL("../../../docs/limitations.md", import.meta.url)),
  "utf8",
);

async function inDatabase(
  run: (client: SinterClient) => Promise<void>,
): Promise<void> {
  await withTestServer(async ({ uri }) => {
    const client = new SinterClient(`${uri}/limits`);

    await client.connect();

    try {
      await run(client);
    } finally {
      await client.close();
    }
  });
}

async function serverError(
  promise: Promise<unknown>,
): Promise<SinterServerError> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );

  expect(error).toBeInstanceOf(SinterServerError);

  return error as SinterServerError;
}

describe("docs/limitations.md: queries", () => {
  const unsupportedFilters = [
    "$regex",
    "$all",
    "$type",
    "$mod",
    "$expr",
    "$text",
    "$where",
  ];

  it.each(unsupportedFilters)(
    "rejects the filter operator %s",
    async (operator) => {
      expect(markdown).toContain(`\`${operator}\``);

      await inDatabase(async (client) => {
        const items = client.db().collection<Record<string, unknown>>("items");

        await items.insertOne({ field: 1 });
        const error = await serverError(
          items.find({ field: { [operator]: 1 } } as never).toArray(),
        );

        expect(error.serverErrorName).toBe("DocumentValidationFailed");
      });
    },
  );

  it("accepts every operator the page lists as supported", async () => {
    const section = markdown.slice(
      markdown.indexOf("Supported filter operators"),
    );
    const listed = [
      ...(section.split("\n\n")[0] ?? "").matchAll(/`(\$[a-zA-Z]+)`/g),
    ];

    expect(listed.length).toBeGreaterThanOrEqual(15);

    await inDatabase(async (client) => {
      const items = client.db().collection<Record<string, unknown>>("items");

      await items.insertOne({ n: 1 });

      for (const [, operator] of listed) {
        const filter =
          operator === "$and" || operator === "$or" || operator === "$nor"
            ? { [operator as string]: [{ n: 1 }] }
            : operator === "$not"
              ? { n: { $not: { $eq: 2 } } }
              : operator === "$in" || operator === "$nin"
                ? { n: { [operator as string]: [1] } }
                : operator === "$exists"
                  ? { n: { $exists: true } }
                  : operator === "$elemMatch"
                    ? { n: { $elemMatch: { $gt: 0 } } }
                    : { n: { [operator as string]: 1 } };

        await expect(
          items.find(filter as never).toArray(),
        ).resolves.toBeDefined();
      }
    });
  });

  it("has no count, distinct or aggregation", async () => {
    await inDatabase(async (client) => {
      const items = client.db().collection("items");
      const names = Object.getOwnPropertyNames(Object.getPrototypeOf(items));

      for (const missing of [
        "countDocuments",
        "estimatedDocumentCount",
        "count",
        "distinct",
        "aggregate",
        "findOneAndUpdate",
        "findOneAndReplace",
        "findOneAndDelete",
        "bulkWrite",
        "watch",
      ]) {
        expect(names, missing).not.toContain(missing);
      }
    });
  });

  it("rejects a limit of 0 and a batchSize outside 1 to 10,000", async () => {
    await inDatabase(async (client) => {
      const items = client.db().collection("items");

      await items.insertOne({ n: 1 });

      expect(
        (await serverError(items.find({}, { limit: 0 }).toArray()))
          .serverErrorName,
      ).toBe("InvalidRequest");
      expect(
        (await serverError(items.find({}, { batchSize: 0 }).toArray()))
          .serverErrorName,
      ).toBe("InvalidRequest");
      expect(
        (await serverError(items.find({}, { batchSize: 10_001 }).toArray()))
          .serverErrorName,
      ).toBe("InvalidRequest");
      await expect(
        items.find({}, { batchSize: 10_000 }).toArray(),
      ).resolves.toHaveLength(1);
    });
  });
});

describe("docs/limitations.md: updates and transactions", () => {
  it.each(["$mul", "$rename", "$pop"])(
    "rejects the update operator %s",
    async (operator) => {
      expect(markdown).toContain(`\`${operator}\``);

      await inDatabase(async (client) => {
        const items = client.db().collection<Record<string, unknown>>("items");

        await items.insertOne({ n: 1 });

        const error = await serverError(
          items.updateOne({}, { [operator]: { n: 1 } } as never),
        );

        expect(error.serverErrorName).toBe("InvalidUpdate");
      });
    },
  );

  it("applies updateMany completely or not at all", async () => {
    await inDatabase(async (client) => {
      const items = client
        .db()
        .collection<{ k: number; s: number | string }>("items");

      await items.insertMany([
        { k: 1, s: 1 },
        { k: 2, s: "text" },
      ]);

      await serverError(items.updateMany({}, { $inc: { s: 1 } } as never));

      const after = await items.find({}, { sort: [["k", 1]] }).toArray();

      expect(after.map((item) => item.s)).toEqual([1, "text"]);
    });
  });

  it("keeps the documents before the failure when insertMany fails", async () => {
    await inDatabase(async (client) => {
      const items = client.db().collection<Record<string, unknown>>("items");
      const first = await items.insertOne({ n: 1 });

      const error = await serverError(
        items.insertMany([{ n: 2 }, { _id: first.insertedId, n: 3 }, { n: 4 }]),
      );

      expect(error.name).toBe("SinterInsertManyError");
      expect((error as unknown as { failedIndex: number }).failedIndex).toBe(1);
      expect(await items.find().toArray()).toHaveLength(2);
    });
  });
});

describe("docs/limitations.md: managing data", () => {
  it("cannot drop, create, or rename collections and databases", async () => {
    await inDatabase(async (client) => {
      const members = [
        ...Object.getOwnPropertyNames(Object.getPrototypeOf(client)),
        ...Object.getOwnPropertyNames(Object.getPrototypeOf(client.db())),
        ...Object.getOwnPropertyNames(
          Object.getPrototypeOf(client.db().collection("x")),
        ),
      ];

      for (const missing of [
        "dropCollection",
        "dropDatabase",
        "drop",
        "createCollection",
        "renameCollection",
      ]) {
        expect(members, missing).not.toContain(missing);
      }
    });
  });

  it("leaves an empty collection behind after deleteMany({})", async () => {
    await inDatabase(async (client) => {
      const items = client.db().collection("items");

      await items.insertOne({ n: 1 });
      await items.deleteMany({});

      expect(await items.find().toArray()).toEqual([]);
      expect(await client.db().listCollections()).toContain("items");
    });
  });

  it("creates a collection on the first insert or the first index", async () => {
    await inDatabase(async (client) => {
      const database = client.db();

      expect(await database.listCollections()).toEqual([]);

      // Getting a handle sends nothing.
      database.collection("handle-only");
      expect(await database.listCollections()).toEqual([]);

      await database.collection("by-index").createIndex({ field: "n" });
      await database.collection("by-insert").insertOne({ n: 1 });

      expect((await database.listCollections()).sort()).toEqual([
        "by-index",
        "by-insert",
      ]);
    });
  });
});

describe("docs/limitations.md: documents", () => {
  it("returns fields sorted by name, not in the order written", async () => {
    await inDatabase(async (client) => {
      const items = client.db().collection<Record<string, unknown>>("items");

      await items.insertOne({ b: 1, a: 2, c: { z: 1, y: 2 } });

      const found = await items.findOne({});

      expect(Object.keys(found ?? {})).toEqual(["_id", "a", "b", "c"]);
      expect(Object.keys((found?.["c"] as object) ?? {})).toEqual(["y", "z"]);
    });
  });

  it("accepts only a CustomId as _id", async () => {
    await inDatabase(async (client) => {
      const items = client.db().collection<Record<string, unknown>>("items");

      for (const id of ["abc", 7]) {
        const error = await serverError(items.insertOne({ _id: id } as never));

        expect(error.serverErrorName).toBe("DocumentValidationFailed");
      }
    });
  });

  it("treats 1 and 1n as different values", async () => {
    await inDatabase(async (client) => {
      const items = client.db().collection<Record<string, unknown>>("items");

      await items.insertOne({ n: 1 });

      expect(await items.find({ n: 1 }).toArray()).toHaveLength(1);
      expect(await items.find({ n: 1n }).toArray()).toHaveLength(0);
    });
  });
});

describe("docs/limitations.md: limits that the server enforces", () => {
  it("accepts a 255-byte name and rejects a 256-byte one", async () => {
    await inDatabase(async (client) => {
      await expect(
        client.db().collection("a".repeat(255)).insertOne({ n: 1 }),
      ).resolves.toMatchObject({ acknowledged: true });

      const error = await serverError(
        client.db().collection("a".repeat(256)).insertOne({ n: 1 }),
      );

      expect(error.serverErrorName).toBe("InvalidRequest");
    });
  });

  it("allows 32 indexes besides _id and refuses the 33rd", async () => {
    await inDatabase(async (client) => {
      const items = client.db().collection<Record<string, number>>("items");

      for (let index = 0; index < 32; index += 1) {
        await items.createIndex({ field: `f${index}` });
      }

      const error = await serverError(items.createIndex({ field: "f32" }));

      expect(error.serverErrorName).toBe("IndexConflict");
    });
  });
});

describe("docs/limitations.md: the driver", () => {
  it("does not reconnect after the connection is lost", async () => {
    await withTestServer(async ({ uri, close }) => {
      const client = new SinterClient(`${uri}/limits`);
      const items = client.db().collection("items");
      const closed = new Promise<void>((resolve) =>
        client.once("closed", () => resolve()),
      );

      await client.connect();
      await items.insertOne({ n: 1 });
      await close();
      await closed;

      expect(client.connected).toBe(false);
      expect(client.state).toBe("closed");

      await expect(items.find().toArray()).rejects.toMatchObject({
        code: SinterErrorCode.ClientNotConnected,
      });
      await expect(client.connect()).rejects.toMatchObject({
        code: SinterErrorCode.ClientClosed,
      });
    });
  });
});
