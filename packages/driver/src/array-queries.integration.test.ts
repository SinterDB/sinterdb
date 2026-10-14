import { withTestServer } from "@sinterdb-internal/test-utils";
import type { CustomId } from "sinterdb-protocol";
import { describe, expect, it } from "vitest";

import { SinterClient } from "./client.js";
import { SinterServerError } from "./errors.js";

interface Order {
  _id: CustomId;
  n: number;
  tags: string[];
  items: { sku: string; qty: number }[];
}

const orders = [
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
];

describe("array queries through a server", () => {
  it("matches elements, positions, sizes, and $elemMatch", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Order>("orders");

        await collection.insertMany(orders);

        const numbers = async (
          filter: Parameters<typeof collection.find>[0],
        ): Promise<number[]> =>
          (await collection.find(filter, { sort: [["n", 1]] }).toArray()).map(
            (order) => order.n,
          );

        expect(await numbers({ tags: "b" })).toEqual([1, 2]);
        expect(await numbers({ tags: { $ne: "a" } })).toEqual([2, 3]);
        expect(await numbers({ tags: { $size: 0 } })).toEqual([3]);
        expect(await numbers({ "items.sku": "y" })).toEqual([2]);
        expect(
          await numbers({
            items: { $elemMatch: { sku: "x", qty: { $gt: 2 } } },
          }),
        ).toEqual([2]);
        expect(
          await numbers({
            items: { $elemMatch: { sku: "y", qty: { $gt: 2 } } },
          }),
        ).toEqual([]);
      } finally {
        await client.close();
      }
    });
  });

  it("returns what a scan returns after an index is created on an array field", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Order>("orders");

        await collection.insertMany(orders);
        await collection.createIndex({ field: "tags" });

        expect(
          (await collection.find({ tags: "b" }).toArray()).map((o) => o.n),
        ).toEqual([1, 2]);
        expect((await collection.find({ tags: "b" }).explain()).stage).toBe(
          "COLLSCAN",
        );
      } finally {
        await client.close();
      }
    });
  });

  it("rejects a malformed $size with a server error", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const collection = client.db().collection<Order>("orders");

        await collection.insertMany(orders);

        await expect(
          collection.find({ tags: { $size: -1 } }).toArray(),
        ).rejects.toBeInstanceOf(SinterServerError);
      } finally {
        await client.close();
      }
    });
  });
});
