import { WireErrorCode } from "sinterdb-protocol";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InMemoryCatalog } from "./catalog.js";
import { CursorManager } from "./cursor-manager.js";
import {
  CommandDispatcher,
  CommandExecutionError,
} from "./command-dispatcher.js";

type Batch = { cursorId: number | null; documents: Record<string, unknown>[] };

function setup(count = 10): CommandDispatcher {
  const dispatcher = new CommandDispatcher(new InMemoryCatalog());

  dispatcher.dispatch({
    command: "insertMany",
    database: "app",
    parameters: {
      collection: "users",
      documents: Array.from({ length: count }, (_, index) => ({
        n: index,
        team: index % 2 === 0 ? "a" : "b",
      })),
    },
  });

  return dispatcher;
}

function run(
  dispatcher: CommandDispatcher,
  command: string,
  parameters: Record<string, unknown>,
  cursors?: CursorManager,
  collection = "users",
): unknown {
  return dispatcher.dispatch(
    {
      command,
      database: "app",
      parameters: { collection, ...parameters } as never,
    },
    cursors,
  );
}

function wireError(action: () => unknown): CommandExecutionError {
  try {
    action();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(CommandExecutionError);

    return error as CommandExecutionError;
  }

  throw new Error("Expected a wire error.");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("query budgets: maxScanned", () => {
  it("allows a command that stays within the limit", () => {
    const dispatcher = setup();

    expect(
      (run(dispatcher, "find", { filter: {}, maxScanned: 10 }) as Batch)
        .documents,
    ).toHaveLength(10);
    expect(
      run(dispatcher, "count", { filter: { n: 3 }, maxScanned: 10 }),
    ).toEqual({ count: 1 });
  });

  it("fails find, aggregate, count, distinct and findOne over the limit", () => {
    const dispatcher = setup();
    const commands: [string, Record<string, unknown>][] = [
      ["find", { filter: {} }],
      ["aggregate", { pipeline: [{ $count: "n" }] }],
      ["count", { filter: { team: "a" } }],
      ["distinct", { field: "team", filter: {} }],
      ["findOne", { filter: { n: 9 } }],
    ];

    for (const [command, parameters] of commands) {
      const error = wireError(() =>
        run(dispatcher, command, { ...parameters, maxScanned: 3 }),
      );

      expect(error.code).toBe(WireErrorCode.ScanLimitExceeded);
      expect(error.name).toBe("ScanLimitExceeded");
      expect(error.details).toEqual({
        storageErrorCode: "SCAN_LIMIT_EXCEEDED",
      });
    }
  });

  it("is unlimited by default", () => {
    expect(
      (run(setup(500), "find", { filter: {}, batchSize: 500 }) as Batch)
        .documents,
    ).toHaveLength(500);
  });

  it("does not charge a count of the whole collection", () => {
    expect(run(setup(), "count", { filter: {}, maxScanned: 1 })).toEqual({
      count: 10,
    });
  });
});

describe("query budgets: maxTimeMS", () => {
  it("stops a scan that runs out of time", () => {
    const dispatcher = setup(1000);
    let time = 1_000_000;

    vi.spyOn(Date, "now").mockImplementation(() => {
      time += 10;

      return time;
    });

    const error = wireError(() =>
      run(dispatcher, "find", { filter: {}, batchSize: 1000, maxTimeMS: 25 }),
    );

    expect(error.code).toBe(WireErrorCode.OperationTimeLimitExceeded);
    expect(error.details).toEqual({
      storageErrorCode: "OPERATION_TIME_LIMIT_EXCEEDED",
    });
  });

  it("lets a scan finish when the time is enough", () => {
    expect(
      (
        run(setup(), "find", {
          filter: {},
          maxTimeMS: 60_000,
        }) as Batch
      ).documents,
    ).toHaveLength(10);
  });
});

describe("query budgets: getMore", () => {
  it("gives every batch its own budget", () => {
    const dispatcher = setup();
    const cursors = new CursorManager();
    let batch = run(
      dispatcher,
      "find",
      { filter: {}, batchSize: 3, maxScanned: 4 },
      cursors,
    ) as Batch;
    let total = batch.documents.length;

    while (batch.cursorId !== null) {
      batch = run(
        dispatcher,
        "getMore",
        { cursorId: batch.cursorId, batchSize: 3, maxScanned: 4 },
        cursors,
        "ignored",
      ) as Batch;
      total += batch.documents.length;
    }

    expect(total).toBe(10);
  });

  it("applies the limits of the getMore, and ends the cursor when they fail", () => {
    const dispatcher = setup();
    const cursors = new CursorManager();
    const first = run(
      dispatcher,
      "find",
      { filter: {}, batchSize: 3 },
      cursors,
    ) as Batch;
    const cursorId = first.cursorId as number;

    const error = wireError(() =>
      run(
        dispatcher,
        "getMore",
        { cursorId, batchSize: 3, maxScanned: 2 },
        cursors,
      ),
    );

    expect(error.code).toBe(WireErrorCode.ScanLimitExceeded);
    expect(cursors.activeCursorCount).toBe(0);
    expect(
      wireError(() => run(dispatcher, "getMore", { cursorId }, cursors)).code,
    ).toBe(WireErrorCode.CursorNotFound);
  });

  it("does not carry the first limits over to a getMore without any", () => {
    const dispatcher = setup();
    const cursors = new CursorManager();
    const first = run(
      dispatcher,
      "find",
      { filter: {}, batchSize: 3, maxScanned: 4 },
      cursors,
    ) as Batch;
    const rest = run(
      dispatcher,
      "getMore",
      { cursorId: first.cursorId, batchSize: 100 },
      cursors,
    ) as Batch;

    expect(rest.documents).toHaveLength(7);
    expect(rest.cursorId).toBeNull();
  });
});

describe("query budgets: validation", () => {
  it("rejects limits that are not positive safe integers", () => {
    const dispatcher = setup();

    for (const name of ["maxTimeMS", "maxScanned"]) {
      for (const value of [0, -1, 1.5, "5", Number.NaN, 2 ** 53, null]) {
        for (const [command, parameters] of [
          ["find", { filter: {} }],
          ["findOne", { filter: {} }],
          ["count", { filter: {} }],
          ["distinct", { field: "n", filter: {} }],
          ["aggregate", { pipeline: [] }],
          ["getMore", { cursorId: 1 }],
        ] as [string, Record<string, unknown>][]) {
          expect(
            wireError(() =>
              run(dispatcher, command, { ...parameters, [name]: value }),
            ).code,
          ).toBe(WireErrorCode.InvalidRequest);
        }
      }
    }
  });

  it("rejects bad limits even for a collection that does not exist", () => {
    expect(
      wireError(() =>
        run(
          setup(),
          "find",
          { filter: {}, maxTimeMS: 0 },
          undefined,
          "nowhere",
        ),
      ).code,
    ).toBe(WireErrorCode.InvalidRequest);
  });
});
