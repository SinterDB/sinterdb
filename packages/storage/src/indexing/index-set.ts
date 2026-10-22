import type { Document } from "sinterdb-protocol";

import { StorageError, StorageErrorCode } from "../errors.js";
import { CompoundIndex } from "./compound-index.js";
import { FieldIndex, type IndexConflict } from "./field-index.js";
import type { SecondaryIndex } from "./secondary-index.js";
import {
  MAX_INDEXES_PER_COLLECTION,
  sameDefinition,
  sameFields,
  type IndexSpec,
} from "./spec.js";

export interface DocumentChange {
  readonly key: string;
  readonly before?: Document;
  readonly after?: Document;
}

export interface IndexIssue {
  readonly index: string;
  readonly problem: string;
  readonly detail: string;
}

export class IndexSet {
  private readonly indexes = new Map<string, SecondaryIndex>();

  public get isEmpty(): boolean {
    return this.indexes.size === 0;
  }

  public all(): SecondaryIndex[] {
    return [...this.indexes.values()];
  }

  public specs(): IndexSpec[] {
    return this.all().map((index) => index.spec);
  }

  public get(name: string): SecondaryIndex | undefined {
    return this.indexes.get(name);
  }

  public has(name: string): boolean {
    return this.indexes.has(name);
  }

  public clear(): void {
    this.indexes.clear();
  }

  /**
   * Builds an index over the existing documents. Returns `"exists"` when an
   * identical index is already present.
   */
  public create(
    spec: IndexSpec,
    documents: Iterable<[string, Document]>,
  ): "created" | "exists" {
    const existing = this.indexes.get(spec.name);

    if (existing !== undefined) {
      if (sameDefinition(existing.spec, spec)) {
        return "exists";
      }

      throw new StorageError(
        StorageErrorCode.IndexConflict,
        `An index named ${JSON.stringify(spec.name)} already exists with different options.`,
      );
    }

    for (const other of this.indexes.values()) {
      if (sameFields(other.spec, spec)) {
        throw new StorageError(
          StorageErrorCode.IndexConflict,
          `An index on ${describeFields(spec)} already exists as ${JSON.stringify(other.spec.name)}. Drop it before creating another.`,
        );
      }
    }

    if (this.indexes.size >= MAX_INDEXES_PER_COLLECTION) {
      throw new StorageError(
        StorageErrorCode.IndexConflict,
        `A collection can have at most ${MAX_INDEXES_PER_COLLECTION} indexes besides _id.`,
      );
    }

    const index = buildIndex(spec);

    for (const [key, document] of documents) {
      const conflict = index.conflictFor(key, document);

      if (conflict !== undefined) {
        throw new StorageError(
          StorageErrorCode.DuplicateKey,
          `Cannot create unique index ${JSON.stringify(spec.name)}: existing documents have a duplicate ${conflict.description}.`,
        );
      }

      index.add(key, document, true);
    }

    index.finishBulk();
    this.indexes.set(spec.name, index);

    return "created";
  }

  public drop(name: string): void {
    this.indexes.delete(name);
  }

  /**
   * Applies document changes to every index as one unit. All removals happen
   * before any addition so a batch can swap unique values between documents.
   * If a unique index would be violated nothing is changed and an error is
   * thrown. Otherwise the returned function undoes the changes.
   */
  public applyChanges(changes: readonly DocumentChange[]): () => void {
    if (this.indexes.size === 0) {
      return noop;
    }

    const undo: (() => void)[] = [];
    const rollback = (): void => {
      for (let position = undo.length - 1; position >= 0; position -= 1) {
        (undo[position] as () => void)();
      }

      undo.length = 0;
    };

    for (const change of changes) {
      const before = change.before;

      if (before === undefined) {
        continue;
      }

      for (const index of this.indexes.values()) {
        index.remove(change.key, before);
        undo.push(() => index.add(change.key, before));
      }
    }

    for (const change of changes) {
      const after = change.after;

      if (after === undefined) {
        continue;
      }

      for (const index of this.indexes.values()) {
        const conflict = index.conflictFor(change.key, after);

        if (conflict !== undefined) {
          rollback();

          throw duplicateKey(conflict);
        }

        index.add(change.key, after);
        undo.push(() => index.remove(change.key, after));
      }
    }

    return rollback;
  }

  /** Compares every index with one rebuilt from the documents. */
  public validate(documents: () => Iterable<[string, Document]>): IndexIssue[] {
    const issues: IndexIssue[] = [];

    for (const live of this.indexes.values()) {
      const fresh = buildIndex(live.spec);

      for (const [key, document] of documents()) {
        fresh.add(key, document, true);
      }

      fresh.finishBulk();

      const expected = fresh.contents();
      const actual = live.contents();
      const name = live.spec.name;

      for (const problem of actual.orderedProblems) {
        issues.push({ index: name, problem: "ordering", detail: problem });
      }

      if (live.documentCount !== fresh.documentCount) {
        issues.push({
          index: name,
          problem: "document-count",
          detail: `the index covers ${live.documentCount} documents but ${fresh.documentCount} should be covered`,
        });
      }

      if (live.hasArrayValues !== fresh.hasArrayValues) {
        issues.push({
          index: name,
          problem: "array-flag",
          detail: "the index disagrees about whether array values exist",
        });
      }

      const liveValues = new Map(actual.values);
      const freshValues = new Map(expected.values);

      for (const [key, docs] of freshValues) {
        const found = liveValues.get(key);

        if (found === undefined) {
          issues.push({
            index: name,
            problem: "missing-entry",
            detail: `a value held by ${docs.length} document(s) is not indexed`,
          });
        } else if (found.join(",") !== docs.join(",")) {
          issues.push({
            index: name,
            problem: "wrong-documents",
            detail: "an index entry lists the wrong documents",
          });
        }
      }

      for (const key of liveValues.keys()) {
        if (!freshValues.has(key)) {
          issues.push({
            index: name,
            problem: "unexpected-entry",
            detail: "the index has an entry for a value no document holds",
          });
        }
      }

      if (actual.missing.join(",") !== expected.missing.join(",")) {
        issues.push({
          index: name,
          problem: "missing-field-entries",
          detail: "the documents lacking the field are not tracked correctly",
        });
      }

      if (live.spec.unique) {
        for (const docs of freshValues.values()) {
          if (docs.length > 1) {
            issues.push({
              index: name,
              problem: "duplicate-key",
              detail: `${docs.length} documents share a value in a unique index`,
            });
          }
        }

        if (!live.spec.sparse && expected.missing.length > 1) {
          issues.push({
            index: name,
            problem: "duplicate-key",
            detail: `${expected.missing.length} documents lack the field in a unique index`,
          });
        }
      }
    }

    return issues.slice(0, 50);
  }
}

function buildIndex(spec: IndexSpec): SecondaryIndex {
  return spec.keys.length === 1
    ? new FieldIndex(spec)
    : new CompoundIndex(spec);
}

function describeFields(spec: IndexSpec): string {
  const fields = spec.keys.map((key) => JSON.stringify(key.field));

  return fields.length === 1
    ? `field ${fields[0]}`
    : `fields ${fields.join(", ")}`;
}

function duplicateKey(conflict: IndexConflict): StorageError {
  return new StorageError(
    StorageErrorCode.DuplicateKey,
    `Duplicate key for unique index ${JSON.stringify(conflict.index)} on ${conflict.field.includes(", ") ? "fields" : "field"} ${JSON.stringify(conflict.field)}: ${conflict.description}.`,
  );
}

function noop(): void {
  // Nothing was changed.
}
