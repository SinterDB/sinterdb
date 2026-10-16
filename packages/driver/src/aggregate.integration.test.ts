import { withTestServer } from "@sinterdb-internal/test-utils";
import type { CustomId } from "sinterdb-protocol";
import { describe, expect, it, vi } from "vitest";

import { SinterClient } from "./client.js";
import type { SinterCollection } from "./collection.js";
import { SinterCompatibilityError, SinterServerError } from "./errors.js";

interface Person {
  _id: CustomId;
  name: string;
  age?: number;
  team: string;
}

async function withPeople(
  run: (people: SinterCollection<Person>) => Promise<void>,
): Promise<void> {
  await withTestServer(async ({ uri }) => {
    const client = new SinterClient(`${uri}/application`);

    try {
      await client.connect();

      const people = client.db().collection<Person>("people");

      await people.insertMany([
        { name: "ada", age: 36, team: "a" },
        { name: "bob", age: 29, team: "b" },
        { name: "cyd", age: 36, team: "a" },
        { name: "dee", age: 41, team: "b" },
        { name: "eli", age: 29, team: "a" },
        { name: "fay", team: "b" },
      ]);
      await run(people);
    } finally {
      await client.close();
    }
  });
}

describe("aggregate through the driver", () => {
  it("runs a pipeline", async () => {
    await withPeople(async (people) => {
      const found = await people
        .aggregate<{ name: string }>([
          { $match: { team: "a" } },
          { $sort: [["age", -1]] },
          { $skip: 1 },
          { $limit: 5 },
          { $project: { _id: 0, name: 1 } },
        ])
        .toArray();

      expect(found).toEqual([{ name: "cyd" }, { name: "eli" }]);
    });
  });

  it("counts", async () => {
    await withPeople(async (people) => {
      expect(
        await people
          .aggregate<{ total: number }>([
            { $match: { age: { $gte: 30 } } },
            { $count: "total" },
          ])
          .toArray(),
      ).toEqual([{ total: 3 }]);
      expect(
        await people
          .aggregate([{ $match: { team: "none" } }, { $count: "total" }])
          .toArray(),
      ).toEqual([]);
    });
  });

  it("reads in batches, with next() and for await", async () => {
    await withPeople(async (people) => {
      const cursor = people.aggregate<{ name: string }>(
        [{ $sort: [["name", 1]] }, { $project: { _id: 0, name: 1 } }],
        { batchSize: 2 },
      );

      expect(await cursor.hasNext()).toBe(true);
      expect(await cursor.next()).toEqual({ name: "ada" });

      const rest: string[] = [];

      for await (const person of cursor) {
        rest.push(person.name);
      }

      expect(rest).toEqual(["bob", "cyd", "dee", "eli", "fay"]);
      expect(await cursor.next()).toBeNull();
    });
  });

  it("releases the server cursor when closed early", async () => {
    await withPeople(async (people) => {
      const cursor = people.aggregate([{ $sort: [["name", 1]] }], {
        batchSize: 1,
      });

      expect(await cursor.next()).not.toBeNull();
      await cursor.close();
      await cursor.close();
      expect(await cursor.next()).toBeNull();
    });
  });

  it("returns documents with their ids when nothing reshapes them", async () => {
    await withPeople(async (people) => {
      const found = await people.aggregate<Person>([{ $limit: 2 }]).toArray();

      expect(found).toHaveLength(2);
      expect(found[0]?._id).toBeDefined();
    });
  });

  it("returns no documents for a collection that does not exist", async () => {
    await withPeople(async (people) => {
      const missing = people.database.collection("nobody");

      expect(await missing.aggregate([{ $count: "n" }]).toArray()).toEqual([]);
    });
  });

  it("reports an invalid pipeline as a server error", async () => {
    await withPeople(async (people) => {
      for (const pipeline of [
        [{ $group: { _id: "$team" } }],
        [{ $limit: 0 }],
        [{ $match: { age: { $regex: "x" } } }],
        [{ $count: "$total" }],
        [{ $match: {}, $limit: 1 }],
      ]) {
        const error: unknown = await people
          .aggregate(pipeline as never)
          .toArray()
          .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(SinterServerError);
        expect((error as SinterServerError).serverErrorName).toBe(
          "DocumentValidationFailed",
        );
      }
    });
  });

  it("uses a compound index for a leading $match", async () => {
    await withPeople(async (people) => {
      await people.createIndex({
        keys: [
          ["team", 1],
          ["age", -1],
        ],
      });

      expect(
        await people
          .aggregate<{ name: string }>([
            { $match: { team: "a", age: { $gt: 30 } } },
            { $project: { _id: 0, name: 1 } },
          ])
          .toArray(),
      ).toEqual([{ name: "ada" }, { name: "cyd" }]);
    });
  });
});

describe("aggregate against an older server", () => {
  it("refuses to send a pipeline to a server without the capability", async () => {
    const client = new SinterClient("sinterdb://127.0.0.1/application");

    vi.spyOn(client, "serverInfo", "get").mockReturnValue({
      protocolVersion: 1,
      product: "sinterdb",
      productVersion: "0.2.0",
      capabilities: ["typed-documents", "streaming"],
    } as never);

    const executeCommand = vi.spyOn(client, "executeCommand");
    const people = client.db().collection<Person>("people");

    await expect(
      people.aggregate([{ $count: "n" }]).toArray(),
    ).rejects.toBeInstanceOf(SinterCompatibilityError);
    expect(executeCommand).not.toHaveBeenCalled();
  });
});
