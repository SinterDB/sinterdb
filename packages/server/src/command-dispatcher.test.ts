import {
  CustomId,
  PROTOCOL_VERSION,
  ProtocolCapability,
  WireErrorCode,
  type Document,
} from "sinterdb-protocol";
import { describe, expect, it } from "vitest";

import { InMemoryCatalog } from "./catalog.js";
import {
  CommandDispatcher,
  CommandExecutionError,
  SERVER_PRODUCT,
  SERVER_PRODUCT_VERSION,
  ServerCommand,
} from "./command-dispatcher.js";
import { CursorManager } from "./cursor-manager.js";

describe("CommandDispatcher", () => {
  it("returns server information", () => {
    const dispatcher = createDispatcher();

    expect(
      dispatcher.dispatch({
        command: ServerCommand.ServerInfo,
        parameters: {},
      }),
    ).toEqual({
      product: SERVER_PRODUCT,
      productVersion: SERVER_PRODUCT_VERSION,
      protocolVersion: PROTOCOL_VERSION,
      capabilities: [
        ProtocolCapability.TypedDocuments,
        ProtocolCapability.Streaming,
        ProtocolCapability.Projection,
      ],
    });
  });

  it("lists databases", () => {
    const catalog = new InMemoryCatalog();
    const dispatcher = new CommandDispatcher(catalog);

    catalog.createCollection("zeta", "events");
    catalog.createCollection("alpha", "users");

    expect(
      dispatcher.dispatch({
        command: ServerCommand.ListDatabases,
        parameters: {},
      }),
    ).toEqual({
      databases: ["alpha", "zeta"],
    });
  });

  it("creates and lists collections", () => {
    const dispatcher = createDispatcher();

    expect(
      dispatcher.dispatch({
        command: ServerCommand.CreateCollection,
        database: "app",
        parameters: {
          name: "users",
        },
      }),
    ).toEqual({
      database: "app",
      collection: "users",
      created: true,
    });

    expect(
      dispatcher.dispatch({
        command: ServerCommand.ListCollections,
        database: "app",
        parameters: {},
      }),
    ).toEqual({
      database: "app",
      collections: ["users"],
    });
  });

  it("requires a database for database-scoped commands", () => {
    expectCommandError(
      () =>
        createDispatcher().dispatch({
          command: ServerCommand.CreateCollection,
          parameters: {
            name: "users",
          },
        }),
      WireErrorCode.InvalidRequest,
    );
  });

  it("requires a collection name", () => {
    expectCommandError(
      () =>
        createDispatcher().dispatch({
          command: ServerCommand.CreateCollection,
          database: "app",
          parameters: {},
        }),
      WireErrorCode.InvalidRequest,
    );
  });

  it("reports duplicate collections as namespace conflicts", () => {
    const dispatcher = createDispatcher();

    dispatcher.dispatch({
      command: ServerCommand.CreateCollection,
      database: "app",
      parameters: {
        name: "users",
      },
    });

    expectCommandError(
      () =>
        dispatcher.dispatch({
          command: ServerCommand.CreateCollection,
          database: "app",
          parameters: {
            name: "users",
          },
        }),
      WireErrorCode.NamespaceConflict,
    );
  });

  it("rejects unknown commands", () => {
    expectCommandError(
      () =>
        createDispatcher().dispatch({
          command: "destroyEverything",
          parameters: {},
        }),
      WireErrorCode.UnknownCommand,
    );
  });

  it("inserts a document and generates its identifier", () => {
    const catalog = new InMemoryCatalog();
    const dispatcher = new CommandDispatcher(catalog);

    const result = dispatcher.dispatch({
      command: ServerCommand.InsertOne,
      database: "app",
      parameters: {
        collection: "users",
        document: {
          name: "Ada",
        },
      },
    }) as Document;

    expect(result["acknowledged"]).toBe(true);
    expect(result["insertedId"]).toBeInstanceOf(CustomId);

    const insertedId = result["insertedId"];

    if (!(insertedId instanceof CustomId)) {
      throw new Error("Expected insertOne to return a CustomId.");
    }

    const collection = catalog.getCollection("app", "users");

    if (collection === undefined) {
      throw new Error("Expected insertOne to create the collection.");
    }

    const stored = collection.findById(insertedId);

    expect(stored?.["name"]).toBe("Ada");
    expect(catalog.listCollections("app")).toEqual(["users"]);
  });

  it("preserves a provided document identifier", () => {
    const catalog = new InMemoryCatalog();
    const dispatcher = new CommandDispatcher(catalog);
    const id = CustomId.fromHexString("00112233445566778899aabbccddeeff");

    const result = dispatcher.dispatch({
      command: ServerCommand.InsertOne,
      database: "app",
      parameters: {
        collection: "users",
        document: {
          _id: id,
          name: "Ada",
        },
      },
    }) as Document;

    const insertedId = result["insertedId"];

    expect(insertedId).toBeInstanceOf(CustomId);

    if (insertedId instanceof CustomId) {
      expect(insertedId.equals(id)).toBe(true);
    }
  });

  it("reports duplicate document identifiers", () => {
    const dispatcher = createDispatcher();
    const id = CustomId.fromHexString("00112233445566778899aabbccddeeff");

    dispatcher.dispatch({
      command: ServerCommand.InsertOne,
      database: "app",
      parameters: {
        collection: "users",
        document: {
          _id: id,
          name: "first",
        },
      },
    });

    expectCommandError(
      () =>
        dispatcher.dispatch({
          command: ServerCommand.InsertOne,
          database: "app",
          parameters: {
            collection: "users",
            document: {
              _id: id,
              name: "second",
            },
          },
        }),
      WireErrorCode.DuplicateKey,
    );
  });

  it("reports invalid document identifiers", () => {
    expectCommandError(
      () =>
        createDispatcher().dispatch({
          command: ServerCommand.InsertOne,
          database: "app",
          parameters: {
            collection: "users",
            document: {
              _id: "not-a-custom-id",
            },
          },
        }),
      WireErrorCode.DocumentValidationFailed,
    );
  });

  it("requires an insert document", () => {
    expectCommandError(
      () =>
        createDispatcher().dispatch({
          command: ServerCommand.InsertOne,
          database: "app",
          parameters: {
            collection: "users",
          },
        }),
      WireErrorCode.InvalidRequest,
    );
  });

  it("requires an insert collection", () => {
    expectCommandError(
      () =>
        createDispatcher().dispatch({
          command: ServerCommand.InsertOne,
          database: "app",
          parameters: {
            document: {
              name: "Ada",
            },
          },
        }),
      WireErrorCode.InvalidRequest,
    );
  });

  it("finds a document using equality filters", () => {
    const catalog = new InMemoryCatalog();
    const dispatcher = new CommandDispatcher(catalog);
    const id = CustomId.fromHexString("00112233445566778899aabbccddeeff");

    dispatcher.dispatch({
      command: ServerCommand.InsertOne,
      database: "app",
      parameters: {
        collection: "users",
        document: {
          _id: id,
          name: "Ada",
          active: true,
        },
      },
    });

    expect(
      dispatcher.dispatch({
        command: ServerCommand.FindOne,
        database: "app",
        parameters: {
          collection: "users",
          filter: {
            active: true,
          },
        },
      }),
    ).toEqual({
      document: {
        _id: id,
        name: "Ada",
        active: true,
      },
    });
  });

  it("returns null when findOne has no match", () => {
    const dispatcher = createDispatcher();

    dispatcher.dispatch({
      command: ServerCommand.InsertOne,
      database: "app",
      parameters: {
        collection: "users",
        document: {
          name: "Ada",
        },
      },
    });

    expect(
      dispatcher.dispatch({
        command: ServerCommand.FindOne,
        database: "app",
        parameters: {
          collection: "users",
          filter: {
            name: "Grace",
          },
        },
      }),
    ).toEqual({
      document: null,
    });
  });

  it("returns null without creating a missing collection", () => {
    const catalog = new InMemoryCatalog();
    const dispatcher = new CommandDispatcher(catalog);

    expect(
      dispatcher.dispatch({
        command: ServerCommand.FindOne,
        database: "app",
        parameters: {
          collection: "users",
          filter: {},
        },
      }),
    ).toEqual({
      document: null,
    });

    expect(catalog.hasDatabase("app")).toBe(false);
    expect(catalog.hasCollection("app", "users")).toBe(false);
  });

  it("reports invalid find filters", () => {
    const dispatcher = createDispatcher();

    dispatcher.dispatch({
      command: ServerCommand.InsertOne,
      database: "app",
      parameters: {
        collection: "users",
        document: {
          name: "Ada",
        },
      },
    });

    expectCommandError(
      () =>
        dispatcher.dispatch({
          command: ServerCommand.FindOne,
          database: "app",
          parameters: {
            collection: "users",
            filter: {
              value: undefined,
            } as never,
          },
        }),
      WireErrorCode.DocumentValidationFailed,
    );
  });

  it("requires a findOne collection", () => {
    expectCommandError(
      () =>
        createDispatcher().dispatch({
          command: ServerCommand.FindOne,
          database: "app",
          parameters: {
            filter: {},
          },
        }),
      WireErrorCode.InvalidRequest,
    );
  });

  it("requires a findOne filter", () => {
    expectCommandError(
      () =>
        createDispatcher().dispatch({
          command: ServerCommand.FindOne,
          database: "app",
          parameters: {
            collection: "users",
          },
        }),
      WireErrorCode.InvalidRequest,
    );
  });

  it("inserts an ordered batch of documents", () => {
    const catalog = new InMemoryCatalog();
    const dispatcher = new CommandDispatcher(catalog);

    const result = dispatcher.dispatch({
      command: ServerCommand.InsertMany,
      database: "app",
      parameters: {
        collection: "users",
        documents: [
          {
            name: "Ada",
          },
          {
            name: "Grace",
          },
        ],
      },
    }) as Document;

    expect(result["acknowledged"]).toBe(true);
    expect(result["insertedCount"]).toBe(2);

    const insertedIds = result["insertedIds"];

    expect(Array.isArray(insertedIds)).toBe(true);

    if (!Array.isArray(insertedIds)) {
      throw new Error("Expected insertMany to return inserted IDs.");
    }

    expect(insertedIds).toHaveLength(2);
    expect(insertedIds[0]).toBeInstanceOf(CustomId);
    expect(insertedIds[1]).toBeInstanceOf(CustomId);

    expect(catalog.getCollection("app", "users")?.documentCount).toBe(2);
  });

  it("reports ordered batch progress when an insert fails", () => {
    const catalog = new InMemoryCatalog();
    const dispatcher = new CommandDispatcher(catalog);
    const duplicateId = CustomId.fromHexString(
      "00112233445566778899aabbccddeeff",
    );
    const skippedId = CustomId.fromHexString(
      "ffeeddccbbaa99887766554433221100",
    );

    dispatcher.dispatch({
      command: ServerCommand.InsertOne,
      database: "app",
      parameters: {
        collection: "users",
        document: {
          _id: duplicateId,
          name: "existing",
        },
      },
    });

    let thrown: unknown;

    try {
      dispatcher.dispatch({
        command: ServerCommand.InsertMany,
        database: "app",
        parameters: {
          collection: "users",
          documents: [
            {
              name: "inserted",
            },
            {
              _id: duplicateId,
              name: "duplicate",
            },
            {
              _id: skippedId,
              name: "skipped",
            },
          ],
        },
      });
    } catch (error: unknown) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(CommandExecutionError);

    if (thrown instanceof CommandExecutionError) {
      expect(thrown.code).toBe(WireErrorCode.DuplicateKey);
      expect(thrown.name).toBe("DuplicateKey");
      expect(thrown.details?.["failedIndex"]).toBe(1);
      expect(thrown.details?.["insertedCount"]).toBe(1);

      const insertedIds = thrown.details?.["insertedIds"];

      expect(Array.isArray(insertedIds)).toBe(true);
      expect(insertedIds).toHaveLength(1);
    }

    const collection = catalog.getCollection("app", "users");

    expect(collection?.documentCount).toBe(2);
    expect(collection?.findById(skippedId)).toBeUndefined();
  });

  it("rejects an empty insert batch", () => {
    expectCommandError(
      () =>
        createDispatcher().dispatch({
          command: ServerCommand.InsertMany,
          database: "app",
          parameters: {
            collection: "users",
            documents: [],
          },
        }),
      WireErrorCode.InvalidRequest,
    );
  });

  it("requires insertMany documents", () => {
    expectCommandError(
      () =>
        createDispatcher().dispatch({
          command: ServerCommand.InsertMany,
          database: "app",
          parameters: {
            collection: "users",
          },
        }),
      WireErrorCode.InvalidRequest,
    );
  });

  it("does not share cursors between sessions", () => {
    const catalog = new InMemoryCatalog();
    const dispatcher = new CommandDispatcher(catalog);
    const sessionA = new CursorManager();
    const sessionB = new CursorManager();

    dispatcher.dispatch(
      {
        command: "insertMany",
        database: "app",
        parameters: {
          collection: "users",
          documents: [{ n: 1 }, { n: 2 }, { n: 3 }],
        },
      },
      sessionA,
    );

    const opened = dispatcher.dispatch(
      {
        command: "find",
        database: "app",
        parameters: { collection: "users", filter: {}, batchSize: 1 },
      },
      sessionA,
    ) as { cursorId: number };

    expect(() =>
      dispatcher.dispatch(
        {
          command: "getMore",
          database: "app",
          parameters: { cursorId: opened.cursorId },
        },
        sessionB,
      ),
    ).toThrow(/does not exist/);
  });

  describe("projection", () => {
    function seeded(): CommandDispatcher {
      const dispatcher = createDispatcher();

      dispatcher.dispatch({
        command: "insertMany",
        database: "app",
        parameters: {
          collection: "users",
          documents: [
            { n: 1, name: "Ada", secret: "x" },
            { n: 2, name: "Grace", secret: "y" },
          ],
        },
      });

      return dispatcher;
    }

    it("projects find results", () => {
      const result = seeded().dispatch(
        {
          command: "find",
          database: "app",
          parameters: {
            collection: "users",
            filter: {},
            sort: [["n", -1]],
            projection: { name: 1, _id: 0 },
          },
        },
        new CursorManager(),
      );

      expect(result).toEqual({
        cursorId: null,
        documents: [{ name: "Grace" }, { name: "Ada" }],
      });
    });

    it("projects findOne results", () => {
      const result = seeded().dispatch({
        command: "findOne",
        database: "app",
        parameters: {
          collection: "users",
          filter: { n: 1 },
          projection: { secret: 0, _id: 0 },
        },
      });

      expect(result).toEqual({ document: { n: 1, name: "Ada" } });
    });

    it("rejects a projection that is not a document", () => {
      for (const command of ["find", "findOne"]) {
        expectCommandError(
          () =>
            seeded().dispatch(
              {
                command,
                database: "app",
                parameters: {
                  collection: "users",
                  filter: {},
                  projection: [["name", 1]],
                },
              },
              new CursorManager(),
            ),
          WireErrorCode.InvalidRequest,
        );
      }
    });

    it("rejects an invalid projection", () => {
      for (const command of ["find", "findOne"]) {
        expectCommandError(
          () =>
            seeded().dispatch(
              {
                command,
                database: "app",
                parameters: {
                  collection: "users",
                  filter: {},
                  projection: { name: 1, secret: 0 },
                },
              },
              new CursorManager(),
            ),
          WireErrorCode.DocumentValidationFailed,
        );
      }
    });
  });
});

function createDispatcher(): CommandDispatcher {
  return new CommandDispatcher(new InMemoryCatalog());
}

function expectCommandError(action: () => unknown, expectedCode: number): void {
  try {
    action();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(CommandExecutionError);

    if (error instanceof CommandExecutionError) {
      expect(error.code).toBe(expectedCode);
    }

    return;
  }

  throw new Error(`Expected wire error ${expectedCode}.`);
}
