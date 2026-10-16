import { WireErrorCode } from "sinterdb-protocol";
import { describe, expect, it } from "vitest";

import { InMemoryCatalog } from "./catalog.js";
import { CursorManager } from "./cursor-manager.js";
import {
  CommandDispatcher,
  CommandExecutionError,
} from "./command-dispatcher.js";

type Batch = { cursorId: number | null; documents: Record<string, unknown>[] };

function setup(): CommandDispatcher {
  const dispatcher = new CommandDispatcher(new InMemoryCatalog());

  dispatcher.dispatch({
    command: "insertMany",
    database: "app",
    parameters: {
      collection: "users",
      documents: Array.from({ length: 10 }, (_, index) => ({
        n: index,
        team: index % 2 === 0 ? "a" : "b",
      })),
    },
  });

  return dispatcher;
}

function aggregate(
  dispatcher: CommandDispatcher,
  parameters: Record<string, unknown>,
  collection = "users",
  cursors?: CursorManager,
): Batch {
  return dispatcher.dispatch(
    {
      command: "aggregate",
      database: "app",
      parameters: { collection, ...parameters } as never,
    },
    cursors,
  ) as never;
}

function expectWireError(action: () => unknown, code: number): void {
  try {
    action();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(CommandExecutionError);
    expect((error as CommandExecutionError).code).toBe(code);

    return;
  }

  throw new Error(`Expected wire error ${code}.`);
}

describe("aggregate command", () => {
  it("runs a pipeline and returns its documents", () => {
    const batch = aggregate(setup(), {
      pipeline: [
        { $match: { team: "a" } },
        {
          $sort: [["n", -1]],
        },
        { $limit: 3 },
        { $project: { _id: 0, n: 1 } },
      ],
    });

    expect(batch).toEqual({
      cursorId: null,
      documents: [{ n: 8 }, { n: 6 }, { n: 4 }],
    });
  });

  it("accepts an empty pipeline", () => {
    expect(aggregate(setup(), { pipeline: [] }).documents).toHaveLength(10);
  });

  it("returns a count", () => {
    expect(
      aggregate(setup(), { pipeline: [{ $count: "total" }] }).documents,
    ).toEqual([{ total: 10 }]);
  });

  it("batches results and continues with getMore", () => {
    const dispatcher = setup();
    const cursors = new CursorManager();
    const first = aggregate(
      dispatcher,
      {
        pipeline: [{ $sort: [["n", 1]] }, { $project: { _id: 0, n: 1 } }],
        batchSize: 4,
      },
      "users",
      cursors,
    );

    expect(first.documents.map((document) => document["n"])).toEqual([
      0, 1, 2, 3,
    ]);
    expect(first.cursorId).not.toBeNull();

    const second = dispatcher.dispatch(
      {
        command: "getMore",
        database: "app",
        parameters: { cursorId: first.cursorId, batchSize: 100 } as never,
      },
      cursors,
    ) as unknown as Batch;

    expect(second.documents).toHaveLength(6);
    expect(second.cursorId).toBeNull();
  });

  it("groups documents", () => {
    expect(
      aggregate(setup(), {
        pipeline: [
          {
            $group: {
              _id: "$team",
              n: { $count: {} },
              total: { $sum: "$n" },
              top: { $max: "$n" },
            },
          },
          { $sort: [["_id", 1]] },
        ],
      }).documents,
    ).toEqual([
      { _id: "a", n: 5, total: 20, top: 8 },
      { _id: "b", n: 5, total: 25, top: 9 },
    ]);
  });

  it("reports a failure while grouping as a validation error", () => {
    const dispatcher = setup();

    dispatcher.dispatch({
      command: "insertMany",
      database: "app",
      parameters: { collection: "mixed", documents: [{ v: 1 }, { v: 2n }] },
    });

    expectWireError(
      () =>
        aggregate(
          dispatcher,
          { pipeline: [{ $group: { _id: null, t: { $sum: "$v" } } }] },
          "mixed",
        ),
      WireErrorCode.DocumentValidationFailed,
    );
  });

  it("returns nothing for a collection that does not exist", () => {
    expect(
      aggregate(setup(), { pipeline: [{ $count: "n" }] }, "nowhere"),
    ).toEqual({ cursorId: null, documents: [] });
  });

  it("rejects an invalid pipeline, even for a missing collection", () => {
    for (const pipeline of [
      [{ $group: { n: { $count: {} } } }],
      [{ $limit: 0 }],
      [{ $match: { a: { $bogus: 1 } } }],
      [{ $sort: { n: 1 } }],
      [{ $match: {}, $limit: 1 }],
    ]) {
      expectWireError(
        () => aggregate(setup(), { pipeline }),
        WireErrorCode.DocumentValidationFailed,
      );
      expectWireError(
        () => aggregate(setup(), { pipeline }, "nowhere"),
        WireErrorCode.DocumentValidationFailed,
      );
    }
  });

  it("rejects a pipeline that is not an array of documents", () => {
    for (const pipeline of [undefined, {}, "x", [1], [[]], [null]]) {
      expectWireError(
        () => aggregate(setup(), { pipeline }),
        WireErrorCode.InvalidRequest,
      );
    }
  });
});
