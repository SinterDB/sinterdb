import type { Document, DocumentValue } from "sinterdb-protocol";

import { StorageError, StorageErrorCode } from "./errors.js";

/** Reshapes a matching document into the document a query returns. */
export type CompiledProjection = (document: Document) => Document;

/** A projection node: `true` selects a whole field, a map selects inside it. */
type Leaf = true;
type Branch = Map<string, Leaf | Branch>;

const LEAF: Leaf = true;

/**
 * Compiles a projection such as `{ name: 1, "address.city": 1 }` (keep only
 * these fields) or `{ secret: 0 }` (keep everything except these fields).
 *
 * - Values are `1` or `true` to include and `0` or `false` to exclude.
 * - Inclusion and exclusion cannot be mixed, except that `_id: 0` may be
 *   combined with inclusions, and `_id: 1` with exclusions.
 * - `_id` is kept unless it is excluded. `{ _id: 1 }` alone returns only ids.
 * - A dotted path steps into documents and, by field name, into arrays of
 *   documents. Array elements that are not documents are dropped when a path
 *   runs through them, and positions such as `items.0` are not supported.
 * - Two paths may not overlap (`a` and `a.b`).
 * - An empty projection returns the document unchanged.
 */
export function compileProjection(projection: Document): CompiledProjection {
  if (!isPlainObject(projection)) {
    throw invalidProjection("Projection must be a document.");
  }

  const entries = Object.keys(projection).map((path) => ({
    path,
    include: parseFlag(path, projection[path]),
  }));

  if (entries.length === 0) {
    return (document) => document;
  }

  const idEntry = entries.find((entry) => entry.path === "_id");
  const fields = entries.filter((entry) => entry.path !== "_id");
  const includes = fields.some((entry) => entry.include);
  const excludes = fields.some((entry) => !entry.include);

  if (includes && excludes) {
    throw invalidProjection(
      "Projection cannot mix inclusion and exclusion. Only _id may differ.",
    );
  }

  const tree = buildTree(fields.map((entry) => entry.path));

  if (includes || (fields.length === 0 && idEntry?.include === true)) {
    const keepId = idEntry === undefined || idEntry.include;

    return (document) => includeDocument(document, tree, keepId);
  }

  const dropId = idEntry !== undefined && !idEntry.include;

  return (document) => excludeDocument(document, tree, dropId);
}

function parseFlag(path: string, value: unknown): boolean {
  if (value === 1 || value === true) {
    return true;
  }

  if (value === 0 || value === false) {
    return false;
  }

  throw invalidProjection(
    `Projection value for ${JSON.stringify(path)} must be 1, 0, true or false.`,
  );
}

function buildTree(paths: readonly string[]): Branch {
  const root: Branch = new Map();

  for (const path of paths) {
    const segments = path.split(".");

    for (const segment of segments) {
      if (
        segment.length === 0 ||
        segment.startsWith("$") ||
        segment === "__proto__"
      ) {
        throw invalidProjection(
          `Projection path ${JSON.stringify(path)} contains an empty or reserved segment.`,
        );
      }
    }

    if (segments[0] === "_id") {
      throw invalidProjection(
        `Projection path ${JSON.stringify(path)} cannot go inside _id.`,
      );
    }

    let node = root;

    segments.forEach((segment, index) => {
      const last = index === segments.length - 1;
      const existing = node.get(segment);

      if (last) {
        if (existing !== undefined) {
          throw overlap(path);
        }

        node.set(segment, LEAF);

        return;
      }

      if (existing === LEAF) {
        throw overlap(path);
      }

      if (existing === undefined) {
        const created: Branch = new Map();

        node.set(segment, created);
        node = created;
      } else {
        node = existing;
      }
    });
  }

  return root;
}

/**
 * `keepId` is only given for the top-level document. Inside a nested document
 * an `_id` field is an ordinary field and follows the tree.
 */
function includeDocument(
  document: Document,
  tree: Branch,
  keepId?: boolean,
): Document {
  const result: Document = {};

  for (const key of Object.keys(document)) {
    const value = document[key] as DocumentValue;

    if (key === "_id" && keepId !== undefined) {
      if (keepId) {
        setField(result, key, value);
      }

      continue;
    }

    const node = tree.get(key);

    if (node === undefined) {
      continue;
    }

    if (node === LEAF) {
      setField(result, key, value);

      continue;
    }

    const inner = includeInside(value, node);

    if (inner !== undefined) {
      setField(result, key, inner);
    }
  }

  return result;
}

function includeInside(
  value: DocumentValue,
  tree: Branch,
): DocumentValue | undefined {
  if (Array.isArray(value)) {
    const kept: DocumentValue[] = [];

    for (const element of value) {
      if (isPlainObject(element)) {
        kept.push(includeDocument(element, tree));
      }
    }

    return kept;
  }

  if (isPlainObject(value)) {
    return includeDocument(value, tree);
  }

  return undefined;
}

function excludeDocument(
  document: Document,
  tree: Branch,
  dropId?: boolean,
): Document {
  const result: Document = {};

  for (const key of Object.keys(document)) {
    const value = document[key] as DocumentValue;

    if (key === "_id" && dropId !== undefined) {
      if (!dropId) {
        setField(result, key, value);
      }

      continue;
    }

    const node = tree.get(key);

    if (node === LEAF) {
      continue;
    }

    setField(
      result,
      key,
      node === undefined ? value : excludeInside(value, node),
    );
  }

  return result;
}

function excludeInside(value: DocumentValue, tree: Branch): DocumentValue {
  if (Array.isArray(value)) {
    return value.map((element) =>
      isPlainObject(element) ? excludeDocument(element, tree) : element,
    );
  }

  if (isPlainObject(value)) {
    return excludeDocument(value, tree);
  }

  return value;
}

function setField(target: Document, key: string, value: DocumentValue): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

function isPlainObject(value: unknown): value is Document {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    value instanceof Date ||
    value instanceof Uint8Array
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function overlap(path: string): StorageError {
  return invalidProjection(
    `Projection path ${JSON.stringify(path)} overlaps another path.`,
  );
}

function invalidProjection(message: string): StorageError {
  return new StorageError(StorageErrorCode.InvalidFindOptions, message);
}
