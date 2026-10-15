import { StorageError, StorageErrorCode } from "../errors.js";

export const ID_INDEX_NAME = "_id_";
export const MAX_INDEXES_PER_COLLECTION = 32;
export const MAX_INDEX_NAME_LENGTH = 127;
export const MAX_INDEX_KEYS = 8;

/** One field of an index and the order it is kept in. */
export interface IndexKey {
  readonly field: string;
  readonly direction: 1 | -1;
}

export interface IndexSpec {
  readonly name: string;
  /** The indexed fields in order. A compound index has more than one. */
  readonly keys: readonly IndexKey[];
  /** At most one document may have a given combination of values. */
  readonly unique: boolean;
  /**
   * Documents without the field are not indexed, so they never conflict. For a
   * compound index a document is left out only when it has none of the fields.
   */
  readonly sparse: boolean;
}

export interface CreateIndexInput {
  /** A single-field index. Use `keys` for more than one field. */
  readonly field?: string;
  readonly direction?: 1 | -1;
  /** A compound index: `[field, direction]` pairs in order. */
  readonly keys?: readonly (readonly [string, 1 | -1])[];
  readonly unique?: boolean;
  readonly sparse?: boolean;
  readonly name?: string;
}

export function normalizeIndexSpec(input: CreateIndexInput): IndexSpec {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalidIndex("An index definition must be an object.");
  }

  const keys = readKeys(input);
  const unique = readFlag(input.unique, "unique");
  const sparse = readFlag(input.sparse, "sparse");
  const name =
    input.name ?? keys.map((key) => `${key.field}_${key.direction}`).join("_");

  if (
    typeof name !== "string" ||
    name.length === 0 ||
    name.length > MAX_INDEX_NAME_LENGTH ||
    name === ID_INDEX_NAME ||
    [...name].some((character) => character.charCodeAt(0) < 32)
  ) {
    throw invalidIndex(
      `Index names must be 1 to ${MAX_INDEX_NAME_LENGTH} characters without control characters, and cannot be ${JSON.stringify(ID_INDEX_NAME)}.`,
    );
  }

  return { name, keys, unique, sparse };
}

function readKeys(input: CreateIndexInput): IndexKey[] {
  const hasField = input.field !== undefined;
  const hasKeys = input.keys !== undefined;

  if (hasField === hasKeys) {
    throw invalidIndex(
      'An index requires either "field" or "keys", and not both.',
    );
  }

  if (hasField) {
    const direction = input.direction ?? 1;

    return [readKey(input.field, direction)];
  }

  if (input.direction !== undefined) {
    throw invalidIndex(
      'With "keys" the direction belongs inside each [field, direction] pair.',
    );
  }

  const { keys } = input;

  if (!Array.isArray(keys) || keys.length === 0) {
    throw invalidIndex(
      "Index keys must be a non-empty array of [field, direction] pairs.",
    );
  }

  if (keys.length > MAX_INDEX_KEYS) {
    throw invalidIndex(
      `An index can have at most ${MAX_INDEX_KEYS} fields, but ${keys.length} were given.`,
    );
  }

  const result: IndexKey[] = [];
  const seen = new Set<string>();

  for (const entry of keys as readonly unknown[]) {
    if (!Array.isArray(entry) || entry.length !== 2) {
      throw invalidIndex("Each index key must be a [field, direction] pair.");
    }

    const key = readKey(entry[0], entry[1]);

    if (seen.has(key.field)) {
      throw invalidIndex(
        `Index field ${JSON.stringify(key.field)} is repeated.`,
      );
    }

    seen.add(key.field);
    result.push(key);
  }

  return result;
}

function readKey(field: unknown, direction: unknown): IndexKey {
  if (typeof field !== "string" || field.length === 0) {
    throw invalidIndex("An index requires a non-empty field path.");
  }

  for (const segment of field.split(".")) {
    if (
      segment.length === 0 ||
      segment.startsWith("$") ||
      segment === "__proto__"
    ) {
      throw invalidIndex(
        `Index field path ${JSON.stringify(field)} contains an empty or reserved segment.`,
      );
    }
  }

  if (field === "_id" || field.startsWith("_id.")) {
    throw invalidIndex(
      "The _id field always has a unique index, which cannot be created or changed.",
    );
  }

  if (direction !== 1 && direction !== -1) {
    throw invalidIndex("Index direction must be 1 or -1.");
  }

  return { field, direction };
}

export function sameDefinition(left: IndexSpec, right: IndexSpec): boolean {
  return (
    left.unique === right.unique &&
    left.sparse === right.sparse &&
    left.keys.length === right.keys.length &&
    left.keys.every((key, position) => {
      const other = right.keys[position] as IndexKey;

      return key.field === other.field && key.direction === other.direction;
    })
  );
}

/** Whether two indexes cover the same fields in the same order. */
export function sameFields(left: IndexSpec, right: IndexSpec): boolean {
  return (
    left.keys.length === right.keys.length &&
    left.keys.every(
      (key, position) => key.field === (right.keys[position] as IndexKey).field,
    )
  );
}

export function idIndexSpec(): IndexSpec {
  return {
    name: ID_INDEX_NAME,
    keys: [{ field: "_id", direction: 1 }],
    unique: true,
    sparse: false,
  };
}

function readFlag(value: boolean | undefined, name: string): boolean {
  if (value === undefined) {
    return false;
  }

  if (typeof value !== "boolean") {
    throw invalidIndex(`Index option ${name} must be a boolean.`);
  }

  return value;
}

function invalidIndex(message: string): StorageError {
  return new StorageError(StorageErrorCode.InvalidIndex, message);
}
