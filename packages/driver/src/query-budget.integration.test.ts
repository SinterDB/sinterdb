import { withTestServer } from "@sinterdb-internal/test-utils";
import type { CustomId } from "sinterdb-protocol";
import { describe, expect, it, vi } from "vitest";

import { SinterClient } from "./client.js";
import type { SinterCollection } from "./collection.js";
import { SinterCompatibilityError, SinterServerError } from "./errors.js";

interface Item {
  _id: CustomId;
  n: number;
  team: string;
}

async function withItems(
  run: (items: SinterCollection<Item>) => Promise<void>,
): Promise<void> {
  await withTestServer(async ({ uri }) => {
    const client = new SinterClient(`${uri}/application`);

    try {
      await client.connect();

      const items = client.db().collection<Item>("items");

      await items.insertMany(
        Array.from({ length: 10 }, (_, index) => ({
          n: index,
          team: index % 2 === 0 ? "a" : "b",
        })),
      );
      await run(items);
    } finally {
      await client.close();
    }
  });
}

async function serverError(
  promise: Promise<unknown>,
): Promise<SinterServerError> {
  const error: unknown = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  );

  expect(error).toBeInstanceOf(SinterServerError);

  return error as SinterServerError;
}

describe("query budgets through the driver", () => {
  it("advertises the capability", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();
        expect(client.serverInfo?.capabilities).toContain("query-budgets");
      } finally {
        await client.close();
      }
    });
  });

  it("lets operations within their limits run", async () => {
    await withItems(async (items) => {
      const budget = { maxScanned: 10, maxTimeMS: 60_000 };

      expect(await items.find({}, budget).toArray()).toHaveLength(10);
      expect(await items.findOne({ n: 3 }, budget)).toMatchObject({ n: 3 });
      expect(await items.countDocuments({ team: "a" }, budget)).toBe(5);
      expect(await items.distinct("team", {}, budget)).toEqual(["a", "b"]);
      expect(
        await items.aggregate([{ $count: "n" }], budget).toArray(),
      ).toEqual([{ n: 10 }]);
    });
  });

  it("fails an operation that examines too many documents", async () => {
    await withItems(async (items) => {
      const budget = { maxScanned: 3 };
      const operations: Promise<unknown>[] = [
        items.find({}, budget).toArray(),
        items.findOne({ n: 9 }, budget),
        items.countDocuments({ team: "a" }, budget),
        items.distinct("team", {}, budget),
        items.aggregate([{ $count: "n" }], budget).toArray(),
      ];

      for (const operation of operations) {
        const error = await serverError(operation);

        expect(error.serverErrorName).toBe("ScanLimitExceeded");
        expect(error.wireCode).toBe(7001);
      }
    });
  });

  it("gives each batch of a cursor its own budget", async () => {
    await withItems(async (items) => {
      const found = await items
        .find({}, { batchSize: 3, maxScanned: 4 })
        .toArray();

      expect(found).toHaveLength(10);

      const aggregated = await items
        .aggregate([{ $project: { _id: 0, n: 1 } }], {
          batchSize: 3,
          maxScanned: 4,
        })
        .toArray();

      expect(aggregated).toHaveLength(10);
    });
  });

  it("sends the limits again with every getMore", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const items = client.db().collection<Item>("items");

        await items.insertMany(
          Array.from({ length: 6 }, (_, index) => ({ n: index, team: "a" })),
        );

        const executeCommand = vi.spyOn(client, "executeCommand");

        await items
          .find({}, { batchSize: 2, maxScanned: 4, maxTimeMS: 60_000 })
          .toArray();
        await items
          .aggregate([{ $limit: 6 }], { batchSize: 2, maxScanned: 4 })
          .toArray();

        const calls = executeCommand.mock.calls.filter(
          ([, command]) => command === "getMore",
        );

        expect(calls.length).toBeGreaterThanOrEqual(4);

        for (const [, , parameters] of calls) {
          expect(parameters).toMatchObject({ maxScanned: 4 });
        }

        expect(calls[0]?.[2]).toMatchObject({ maxTimeMS: 60_000 });
      } finally {
        await client.close();
      }
    });
  });

  it("fails a cursor whose batch is over budget", async () => {
    await withItems(async (items) => {
      const cursor = items.find({}, { batchSize: 5, maxScanned: 5 });

      const error = await serverError(cursor.toArray());

      expect(error.serverErrorName).toBe("ScanLimitExceeded");
    });
  });

  it("reports a bad limit as an invalid request", async () => {
    await withItems(async (items) => {
      for (const budget of [
        { maxTimeMS: 0 },
        { maxScanned: -1 },
        { maxScanned: 1.5 },
      ]) {
        const error = await serverError(items.find({}, budget).toArray());

        expect(error.serverErrorName).toBe("InvalidRequest");
      }
    });
  });
});

describe("query budgets against an older server", () => {
  function oldClient(): SinterClient {
    const client = new SinterClient("sinterdb://127.0.0.1/application");

    vi.spyOn(client, "serverInfo", "get").mockReturnValue({
      protocolVersion: 1,
      product: "sinterdb",
      productVersion: "0.2.0",
      capabilities: ["typed-documents", "streaming", "projection"],
    } as never);

    return client;
  }

  it("refuses to send a limit to a server without the capability", async () => {
    const client = oldClient();
    const executeCommand = vi.spyOn(client, "executeCommand");
    const items = client.db().collection<Item>("items");

    await expect(
      items.find({}, { maxTimeMS: 100 }).toArray(),
    ).rejects.toBeInstanceOf(SinterCompatibilityError);
    await expect(
      items.countDocuments({}, { maxScanned: 100 }),
    ).rejects.toBeInstanceOf(SinterCompatibilityError);
    await expect(items.findOne({}, { maxScanned: 100 })).rejects.toBeInstanceOf(
      SinterCompatibilityError,
    );
    expect(executeCommand).not.toHaveBeenCalled();
  });

  it("still sends operations that have no limits", async () => {
    const client = oldClient();
    const executeCommand = vi
      .spyOn(client, "executeCommand")
      .mockResolvedValue({ count: 0 });
    const items = client.db().collection<Item>("items");

    await expect(items.countDocuments({})).resolves.toBe(0);
    expect(executeCommand).toHaveBeenCalledOnce();
  });
});
