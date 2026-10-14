import { CustomId, type Document, type DocumentValue } from "sinterdb-protocol";
import { describe, expect, it } from "vitest";

import {
  StorageError,
  StorageErrorCode,
  StorageInsertManyError,
} from "../errors.js";
import { InMemoryCollection } from "../in-memory-collection.js";

function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Generator {
  public constructor(public readonly random: () => number) {}

  public int(limit: number): number {
    return Math.floor(this.random() * limit);
  }

  public pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)] as T;
  }

  public scalar(): DocumentValue {
    switch (this.int(12)) {
      case 0:
        return this.int(6);
      case 1:
        return this.int(6) - 3;
      case 2:
        return this.int(6) / 2;
      case 3:
        return this.pick([-0, 0, Number.NaN, Number.POSITIVE_INFINITY]);
      case 4:
        return BigInt(this.int(5));
      case 5:
        return this.pick(["a", "b", "ab", "", "B", "z"]);
      case 6:
        return this.pick([true, false]);
      case 7:
        return null;
      case 8:
        return new Date(this.int(5) * 1000);
      case 9:
        return new Uint8Array([this.int(3), this.int(3)]);
      case 10:
        return this.int(4);
      default:
        return this.pick(["a", "b", 1, 2]);
    }
  }

  public value(): DocumentValue {
    const roll = this.int(10);

    if (roll === 0) {
      return [this.scalar(), this.scalar()];
    }

    if (roll === 1) {
      return { x: this.scalar() };
    }

    return this.scalar();
  }

  public document(): Document {
    const document: Document = { _id: CustomId.generate() };

    if (this.int(8) !== 0) {
      document["f"] = this.value();
    }

    if (this.int(8) !== 0) {
      document["g"] = this.scalar();
    }

    if (this.int(8) !== 0) {
      const roll = this.int(8);

      document["n"] =
        roll === 0
          ? 5
          : roll === 1
            ? [{ x: this.scalar() }, { x: this.scalar() }]
            : { x: this.scalar() };
    }

    document["pad"] = this.int(3);

    return document;
  }

  public rangeOperand(): DocumentValue {
    return this.pick<DocumentValue>([
      this.int(6) - 1,
      this.int(6) / 2,
      this.pick(["a", "b", "ab", ""]),
      new Date(this.int(5) * 1000),
      BigInt(this.int(5)),
      new Uint8Array([this.int(3)]),
    ]);
  }

  public fieldCondition(): DocumentValue {
    switch (this.int(8)) {
      case 0:
        return this.value();
      case 1:
        return { $eq: this.value() };
      case 2:
        return {
          $in: Array.from({ length: 1 + this.int(4) }, () => this.value()),
        };
      case 3:
        return { $gt: this.rangeOperand() };
      case 4:
        return { $gte: this.rangeOperand(), $lt: this.rangeOperand() };
      case 5:
        return { $lte: this.rangeOperand() };
      case 6:
        return { $gt: this.rangeOperand(), $lte: this.rangeOperand() };
      default:
        return { $ne: this.value() };
    }
  }

  public filter(): Document {
    const filter: Document = {};
    const fields = ["f", "g", "n.x", "pad"];
    const count = 1 + this.int(2);

    for (let position = 0; position < count; position += 1) {
      filter[this.pick(fields)] = this.fieldCondition();
    }

    switch (this.int(6)) {
      case 0:
        return { $and: [filter, { pad: { $ne: this.int(3) } }] };
      case 1:
        return { ...filter, f: { $exists: true } as DocumentValue };
      case 2:
        return { $or: [filter, { g: this.scalar() }] };
      default:
        return filter;
    }
  }
}

type Outcome =
  | { ok: true; value: unknown }
  | { ok: false; code: string; error: StorageError };

function attempt(action: () => unknown): Outcome {
  try {
    return { ok: true, value: action() };
  } catch (error: unknown) {
    if (error instanceof StorageError) {
      return { ok: false, code: error.code, error };
    }

    throw error;
  }
}

function comparable(outcome: Outcome): unknown {
  return outcome.ok
    ? outcome
    : {
        ok: false,
        code: outcome.code,
        inserted:
          outcome.error instanceof StorageInsertManyError
            ? outcome.error.insertedIds.length
            : undefined,
      };
}

describe("indexed queries equal collection scans", () => {
  it(
    "returns identical results through random writes and queries",
    { timeout: 120_000 },
    () => {
      const generator = new Generator(createRandom(2026));
      const indexed = new InMemoryCollection();
      const plain = new InMemoryCollection();

      indexed.createIndex({ field: "f" });
      indexed.createIndex({ field: "g", sparse: true });
      indexed.createIndex({ field: "n.x", direction: -1 });

      let indexUsed = 0;
      let compared = 0;
      let nonEmpty = 0;

      for (let step = 0; step < 500; step += 1) {
        const roll = generator.int(10);
        let operation: (collection: InMemoryCollection) => unknown;

        if (roll < 3) {
          const documents = Array.from({ length: 1 + generator.int(4) }, () =>
            generator.document(),
          );

          operation = (collection) =>
            collection.insertMany(documents).insertedIds.length;
        } else if (roll < 5) {
          const filter = generator.filter();
          const update: Document = generator.pick([
            { $set: { f: generator.value() } },
            { $set: { g: generator.scalar() } },
            { $unset: { f: 1 } },
            { $set: { "n.x": generator.scalar() } },
            { $inc: { pad: 1 } },
          ]);

          operation =
            generator.int(2) === 0
              ? (collection) => collection.updateMany(filter, update)
              : (collection) => collection.updateOne(filter, update);
        } else if (roll < 6) {
          const filter = generator.filter();

          operation =
            generator.int(2) === 0
              ? (collection) => collection.deleteMany(filter)
              : (collection) => collection.deleteOne(filter);
        } else if (roll < 7) {
          const filter = generator.filter();
          const replacement = generator.document();

          delete replacement["_id"];
          operation = (collection) =>
            collection.replaceOne(filter, replacement);
        } else {
          operation = () => undefined;
        }

        const left = attempt(() => operation(indexed));
        const right = attempt(() => operation(plain));

        expect(comparable(left), `step ${step}`).toEqual(comparable(right));

        for (let query = 0; query < 4; query += 1) {
          const filter = generator.filter();
          const options =
            generator.int(4) === 0
              ? { skip: generator.int(3), limit: 1 + generator.int(5) }
              : {};
          const expected = [...plain.find(filter, options)];

          expect(
            [...indexed.find(filter, options)],
            `step ${step}: ${JSON.stringify(filter, (_k, v: unknown) => (typeof v === "bigint" ? `${v}n` : v))}`,
          ).toEqual(expected);

          expect(indexed.findOne(filter)).toEqual(plain.findOne(filter));

          compared += 1;

          if (expected.length > 0) {
            nonEmpty += 1;
          }

          if (indexed.explain(filter).stage !== "COLLSCAN") {
            indexUsed += 1;
          }
        }

        if (step % 50 === 0) {
          expect(indexed.validateIndexes(), `step ${step}`).toMatchObject({
            valid: true,
          });
        }
      }

      expect(indexed.validateIndexes().valid).toBe(true);
      expect(compared).toBe(2000);
      expect(nonEmpty).toBeGreaterThan(150);
      expect(indexUsed).toBeGreaterThan(120);
    },
  );

  it(
    "returns identical results when the index is built after the data",
    { timeout: 120_000 },
    () => {
      const generator = new Generator(createRandom(77));
      const documents = Array.from({ length: 300 }, () => generator.document());
      const indexed = new InMemoryCollection();
      const plain = new InMemoryCollection();

      indexed.insertMany(documents);
      plain.insertMany(documents);
      indexed.createIndex({ field: "f" });
      indexed.createIndex({ field: "g" });
      indexed.createIndex({ field: "n.x" });

      let used = 0;

      for (let query = 0; query < 600; query += 1) {
        const filter = generator.filter();

        expect([...indexed.find(filter)]).toEqual([...plain.find(filter)]);

        if (indexed.explain(filter).stage !== "COLLSCAN") {
          used += 1;
        }
      }

      expect(used).toBeGreaterThan(50);
      expect(indexed.validateIndexes().valid).toBe(true);
    },
  );
});

describe("unique constraints under random writes", () => {
  it(
    "never allows a duplicate and never leaves a failed write half-applied",
    { timeout: 120_000 },
    () => {
      const generator = new Generator(createRandom(4242));
      const collection = new InMemoryCollection();

      collection.createIndex({ field: "u", unique: true });
      collection.createIndex({ field: "s", unique: true, sparse: true });

      const value = (): DocumentValue =>
        generator.pick<DocumentValue>([0, 1, 2, 3, null, "a", "b", 1n]);
      let failures = 0;
      let successes = 0;

      for (let step = 0; step < 1500; step += 1) {
        const before = [...collection.find({})];
        const roll = generator.int(8);
        let operation: () => unknown;

        if (roll < 3) {
          operation = () =>
            collection.insertOne({
              ...(generator.int(5) === 0 ? {} : { u: value() }),
              ...(generator.int(2) === 0 ? {} : { s: value() }),
            });
        } else if (roll < 4) {
          operation = () =>
            collection.insertMany(
              Array.from({ length: 1 + generator.int(3) }, () => ({
                u: value(),
              })),
            );
        } else if (roll < 5) {
          const target = value();
          const next = value();

          operation = () =>
            collection.updateMany({ u: target }, { $set: { u: next } });
        } else if (roll < 6) {
          operation = () => collection.updateMany({}, { $inc: { n: 1 } });
        } else if (roll < 7) {
          const target = value();

          operation = () => collection.deleteMany({ u: target });
        } else {
          const target = value();
          const next = value();

          operation = () => collection.replaceOne({ u: target }, { u: next });
        }

        const outcome = attempt(operation);

        if (outcome.ok) {
          successes += 1;
        } else {
          failures += 1;

          if (outcome.code === StorageErrorCode.DuplicateKey) {
            const after = [...collection.find({})];

            if (outcome.error instanceof StorageInsertManyError) {
              // insertMany keeps the documents accepted before the failure.
              expect(after.slice(0, before.length), `step ${step}`).toEqual(
                before,
              );
              expect(after.length - before.length, `step ${step}`).toBe(
                outcome.error.insertedIds.length,
              );
            } else {
              expect(after, `step ${step}`).toEqual(before);
            }
          }
        }

        const documents = [...collection.find({})];
        const seen = new Set<string>();

        for (const document of documents) {
          if (Object.hasOwn(document, "u")) {
            const key = `${typeof document["u"]}:${String(document["u"])}`;

            expect(seen.has(key), `step ${step}: duplicate u ${key}`).toBe(
              false,
            );
            seen.add(key);
          }
        }

        expect(
          documents.filter((d) => !Object.hasOwn(d, "u")).length,
        ).toBeLessThanOrEqual(1);

        if (step % 25 === 0) {
          expect(collection.validateIndexes(), `step ${step}`).toMatchObject({
            valid: true,
          });
        }
      }

      expect(failures).toBeGreaterThan(100);
      expect(successes).toBeGreaterThan(300);
      expect(collection.validateIndexes().valid).toBe(true);
    },
  );
});
