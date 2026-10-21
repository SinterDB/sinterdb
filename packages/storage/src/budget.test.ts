import type { Document } from "sinterdb-protocol";
import { describe, expect, it } from "vitest";

import { OperationBudget } from "./budget.js";
import { StorageError, StorageErrorCode } from "./errors.js";
import { InMemoryCollection } from "./in-memory-collection.js";

function collectionOf(size: number): InMemoryCollection {
  const collection = new InMemoryCollection();

  collection.insertMany(
    Array.from({ length: size }, (_, index) => ({
      n: index,
      team: index % 2 === 0 ? "a" : "b",
    })),
  );

  return collection;
}

function codeOf(action: () => unknown): string {
  try {
    action();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(StorageError);

    return (error as StorageError).code;
  }

  throw new Error("Expected the operation to fail.");
}

function clock(): { now: () => number; advance: (ms: number) => void } {
  let time = 1_000;

  return {
    now: () => time,
    advance: (ms) => {
      time += ms;
    },
  };
}

describe("OperationBudget", () => {
  it("allows exactly maxScanned documents", () => {
    const budget = new OperationBudget({ maxScanned: 3 });

    budget.charge();
    budget.charge();
    budget.charge();

    expect(budget.documentsScanned).toBe(3);
    expect(codeOf(() => budget.charge())).toBe(
      StorageErrorCode.ScanLimitExceeded,
    );
  });

  it("is unlimited without limits", () => {
    const budget = new OperationBudget();

    for (let index = 0; index < 1000; index += 1) {
      budget.charge();
    }

    expect(budget.documentsScanned).toBe(1000);
  });

  it("stops once the time is up, looking at the clock for the first document", () => {
    const time = clock();
    const budget = new OperationBudget({ maxTimeMS: 100 }, time.now);

    budget.charge();
    time.advance(99);
    budget.charge();
    time.advance(1);

    for (let index = 0; index < 62; index += 1) {
      budget.charge();
    }

    expect(codeOf(() => budget.charge())).toBe(
      StorageErrorCode.OperationTimeLimitExceeded,
    );
  });

  it("stops at the first document when the time is already up", () => {
    const time = clock();
    const budget = new OperationBudget({ maxTimeMS: 5 }, time.now);

    time.advance(5);

    expect(codeOf(() => budget.charge())).toBe(
      StorageErrorCode.OperationTimeLimitExceeded,
    );
  });

  it("restarts the count and the clock", () => {
    const time = clock();
    const budget = new OperationBudget(
      { maxScanned: 1, maxTimeMS: 10 },
      time.now,
    );

    budget.charge();
    time.advance(50);
    budget.restart({ maxScanned: 2, maxTimeMS: 10 });
    budget.charge();
    budget.charge();

    expect(budget.documentsScanned).toBe(2);

    budget.restart();

    for (let index = 0; index < 500; index += 1) {
      budget.charge();
    }
  });

  it("rejects limits that are not positive safe integers", () => {
    for (const limits of [
      { maxTimeMS: 0 },
      { maxTimeMS: -1 },
      { maxTimeMS: 1.5 },
      { maxTimeMS: Number.NaN },
      { maxScanned: 0 },
      { maxScanned: 2 ** 53 },
    ]) {
      expect(codeOf(() => new OperationBudget(limits))).toBe(
        StorageErrorCode.InvalidFindOptions,
      );
    }
  });
});

describe("budgets in queries", () => {
  it("limits the documents find examines", () => {
    const collection = collectionOf(10);

    expect([
      ...collection.find(
        {},
        { budget: new OperationBudget({ maxScanned: 10 }) },
      ),
    ]).toHaveLength(10);
    expect(
      codeOf(() => [
        ...collection.find(
          {},
          { budget: new OperationBudget({ maxScanned: 9 }) },
        ),
      ]),
    ).toBe(StorageErrorCode.ScanLimitExceeded);
  });

  it("charges examined documents, not returned ones", () => {
    const collection = collectionOf(10);
    const budget = new OperationBudget({ maxScanned: 100 });

    expect([...collection.find({ team: "a" }, { budget })]).toHaveLength(5);
    expect(budget.documentsScanned).toBe(10);
  });

  it("stops examining once a limit has been reached", () => {
    const collection = collectionOf(10);
    const budget = new OperationBudget({ maxScanned: 100 });

    expect([...collection.find({}, { limit: 3, budget })]).toHaveLength(3);
    expect(budget.documentsScanned).toBe(3);
  });

  it("charges while sorting", () => {
    const collection = collectionOf(10);

    expect(
      codeOf(() => [
        ...collection.find(
          {},
          {
            sort: [["n", -1]],
            budget: new OperationBudget({ maxScanned: 5 }),
          },
        ),
      ]),
    ).toBe(StorageErrorCode.ScanLimitExceeded);
  });

  it("charges only the documents an index selects", () => {
    const collection = collectionOf(100);

    collection.createIndex({ name: "n", keys: [["n", 1]] });

    const budget = new OperationBudget({ maxScanned: 100 });

    expect([...collection.find({ n: 7 }, { budget })]).toHaveLength(1);
    expect(budget.documentsScanned).toBe(1);
  });

  it("limits findOne, count and distinct", () => {
    const collection = collectionOf(10);
    const tight = () => new OperationBudget({ maxScanned: 3 });

    expect(
      codeOf(() => collection.findOne({ n: 9 }, { budget: tight() })),
    ).toBe(StorageErrorCode.ScanLimitExceeded);
    expect(collection.findOne({ n: 2 }, { budget: tight() })).toBeDefined();
    expect(codeOf(() => collection.count({ team: "a" }, tight()))).toBe(
      StorageErrorCode.ScanLimitExceeded,
    );
    expect(codeOf(() => collection.distinct("team", {}, tight()))).toBe(
      StorageErrorCode.ScanLimitExceeded,
    );
  });

  it("does not charge a count that needs no scan", () => {
    const collection = collectionOf(10);
    const budget = new OperationBudget({ maxScanned: 1 });

    expect(collection.count({}, budget)).toBe(10);
    expect(budget.documentsScanned).toBe(0);
  });

  it("limits what the first stage of a pipeline reads", () => {
    const collection = collectionOf(10);
    const pipeline: Document[] = [{ $match: { team: "a" } }, { $count: "n" }];

    expect([
      ...collection.aggregate(pipeline, {
        budget: new OperationBudget({ maxScanned: 10 }),
      }),
    ]).toEqual([{ n: 5 }]);
    expect(
      codeOf(() => [
        ...collection.aggregate(pipeline, {
          budget: new OperationBudget({ maxScanned: 4 }),
        }),
      ]),
    ).toBe(StorageErrorCode.ScanLimitExceeded);
  });

  it("limits the time a scan takes", () => {
    const time = clock();
    const collection = collectionOf(200);
    const budget = new OperationBudget({ maxTimeMS: 10 }, time.now);
    const iterator = collection.find({}, { budget });

    iterator.next();
    time.advance(10);

    expect(
      codeOf(() => {
        for (let index = 0; index < 200; index += 1) {
          iterator.next();
        }
      }),
    ).toBe(StorageErrorCode.OperationTimeLimitExceeded);
  });
});
