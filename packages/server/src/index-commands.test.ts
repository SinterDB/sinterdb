import { CustomId, WireErrorCode } from "sinterdb-protocol";
import { describe, expect, it } from "vitest";

import { InMemoryCatalog } from "./catalog.js";
import {
  CommandDispatcher,
  CommandExecutionError,
} from "./command-dispatcher.js";

type Result = Record<string, unknown>;

function setup(): CommandDispatcher {
  const dispatcher = new CommandDispatcher(new InMemoryCatalog());

  dispatcher.dispatch({
    command: "insertMany",
    database: "app",
    parameters: {
      collection: "users",
      documents: Array.from({ length: 20 }, (_, index) => ({
        email: `user-${index}@example.com`,
        age: 20 + (index % 5),
      })),
    },
  });

  return dispatcher;
}

function run(
  dispatcher: CommandDispatcher,
  command: string,
  parameters: Record<string, unknown>,
  database = "app",
): Result {
  return dispatcher.dispatch({
    command,
    database,
    parameters: parameters as never,
  }) as Result;
}

function expectWireError(
  action: () => unknown,
  code: number,
  name?: string,
): CommandExecutionError {
  try {
    action();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(CommandExecutionError);
    expect((error as CommandExecutionError).code).toBe(code);

    if (name !== undefined) {
      expect((error as CommandExecutionError).name).toBe(name);
    }

    return error as CommandExecutionError;
  }

  throw new Error(`Expected wire error ${code}.`);
}

describe("createIndex command", () => {
  it("creates an index and reports it", () => {
    const dispatcher = setup();

    expect(
      run(dispatcher, "createIndex", {
        collection: "users",
        index: { field: "email", unique: true },
      }),
    ).toEqual({ acknowledged: true, name: "email_1", created: true });
  });

  it("accepts the same index again without changing anything", () => {
    const dispatcher = setup();
    const parameters = { collection: "users", index: { field: "age" } };

    run(dispatcher, "createIndex", parameters);

    expect(run(dispatcher, "createIndex", parameters)).toEqual({
      acknowledged: true,
      name: "age_1",
      created: false,
    });
  });

  it("creates the collection when it does not exist yet", () => {
    const dispatcher = new CommandDispatcher(new InMemoryCatalog());

    run(dispatcher, "createIndex", {
      collection: "fresh",
      index: { field: "a", direction: -1, name: "by_a" },
    });

    expect(run(dispatcher, "listCollections", {})).toMatchObject({
      collections: ["fresh"],
    });
    expect(
      (
        run(dispatcher, "listIndexes", { collection: "fresh" })["indexes"] as {
          name: string;
        }[]
      ).map((index) => index.name),
    ).toEqual(["_id_", "by_a"]);
  });

  it("does not create the collection for an invalid definition", () => {
    const dispatcher = new CommandDispatcher(new InMemoryCatalog());

    expectWireError(
      () =>
        run(dispatcher, "createIndex", {
          collection: "fresh",
          index: { field: "$bad" },
        }),
      WireErrorCode.InvalidIndex,
      "InvalidIndex",
    );
    expect(run(dispatcher, "listCollections", {})).toMatchObject({
      collections: [],
    });
  });

  it("rejects invalid definitions with InvalidIndex", () => {
    const dispatcher = setup();

    for (const index of [
      {},
      { field: "" },
      { field: "_id" },
      { field: "a", direction: 2 },
      { field: "a", unique: "yes" },
      { field: "a", name: "_id_" },
    ]) {
      expectWireError(
        () => run(dispatcher, "createIndex", { collection: "users", index }),
        WireErrorCode.InvalidIndex,
      );
    }
  });

  it("rejects unknown options and malformed parameters", () => {
    const dispatcher = setup();

    expectWireError(
      () =>
        run(dispatcher, "createIndex", {
          collection: "users",
          index: { field: "a", background: true },
        }),
      WireErrorCode.InvalidRequest,
    );
    expectWireError(
      () => run(dispatcher, "createIndex", { collection: "users" }),
      WireErrorCode.InvalidRequest,
    );
    expectWireError(
      () => run(dispatcher, "createIndex", { index: { field: "a" } }),
      WireErrorCode.InvalidRequest,
    );
    expectWireError(
      () =>
        run(dispatcher, "createIndex", { collection: "users", index: "email" }),
      WireErrorCode.InvalidRequest,
    );
  });

  it("reports conflicting definitions with IndexConflict", () => {
    const dispatcher = setup();

    run(dispatcher, "createIndex", {
      collection: "users",
      index: { field: "age", name: "by_age" },
    });

    for (const index of [
      { field: "age", name: "by_age", unique: true },
      { field: "age", name: "other" },
      { field: "email", name: "by_age" },
    ]) {
      expectWireError(
        () => run(dispatcher, "createIndex", { collection: "users", index }),
        WireErrorCode.IndexConflict,
        "IndexConflict",
      );
    }
  });

  it("refuses a unique index over existing duplicates", () => {
    const dispatcher = setup();

    expectWireError(
      () =>
        run(dispatcher, "createIndex", {
          collection: "users",
          index: { field: "age", unique: true },
        }),
      WireErrorCode.DuplicateKey,
      "DuplicateKey",
    );
  });
});

describe("listIndexes command", () => {
  it("lists the _id index first and then others in creation order", () => {
    const dispatcher = setup();

    run(dispatcher, "createIndex", {
      collection: "users",
      index: { field: "email", unique: true },
    });
    run(dispatcher, "createIndex", {
      collection: "users",
      index: { field: "age", direction: -1, sparse: true },
    });

    expect(run(dispatcher, "listIndexes", { collection: "users" })).toEqual({
      indexes: [
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
      ],
    });
  });

  it("returns no indexes for a collection that does not exist", () => {
    expect(run(setup(), "listIndexes", { collection: "missing" })).toEqual({
      indexes: [],
    });
  });
});

describe("compound indexes through commands", () => {
  const compound = {
    keys: [
      ["age", 1],
      ["email", -1],
    ],
  };

  it("creates a compound index and lists every field", () => {
    const dispatcher = setup();

    expect(
      run(dispatcher, "createIndex", { collection: "users", index: compound }),
    ).toEqual({ acknowledged: true, name: "age_1_email_-1", created: true });
    expect(
      run(dispatcher, "createIndex", { collection: "users", index: compound }),
    ).toEqual({ acknowledged: true, name: "age_1_email_-1", created: false });

    const indexes = run(dispatcher, "listIndexes", { collection: "users" })[
      "indexes"
    ] as Result[];

    expect(indexes[1]).toEqual({
      name: "age_1_email_-1",
      field: "age",
      direction: 1,
      keys: [
        { field: "age", direction: 1 },
        { field: "email", direction: -1 },
      ],
      unique: false,
      sparse: false,
    });
  });

  it("explains a query that fixes the leading fields", () => {
    const dispatcher = setup();

    run(dispatcher, "createIndex", { collection: "users", index: compound });

    expect(
      run(dispatcher, "explain", {
        collection: "users",
        filter: { age: 21, email: "user-1@example.com" },
      }),
    ).toMatchObject({
      stage: "IXSCAN",
      index: "age_1_email_-1",
      field: "age",
      fields: ["age", "email"],
      prefixLength: 2,
      access: "equality",
    });
  });

  it("finds documents through the index", () => {
    const dispatcher = setup();

    run(dispatcher, "createIndex", { collection: "users", index: compound });

    const found = run(dispatcher, "find", {
      collection: "users",
      filter: { age: 21 },
    })["documents"] as unknown[];

    expect(found).toHaveLength(4);
  });

  it("rejects an invalid definition with InvalidIndex", () => {
    const dispatcher = setup();

    for (const index of [
      { keys: [] },
      {
        keys: [
          ["age", 1],
          ["age", -1],
        ],
      },
      { keys: [["age", 2]] },
      { keys: "age" },
      { field: "age", keys: [["age", 1]] },
    ]) {
      expectWireError(
        () => run(dispatcher, "createIndex", { collection: "users", index }),
        WireErrorCode.InvalidIndex,
        "InvalidIndex",
      );
    }
  });

  it("refuses the same fields under another name", () => {
    const dispatcher = setup();

    run(dispatcher, "createIndex", { collection: "users", index: compound });

    expectWireError(
      () =>
        run(dispatcher, "createIndex", {
          collection: "users",
          index: {
            keys: [
              ["age", -1],
              ["email", -1],
            ],
          },
        }),
      WireErrorCode.IndexConflict,
      "IndexConflict",
    );
  });

  it("enforces a unique compound index", () => {
    const dispatcher = setup();

    run(dispatcher, "createIndex", {
      collection: "users",
      index: {
        keys: [
          ["age", 1],
          ["email", 1],
        ],
        unique: true,
      },
    });

    expectWireError(
      () =>
        run(dispatcher, "insertOne", {
          collection: "users",
          document: { age: 20, email: "user-0@example.com" },
        }),
      WireErrorCode.DuplicateKey,
      "DuplicateKey",
    );
  });
});

describe("dropIndex command", () => {
  it("drops an index", () => {
    const dispatcher = setup();

    run(dispatcher, "createIndex", {
      collection: "users",
      index: { field: "age" },
    });

    expect(
      run(dispatcher, "dropIndex", { collection: "users", name: "age_1" }),
    ).toEqual({ acknowledged: true });
    expect(
      (
        run(dispatcher, "listIndexes", { collection: "users" })[
          "indexes"
        ] as unknown[]
      ).length,
    ).toBe(1);
  });

  it("reports unknown indexes and collections with IndexNotFound", () => {
    const dispatcher = setup();

    expectWireError(
      () => run(dispatcher, "dropIndex", { collection: "users", name: "nope" }),
      WireErrorCode.IndexNotFound,
      "IndexNotFound",
    );
    expectWireError(
      () => run(dispatcher, "dropIndex", { collection: "gone", name: "x" }),
      WireErrorCode.IndexNotFound,
    );
  });

  it("refuses to drop the _id index", () => {
    expectWireError(
      () => run(setup(), "dropIndex", { collection: "users", name: "_id_" }),
      WireErrorCode.InvalidIndex,
    );
  });

  it("requires a name", () => {
    expectWireError(
      () => run(setup(), "dropIndex", { collection: "users" }),
      WireErrorCode.InvalidRequest,
    );
  });
});

describe("explain command", () => {
  it("describes a scan when there is no index", () => {
    expect(
      run(setup(), "explain", { collection: "users", filter: { age: 22 } }),
    ).toEqual({ stage: "COLLSCAN", estimatedCandidates: 20, documents: 20 });
  });

  it("describes an index scan", () => {
    const dispatcher = setup();

    run(dispatcher, "createIndex", {
      collection: "users",
      index: { field: "email" },
    });

    expect(
      run(dispatcher, "explain", {
        collection: "users",
        filter: { email: "user-3@example.com" },
      }),
    ).toEqual({
      stage: "IXSCAN",
      index: "email_1",
      field: "email",
      access: "equality",
      estimatedCandidates: 1,
      documents: 20,
    });
  });

  it("reports range bounds", () => {
    const dispatcher = setup();

    run(dispatcher, "createIndex", {
      collection: "users",
      index: { field: "email" },
    });

    expect(
      run(dispatcher, "explain", {
        collection: "users",
        filter: { email: { $gte: "user-10", $lt: "user-12" } },
      }),
    ).toMatchObject({
      stage: "IXSCAN",
      access: "range",
      lower: { value: "user-10", inclusive: true },
      upper: { value: "user-12", inclusive: false },
    });
  });

  it("describes an _id lookup", () => {
    const dispatcher = setup();

    expect(
      run(dispatcher, "explain", {
        collection: "users",
        filter: { _id: CustomId.generate() },
      }),
    ).toMatchObject({ stage: "IDLOOKUP", index: "_id_" });
  });

  it("reports an empty scan for a collection that does not exist", () => {
    expect(
      run(setup(), "explain", { collection: "missing", filter: {} }),
    ).toEqual({ stage: "COLLSCAN", estimatedCandidates: 0, documents: 0 });
  });

  it("validates the filter", () => {
    const dispatcher = setup();

    for (const collection of ["users", "missing"]) {
      expectWireError(
        () =>
          run(dispatcher, "explain", {
            collection,
            filter: { a: { $around: 1 } },
          }),
        WireErrorCode.DocumentValidationFailed,
      );
    }

    expectWireError(
      () => run(dispatcher, "explain", { collection: "users" }),
      WireErrorCode.InvalidRequest,
    );
  });
});

describe("validateIndexes command", () => {
  it("reports healthy indexes", () => {
    const dispatcher = setup();

    run(dispatcher, "createIndex", {
      collection: "users",
      index: { field: "email", unique: true },
    });

    expect(run(dispatcher, "validateIndexes", { collection: "users" })).toEqual(
      {
        valid: true,
        indexes: 1,
        documents: 20,
        issues: [],
      },
    );
  });

  it("reports a collection that does not exist as valid", () => {
    expect(run(setup(), "validateIndexes", { collection: "missing" })).toEqual({
      valid: true,
      indexes: 0,
      documents: 0,
      issues: [],
    });
  });
});

describe("unique indexes through write commands", () => {
  function uniqueSetup(): CommandDispatcher {
    const dispatcher = setup();

    run(dispatcher, "createIndex", {
      collection: "users",
      index: { field: "email", unique: true },
    });

    return dispatcher;
  }

  it("rejects a duplicate insert with DuplicateKey", () => {
    const error = expectWireError(
      () =>
        run(uniqueSetup(), "insertOne", {
          collection: "users",
          document: { email: "user-1@example.com" },
        }),
      WireErrorCode.DuplicateKey,
      "DuplicateKey",
    );

    expect(error.message).toContain("email_1");
    expect(error.details).toMatchObject({ storageErrorCode: "DUPLICATE_KEY" });
  });

  it("reports how far insertMany got", () => {
    const dispatcher = uniqueSetup();
    const error = expectWireError(
      () =>
        run(dispatcher, "insertMany", {
          collection: "users",
          documents: [
            { email: "new-1@example.com" },
            { email: "new-2@example.com" },
            { email: "user-1@example.com" },
            { email: "new-3@example.com" },
          ],
        }),
      WireErrorCode.DuplicateKey,
    );

    expect(error.details).toMatchObject({ failedIndex: 2, insertedCount: 2 });
    expect(
      (
        run(dispatcher, "find", {
          collection: "users",
          filter: {},
          batchSize: 100,
        }) as { documents: unknown[] }
      ).documents,
    ).toHaveLength(22);
  });

  it("rejects updates, replacements, and upserts that create duplicates", () => {
    const dispatcher = uniqueSetup();

    expectWireError(
      () =>
        run(dispatcher, "updateOne", {
          collection: "users",
          filter: { email: "user-2@example.com" },
          update: { $set: { email: "user-1@example.com" } },
        }),
      WireErrorCode.DuplicateKey,
    );
    expectWireError(
      () =>
        run(dispatcher, "replaceOne", {
          collection: "users",
          filter: { email: "user-2@example.com" },
          replacement: { email: "user-1@example.com" },
        }),
      WireErrorCode.DuplicateKey,
    );
    expectWireError(
      () =>
        run(dispatcher, "updateOne", {
          collection: "users",
          filter: { nickname: "x" },
          update: { $set: { email: "user-1@example.com" } },
          upsert: true,
        }),
      WireErrorCode.DuplicateKey,
    );
  });

  it("keeps using the index after a rejected write", () => {
    const dispatcher = uniqueSetup();

    expectWireError(
      () =>
        run(dispatcher, "insertOne", {
          collection: "users",
          document: { email: "user-1@example.com" },
        }),
      WireErrorCode.DuplicateKey,
    );

    expect(
      run(dispatcher, "insertOne", {
        collection: "users",
        document: { email: "brand-new@example.com" },
      }),
    ).toMatchObject({ acknowledged: true });
    expect(
      run(dispatcher, "validateIndexes", { collection: "users" }),
    ).toMatchObject({ valid: true });
  });
});
