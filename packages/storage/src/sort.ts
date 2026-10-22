import { CustomId, type Document, type DocumentValue } from "sinterdb-protocol";

import { StorageError, StorageErrorCode } from "./errors.js";
import { compareStrings } from "./filter.js";

export type SortDirection = 1 | -1;

export type SortSpecification = readonly (readonly [string, SortDirection])[];

export type CompiledSort = (documents: readonly Document[]) => Document[];

interface SortKey {
  readonly segments: readonly string[];
  readonly direction: SortDirection;
}

interface Decorated {
  readonly document: Document;
  readonly values: readonly SortValue[];
  readonly arrival: number;
}

const Rank = {
  Missing: 0,
  Null: 1,
  Number: 2,
  String: 3,
  Binary: 4,
  Id: 5,
  Boolean: 6,
  Date: 7,
  Array: 8,
  Document: 9,
} as const;

export function compileSort(specification: SortSpecification): CompiledSort {
  const keys = parseSortSpecification(specification);

  return (documents) => {
    const decorated = documents.map((document, arrival) =>
      decorate(keys, document, arrival),
    );

    decorated.sort((left, right) => compareDecorated(keys, left, right));

    return decorated.map((entry) => entry.document);
  };
}

/**
 * Like {@link compileSort}, but for the first `count` documents only. It holds
 * at most `count` documents at a time, so sorting a large stream for a few
 * results does not hold the stream in memory. The result is the same as
 * sorting everything and taking the first `count`.
 */
export function compileTopN(
  specification: SortSpecification,
  count: number,
): (documents: Iterable<Document>) => Document[] {
  const keys = parseSortSpecification(specification);

  return (documents) => {
    const kept: Decorated[] = [];
    let arrival = 0;

    if (count < 1) {
      return [];
    }

    for (const document of documents) {
      const entry = decorate(keys, document, arrival);

      arrival += 1;

      if (
        kept.length === count &&
        compareDecorated(keys, entry, kept[count - 1] as Decorated) > 0
      ) {
        continue;
      }

      let low = 0;
      let high = kept.length;

      while (low < high) {
        const middle = (low + high) >>> 1;

        if (compareDecorated(keys, kept[middle] as Decorated, entry) < 0) {
          low = middle + 1;
        } else {
          high = middle;
        }
      }

      kept.splice(low, 0, entry);

      if (kept.length > count) {
        kept.pop();
      }
    }

    return kept.map((entry) => entry.document);
  };
}

export function compareDocumentValues(
  left: DocumentValue,
  right: DocumentValue,
): number {
  return compareSortValues(
    { rank: rankOf(left), value: left },
    { rank: rankOf(right), value: right },
  );
}

/**
 * Like {@link compareDocumentValues}, but `undefined` stands for a field the
 * document does not have, which sorts before everything else.
 */
export function compareOptionalValues(
  left: DocumentValue | undefined,
  right: DocumentValue | undefined,
): number {
  return compareSortValues(
    {
      rank: left === undefined ? Rank.Missing : rankOf(left),
      value: left,
    },
    {
      rank: right === undefined ? Rank.Missing : rankOf(right),
      value: right,
    },
  );
}

function parseSortSpecification(
  specification: SortSpecification,
): readonly SortKey[] {
  if (!Array.isArray(specification) || specification.length === 0) {
    throw invalidSort("Sort must be a non-empty array of [path, direction].");
  }

  const seen = new Set<string>();

  return specification.map((entry) => {
    if (!Array.isArray(entry) || entry.length !== 2) {
      throw invalidSort("Each sort entry must be a [path, direction] pair.");
    }

    const path: unknown = entry[0];
    const direction: unknown = entry[1];

    if (typeof path !== "string" || path.length === 0) {
      throw invalidSort("Sort path must be a non-empty string.");
    }

    if (direction !== 1 && direction !== -1) {
      throw invalidSort(
        `Sort direction for ${JSON.stringify(path)} must be 1 or -1.`,
      );
    }

    if (seen.has(path)) {
      throw invalidSort(`Sort path ${JSON.stringify(path)} is repeated.`);
    }

    seen.add(path);

    const segments = path.split(".");

    for (const segment of segments) {
      if (segment.length === 0 || segment.startsWith("$")) {
        throw invalidSort(
          `Sort path ${JSON.stringify(path)} contains an empty or reserved segment.`,
        );
      }
    }

    return { segments: Object.freeze(segments), direction };
  });
}

interface SortValue {
  readonly rank: number;
  readonly value: DocumentValue | undefined;
}

function resolveSortValue(
  document: Document,
  segments: readonly string[],
): SortValue {
  let current: Document = document;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index] as string;

    if (!Object.hasOwn(current, segment)) {
      return { rank: Rank.Missing, value: undefined };
    }

    const value = current[segment] as DocumentValue;

    if (index === segments.length - 1) {
      return { rank: rankOf(value), value };
    }

    if (rankOf(value) !== Rank.Document) {
      return { rank: Rank.Missing, value: undefined };
    }

    current = value as Document;
  }

  return { rank: Rank.Missing, value: undefined };
}

function rankOf(value: DocumentValue): number {
  if (value === null) {
    return Rank.Null;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return Rank.Number;
  }

  if (typeof value === "string") {
    return Rank.String;
  }

  if (typeof value === "boolean") {
    return Rank.Boolean;
  }

  if (value instanceof Date) {
    return Rank.Date;
  }

  if (value instanceof Uint8Array) {
    return Rank.Binary;
  }

  if (value instanceof CustomId) {
    return Rank.Id;
  }

  return Array.isArray(value) ? Rank.Array : Rank.Document;
}

function compareSortValues(left: SortValue, right: SortValue): number {
  if (left.rank !== right.rank) {
    return left.rank < right.rank ? -1 : 1;
  }

  const a = left.value;
  const b = right.value;

  switch (left.rank) {
    case Rank.Number:
      return compareNumbers(a as number | bigint, b as number | bigint);

    case Rank.String:
      return compareStrings(a as string, b as string);

    case Rank.Boolean:
      return compareOrdered(Number(a as boolean), Number(b as boolean));

    case Rank.Date:
      return compareNumbers((a as Date).getTime(), (b as Date).getTime());

    case Rank.Binary:
      return compareBytes(a as Uint8Array, b as Uint8Array);

    case Rank.Id:
      return compareBytes((a as CustomId).toBytes(), (b as CustomId).toBytes());

    default:
      return 0;
  }
}

function compareNumbers(left: number | bigint, right: number | bigint): number {
  const leftNaN = typeof left === "number" && Number.isNaN(left);
  const rightNaN = typeof right === "number" && Number.isNaN(right);

  if (leftNaN || rightNaN) {
    return leftNaN === rightNaN ? 0 : leftNaN ? -1 : 1;
  }

  return compareOrdered(left, right);
}

function compareOrdered<T extends string | number | bigint>(
  left: T,
  right: T,
): number {
  if (left < right) {
    return -1;
  }

  return left > right ? 1 : 0;
}

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  const length = Math.min(left.byteLength, right.byteLength);

  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);

    if (difference !== 0) {
      return difference < 0 ? -1 : 1;
    }
  }

  return compareOrdered(left.byteLength, right.byteLength);
}

/** Orders by the sort keys, then by arrival, so equal documents keep order. */
function compareDecorated(
  keys: readonly SortKey[],
  left: Decorated,
  right: Decorated,
): number {
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index] as SortKey;
    const comparison = compareSortValues(
      left.values[index] as SortValue,
      right.values[index] as SortValue,
    );

    if (comparison !== 0) {
      return comparison * key.direction;
    }
  }

  return left.arrival - right.arrival;
}

function decorate(
  keys: readonly SortKey[],
  document: Document,
  arrival: number,
): Decorated {
  return {
    document,
    values: keys.map((key) => resolveSortValue(document, key.segments)),
    arrival,
  };
}

function invalidSort(message: string): StorageError {
  return new StorageError(StorageErrorCode.InvalidFindOptions, message);
}
