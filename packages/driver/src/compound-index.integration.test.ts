import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { startTestServer, withTestServer } from "@sinterdb-internal/test-utils";
import { type CustomId, WireErrorCode } from "sinterdb-protocol";
import { describe, expect, it, vi } from "vitest";

import { SinterClient } from "./client.js";
import type { SinterCollection } from "./collection.js";
import {
  SinterCompatibilityError,
  SinterProtocolError,
  SinterServerError,
} from "./errors.js";

interface Item {
  _id: CustomId;
  shop: string;
  kind: string;
  qty: number;
  note?: string;
}

async function withItems(
  run: (items: SinterCollection<Item>) => Promise<void>,
): Promise<void> {
  await withTestServer(async ({ uri }) => {
    const client = new SinterClient(`${uri}/application`);

    try {
      await client.connect();

      const items = client.db().collection<Item>("items");

      await items.insertMany([
        { shop: "north", kind: "tea", qty: 5 },
        { shop: "north", kind: "tea", qty: 7 },
        { shop: "north", kind: "coffee", qty: 1 },
        { shop: "south", kind: "tea", qty: 2 },
        { shop: "south", kind: "coffee", qty: 9 },
      ]);
      await run(items);
    } finally {
      await client.close();
    }
  });
}

describe("compound indexes through the driver", () => {
  it("sees the capability on a 0.3.0 server", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        expect(client.serverInfo?.capabilities).toContain("compound-indexes");
      } finally {
        await client.close();
      }
    });
  });

  it("creates one, lists it with every field, and drops it", async () => {
    await withItems(async (items) => {
      expect(
        await items.createIndex({
          keys: [
            ["shop", 1],
            ["qty", -1],
          ],
        }),
      ).toEqual({ acknowledged: true, name: "shop_1_qty_-1", created: true });

      expect((await items.indexes())[1]).toEqual({
        name: "shop_1_qty_-1",
        field: "shop",
        direction: 1,
        keys: [
          { field: "shop", direction: 1 },
          { field: "qty", direction: -1 },
        ],
        unique: false,
        sparse: false,
      });

      await items.dropIndex("shop_1_qty_-1");

      expect(await items.indexes()).toHaveLength(1);
    });
  });

  it("answers queries that fix the leading fields", async () => {
    await withItems(async (items) => {
      await items.createIndex({
        keys: [
          ["shop", 1],
          ["kind", 1],
        ],
      });

      expect(await items.find({ shop: "north" }).explain()).toMatchObject({
        stage: "IXSCAN",
        index: "shop_1_kind_1",
        field: "shop",
        fields: ["shop", "kind"],
        prefixLength: 1,
        access: "equality",
      });
      expect(
        await items.find({ shop: "north", kind: "tea" }).explain(),
      ).toMatchObject({ prefixLength: 2, estimatedCandidates: 2 });
      expect((await items.find({ kind: "tea" }).explain()).stage).toBe(
        "COLLSCAN",
      );

      const found = await items
        .find({ shop: "north", kind: "tea" }, { sort: [["qty", 1]] })
        .toArray();

      expect(found.map((item) => item.qty)).toEqual([5, 7]);
      expect((await items.validateIndexes()).valid).toBe(true);
    });
  });

  it("answers ranges and $in on a compound index", async () => {
    await withItems(async (items) => {
      await items.createIndex({
        keys: [
          ["shop", 1],
          ["qty", -1],
        ],
      });

      const range = { shop: "north", qty: { $gte: 5 } };

      expect(await items.find(range).explain()).toMatchObject({
        stage: "IXSCAN",
        fields: ["shop", "qty"],
        prefixLength: 1,
        access: "range",
        lower: { value: 5, inclusive: true },
      });
      expect(
        (await items.find(range).toArray()).map((item) => item.qty),
      ).toEqual([5, 7]);

      const members = { shop: { $in: ["north", "south"] }, qty: 2 };

      expect(await items.find(members).explain()).toMatchObject({
        prefixLength: 2,
        access: "in",
      });
      expect(await items.countDocuments(members)).toBe(1);
    });
  });

  it("enforces a unique compound index", async () => {
    await withItems(async (items) => {
      await items.createIndex({
        keys: [
          ["shop", 1],
          ["kind", 1],
          ["qty", 1],
        ],
        unique: true,
      });

      await items.insertOne({ shop: "north", kind: "tea", qty: 99 });

      const error: unknown = await items
        .insertOne({ shop: "north", kind: "tea", qty: 5 })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(SinterServerError);
      expect((error as SinterServerError).wireCode).toBe(
        WireErrorCode.DuplicateKey,
      );
    });
  });

  it("reports invalid and conflicting definitions", async () => {
    await withItems(async (items) => {
      const invalid: unknown = await items
        .createIndex({
          keys: [
            ["shop", 1],
            ["shop", -1],
          ],
        })
        .catch((caught: unknown) => caught);

      expect((invalid as SinterServerError).wireCode).toBe(
        WireErrorCode.InvalidIndex,
      );

      await items.createIndex({
        keys: [
          ["shop", 1],
          ["kind", 1],
        ],
      });

      const conflict: unknown = await items
        .createIndex({
          keys: [
            ["shop", -1],
            ["kind", 1],
          ],
        })
        .catch((caught: unknown) => caught);

      expect((conflict as SinterServerError).wireCode).toBe(
        WireErrorCode.IndexConflict,
      );
    });
  });

  it("keeps a compound index across a server restart", async () => {
    const directory = mkdtempSync(join(tmpdir(), "sinterdb-compound-"));

    try {
      const first = await startTestServer({ dataDirectory: directory });
      const firstClient = new SinterClient(`${first.uri}/application`);

      await firstClient.connect();

      const firstItems = firstClient.db().collection<Item>("items");

      await firstItems.insertMany([
        { shop: "a", kind: "x", qty: 1 },
        { shop: "a", kind: "y", qty: 2 },
        { shop: "b", kind: "x", qty: 3 },
      ]);
      await firstItems.createIndex({
        keys: [
          ["shop", 1],
          ["kind", -1],
        ],
        unique: true,
      });
      await firstClient.close();
      await first.close();

      const second = await startTestServer({ dataDirectory: directory });
      const secondClient = new SinterClient(`${second.uri}/application`);

      await secondClient.connect();

      const secondItems = secondClient.db().collection<Item>("items");

      try {
        expect((await secondItems.indexes())[1]).toMatchObject({
          name: "shop_1_kind_-1",
          keys: [
            { field: "shop", direction: 1 },
            { field: "kind", direction: -1 },
          ],
          unique: true,
        });
        expect(
          await secondItems.find({ shop: "a", kind: "y" }).explain(),
        ).toMatchObject({ stage: "IXSCAN", prefixLength: 2 });

        const error: unknown = await secondItems
          .insertOne({ shop: "a", kind: "x", qty: 9 })
          .catch((caught: unknown) => caught);

        expect((error as SinterServerError).wireCode).toBe(
          WireErrorCode.DuplicateKey,
        );
        expect((await secondItems.validateIndexes()).valid).toBe(true);
      } finally {
        await secondClient.close();
        await second.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe("compound indexes against an older server", () => {
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
      .mockResolvedValue({ acknowledged: true, name: "x", created: true });

    return { client, executeCommand };
  }

  it("refuses to send keys to a server without the capability", async () => {
    const { client, executeCommand } = clientWithCapabilities([
      "typed-documents",
      "streaming",
    ]);
    const items = client.db().collection<Item>("items");

    await expect(
      items.createIndex({
        keys: [
          ["shop", 1],
          ["kind", 1],
        ],
      }),
    ).rejects.toBeInstanceOf(SinterCompatibilityError);
    expect(executeCommand).not.toHaveBeenCalled();
  });

  it("still creates single-field indexes", async () => {
    const { client, executeCommand } = clientWithCapabilities([
      "typed-documents",
      "streaming",
    ]);
    const items = client.db().collection<Item>("items");

    await items.createIndex({ field: "shop" });

    expect(executeCommand).toHaveBeenCalledTimes(1);
  });

  it("sends keys when the server advertises the capability", async () => {
    const { client, executeCommand } = clientWithCapabilities([
      "typed-documents",
      "streaming",
      "compound-indexes",
    ]);
    const items = client.db().collection<Item>("items");

    await items.createIndex({
      keys: [
        ["shop", 1],
        ["kind", -1],
      ],
    });

    expect(executeCommand).toHaveBeenCalledWith(
      "application",
      "createIndex",
      expect.objectContaining({
        index: {
          keys: [
            ["shop", 1],
            ["kind", -1],
          ],
        },
      }),
    );
  });

  it("reads an index list from a server that sends no keys", async () => {
    const { client, executeCommand } = clientWithCapabilities([
      "typed-documents",
    ]);
    const items = client.db().collection<Item>("items");

    executeCommand.mockResolvedValueOnce({
      indexes: [
        {
          name: "shop_-1",
          field: "shop",
          direction: -1,
          unique: false,
          sparse: false,
        },
      ],
    });

    expect(await items.indexes()).toEqual([
      {
        name: "shop_-1",
        field: "shop",
        direction: -1,
        keys: [{ field: "shop", direction: -1 }],
        unique: false,
        sparse: false,
      },
    ]);
  });

  it("rejects a malformed keys list", async () => {
    const { client, executeCommand } = clientWithCapabilities([]);
    const items = client.db().collection<Item>("items");
    const entry = {
      name: "x",
      field: "a",
      direction: 1,
      unique: false,
      sparse: false,
    };

    for (const keys of [
      [],
      "a",
      [{ field: "a" }],
      [{ field: 1, direction: 1 }],
    ]) {
      executeCommand.mockResolvedValueOnce({ indexes: [{ ...entry, keys }] });
      await expect(items.indexes()).rejects.toBeInstanceOf(SinterProtocolError);
    }
  });
});
