import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { startTestServer, withTestServer } from "@sinterdb-internal/test-utils";
import { CustomId, WireErrorCode } from "sinterdb-protocol";
import { describe, expect, it, vi } from "vitest";

import { SinterClient } from "./client.js";
import type { SinterCollection } from "./collection.js";
import { SinterInsertManyError, SinterServerError } from "./errors.js";
import { SinterProtocolError } from "./errors.js";

interface User {
  _id: CustomId;
  email: string;
  age: number;
  tags: string[];
  profile?: { level: number };
}

type Users = SinterCollection<User>;

async function withUsers(
  run: (users: Users, uri: string) => Promise<void>,
): Promise<void> {
  await withTestServer(async ({ uri }) => {
    const client = new SinterClient(`${uri}/application`);

    try {
      await client.connect();

      const users = client.db().collection<User>("users");

      await users.insertMany(
        Array.from({ length: 20 }, (_, index) => ({
          email: `user-${index}@example.com`,
          age: 20 + (index % 5),
          tags: [],
        })),
      );

      await run(users, `${uri}/application`);
    } finally {
      await client.close();
    }
  });
}

async function serverError(
  promise: Promise<unknown>,
): Promise<SinterServerError> {
  const error: unknown = await promise.catch((caught: unknown) => caught);

  expect(error).toBeInstanceOf(SinterServerError);

  return error as SinterServerError;
}

describe("index management through the driver", () => {
  it("creates, lists, and drops indexes", async () => {
    await withUsers(async (users) => {
      const created = await users.createIndex({ field: "email", unique: true });

      expect(created).toEqual({
        acknowledged: true,
        name: "email_1",
        created: true,
      });
      expect(Object.isFrozen(created)).toBe(true);

      await users.createIndex({ field: "age", direction: -1, sparse: true });

      expect(await users.indexes()).toEqual([
        {
          name: "_id_",
          field: "_id",
          direction: 1,
          keys: [{ field: "_id", direction: 1 }],
          unique: true,
          sparse: false,
        },
        {
          name: "email_1",
          field: "email",
          direction: 1,
          keys: [{ field: "email", direction: 1 }],
          unique: true,
          sparse: false,
        },
        {
          name: "age_-1",
          field: "age",
          direction: -1,
          keys: [{ field: "age", direction: -1 }],
          unique: false,
          sparse: true,
        },
      ]);

      await users.dropIndex("email_1");

      expect((await users.indexes()).map((index) => index.name)).toEqual([
        "_id_",
        "age_-1",
      ]);
    });
  });

  it("accepts an identical index twice", async () => {
    await withUsers(async (users) => {
      await users.createIndex({ field: "age" });

      expect(await users.createIndex({ field: "age" })).toMatchObject({
        name: "age_1",
        created: false,
      });
    });
  });

  it("indexes nested fields and honors a custom name", async () => {
    await withUsers(async (users) => {
      const result = await users.createIndex({
        field: "profile.level",
        name: "by_level",
      });

      expect(result.name).toBe("by_level");
      expect((await users.indexes())[1]).toMatchObject({
        field: "profile.level",
        name: "by_level",
      });
    });
  });

  it("creates the collection when it does not exist", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        const fresh = client.db().collection<User>("fresh");

        expect(await fresh.indexes()).toEqual([]);

        await fresh.createIndex({ field: "email", unique: true });

        expect(await client.db().listCollections()).toEqual(["fresh"]);
        expect(await fresh.indexes()).toHaveLength(2);
      } finally {
        await client.close();
      }
    });
  });

  it("reports index errors with their own codes", async () => {
    await withUsers(async (users) => {
      await users.createIndex({ field: "age", name: "by_age" });

      const bad = await serverError(
        users.createIndex({ field: "$bad" } as never),
      );

      expect(bad.wireCode).toBe(WireErrorCode.InvalidIndex);
      expect(bad.serverErrorName).toBe("InvalidIndex");

      const onId = await serverError(
        users.createIndex({ field: "_id" } as never),
      );

      expect(onId.wireCode).toBe(WireErrorCode.InvalidIndex);

      const conflict = await serverError(
        users.createIndex({ field: "age", name: "by_age", unique: true }),
      );

      expect(conflict.wireCode).toBe(WireErrorCode.IndexConflict);
      expect(conflict.serverErrorName).toBe("IndexConflict");

      const missing = await serverError(users.dropIndex("nope"));

      expect(missing.wireCode).toBe(WireErrorCode.IndexNotFound);

      const dropId = await serverError(users.dropIndex("_id_"));

      expect(dropId.wireCode).toBe(WireErrorCode.InvalidIndex);

      await users.dropIndex("by_age");

      const duplicates = await serverError(
        users.createIndex({ field: "age", name: "unique_age", unique: true }),
      );

      expect(duplicates.wireCode).toBe(WireErrorCode.DuplicateKey);
    });
  });

  it("rejects malformed server results", async () => {
    const client = new SinterClient("sinterdb://localhost/application");
    const users = client.db().collection<User>("users");
    const execute = vi.spyOn(client, "executeCommand");

    execute.mockResolvedValueOnce({
      acknowledged: true,
      name: 5,
      created: true,
    });
    await expect(users.createIndex({ field: "email" })).rejects.toThrow(
      SinterProtocolError,
    );

    execute.mockResolvedValueOnce({ indexes: [{ name: "x" }] });
    await expect(users.indexes()).rejects.toThrow(SinterProtocolError);

    execute.mockResolvedValueOnce(null);
    await expect(users.validateIndexes()).rejects.toThrow(SinterProtocolError);
  });
});

describe("unique indexes through the driver", () => {
  it("rejects duplicate inserts with DuplicateKey", async () => {
    await withUsers(async (users) => {
      await users.createIndex({ field: "email", unique: true });

      const error = await serverError(
        users.insertOne({
          email: "user-1@example.com",
          age: 1,
          tags: [],
        }),
      );

      expect(error.wireCode).toBe(WireErrorCode.DuplicateKey);
      expect(error.serverErrorName).toBe("DuplicateKey");
      expect(error.message).toContain("email_1");
      expect(await users.find({ age: 1 }).toArray()).toEqual([]);
    });
  });

  it("reports how far insertMany got", async () => {
    await withUsers(async (users) => {
      await users.createIndex({ field: "email", unique: true });

      const error: unknown = await users
        .insertMany([
          { email: "a@example.com", age: 1, tags: [] },
          { email: "b@example.com", age: 1, tags: [] },
          { email: "user-2@example.com", age: 1, tags: [] },
          { email: "c@example.com", age: 1, tags: [] },
        ])
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(SinterInsertManyError);
      expect((error as SinterInsertManyError).failedIndex).toBe(2);
      expect((error as SinterInsertManyError).insertedIds).toHaveLength(2);
      expect(await users.find({ age: 1 }).toArray()).toHaveLength(2);
    });
  });

  it("rejects updates that would create a duplicate and changes nothing", async () => {
    await withUsers(async (users) => {
      await users.createIndex({ field: "email", unique: true });

      const error = await serverError(
        users.updateMany(
          { age: { $gte: 22 } },
          { $set: { email: "same@example.com" } },
        ),
      );

      expect(error.wireCode).toBe(WireErrorCode.DuplicateKey);
      expect(await users.find({ email: "same@example.com" }).toArray()).toEqual(
        [],
      );
      expect((await users.validateIndexes()).valid).toBe(true);
    });
  });

  it("lets exactly one of many concurrent clients insert a value", async () => {
    await withTestServer(async ({ uri }) => {
      const clients = Array.from(
        { length: 8 },
        () => new SinterClient(`${uri}/application`),
      );

      try {
        await Promise.all(clients.map((client) => client.connect()));

        const first = clients[0] as SinterClient;

        await first
          .db()
          .collection<User>("users")
          .createIndex({ field: "email", unique: true });

        const attempts = clients.flatMap((client, clientIndex) =>
          Array.from({ length: 5 }, (_, emailIndex) =>
            client
              .db()
              .collection<User>("users")
              .insertOne({
                email: `shared-${emailIndex}@example.com`,
                age: clientIndex,
                tags: [],
              }),
          ),
        );
        const results = await Promise.allSettled(attempts);
        const fulfilled = results.filter(
          (result) => result.status === "fulfilled",
        );
        const rejected = results.filter(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected",
        );

        expect(fulfilled).toHaveLength(5);
        expect(rejected).toHaveLength(35);

        for (const result of rejected) {
          expect((result.reason as SinterServerError).wireCode).toBe(
            WireErrorCode.DuplicateKey,
          );
        }

        const users = first.db().collection<User>("users");

        expect(await users.find().toArray()).toHaveLength(5);
        expect((await users.validateIndexes()).valid).toBe(true);
      } finally {
        await Promise.all(clients.map((client) => client.close()));
      }
    });
  });

  it("lets exactly one concurrent update win a contested value", async () => {
    await withUsers(async (users, uri) => {
      await users.createIndex({ field: "email", unique: true });

      const others = Array.from({ length: 4 }, () => new SinterClient(uri));

      try {
        await Promise.all(others.map((other) => other.connect()));

        const results = await Promise.allSettled(
          others.map((other, position) =>
            other
              .db()
              .collection<User>("users")
              .updateOne(
                { email: `user-${position}@example.com` },
                { $set: { email: "contested@example.com" } },
              ),
          ),
        );

        expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
        expect(
          await users.find({ email: "contested@example.com" }).toArray(),
        ).toHaveLength(1);
        expect((await users.validateIndexes()).valid).toBe(true);
      } finally {
        await Promise.all(others.map((other) => other.close()));
      }
    });
  });
});

describe("explaining queries", () => {
  it("shows a collection scan without an index", async () => {
    await withUsers(async (users) => {
      expect(await users.find({ age: 22 }).explain()).toEqual({
        stage: "COLLSCAN",
        estimatedCandidates: 20,
        documents: 20,
      });
    });
  });

  it("shows index scans for equality and ranges", async () => {
    await withUsers(async (users) => {
      await users.createIndex({ field: "email" });

      expect(
        await users.find({ email: "user-3@example.com" }).explain(),
      ).toEqual({
        stage: "IXSCAN",
        index: "email_1",
        field: "email",
        access: "equality",
        estimatedCandidates: 1,
        documents: 20,
      });

      expect(
        await users
          .find({ email: { $gte: "user-10", $lt: "user-12" } })
          .explain(),
      ).toMatchObject({
        stage: "IXSCAN",
        access: "range",
        lower: { value: "user-10", inclusive: true },
        upper: { value: "user-12", inclusive: false },
      });

      expect(
        await users.find({ email: { $in: ["user-1@example.com"] } }).explain(),
      ).toMatchObject({ stage: "IXSCAN", access: "in" });
    });
  });

  it("shows _id lookups", async () => {
    await withUsers(async (users) => {
      const first = await users.findOne();

      expect(
        await users.find({ _id: (first as { _id: CustomId })._id }).explain(),
      ).toMatchObject({ stage: "IDLOOKUP", index: "_id_" });
    });
  });

  it("explains without running the query or opening a cursor", async () => {
    await withUsers(async (users) => {
      const cursor = users.find(
        { age: 21 },
        { limit: 1, sort: [["email", 1]] },
      );

      await cursor.explain();

      expect(await cursor.toArray()).toHaveLength(1);
    });
  });

  it("rejects invalid filters", async () => {
    await withUsers(async (users) => {
      const error = await serverError(
        users.find({ age: { $around: 1 } } as never).explain(),
      );

      expect(error.wireCode).toBe(WireErrorCode.DocumentValidationFailed);
    });
  });
});

describe("queries return the same results with and without an index", () => {
  it("matches for equality, ranges, and membership", async () => {
    await withUsers(async (users) => {
      const filters = [
        { age: 22 },
        { age: { $gte: 21, $lt: 23 } },
        { age: { $in: [20, 24] } },
        { email: "user-7@example.com" },
        { email: { $gt: "user-15" } },
      ];
      const before = await Promise.all(
        filters.map((filter) => users.find(filter).toArray()),
      );

      await users.createIndex({ field: "age" });
      await users.createIndex({ field: "email" });

      const after = await Promise.all(
        filters.map((filter) => users.find(filter).toArray()),
      );

      expect(after).toEqual(before);
      expect((await users.validateIndexes()).valid).toBe(true);
    });
  });
});

describe("validating indexes", () => {
  it("reports a healthy collection", async () => {
    await withUsers(async (users) => {
      await users.createIndex({ field: "email", unique: true });

      expect(await users.validateIndexes()).toEqual({
        valid: true,
        indexes: 1,
        documents: 20,
        issues: [],
      });
    });
  });

  it("is valid for a collection with no indexes or no documents", async () => {
    await withTestServer(async ({ uri }) => {
      const client = new SinterClient(`${uri}/application`);

      try {
        await client.connect();

        expect(
          await client.db().collection("nothing").validateIndexes(),
        ).toMatchObject({ valid: true, indexes: 0, documents: 0 });
      } finally {
        await client.close();
      }
    });
  });
});

describe("indexes across a server restart", () => {
  it("keeps indexes and unique constraints", async () => {
    const directory = mkdtempSync(join(tmpdir(), "sinterdb-index-restart-"));

    try {
      const first = await startTestServer({ dataDirectory: directory });
      const firstClient = new SinterClient(`${first.uri}/application`);

      await firstClient.connect();

      const firstUsers = firstClient.db().collection<User>("users");

      await firstUsers.insertMany(
        Array.from({ length: 10 }, (_, index) => ({
          email: `user-${index}@example.com`,
          age: index,
          tags: [],
        })),
      );
      await firstUsers.createIndex({ field: "email", unique: true });
      await firstUsers.createIndex({ field: "age", direction: -1 });
      await firstClient.close();
      await first.close();

      const second = await startTestServer({ dataDirectory: directory });
      const secondClient = new SinterClient(`${second.uri}/application`);

      await secondClient.connect();

      const secondUsers = secondClient.db().collection<User>("users");

      try {
        expect(
          (await secondUsers.indexes()).map((index) => index.name),
        ).toEqual(["_id_", "email_1", "age_-1"]);
        expect(
          await secondUsers.find({ email: "user-4@example.com" }).explain(),
        ).toMatchObject({ stage: "IXSCAN", index: "email_1" });

        const error = await serverError(
          secondUsers.insertOne({
            email: "user-4@example.com",
            age: 99,
            tags: [],
          }),
        );

        expect(error.wireCode).toBe(WireErrorCode.DuplicateKey);
        expect((await secondUsers.validateIndexes()).valid).toBe(true);
      } finally {
        await secondClient.close();
        await second.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
