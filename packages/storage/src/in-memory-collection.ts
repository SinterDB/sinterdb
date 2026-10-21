import { compilePipeline } from "./aggregation.js";
import type { OperationBudget } from "./budget.js";
import {
  CustomId,
  decodeDocument,
  encodeDocument,
  encodeDocumentValue,
  type Document,
  type DocumentValue,
} from "sinterdb-protocol";

import {
  StorageError,
  StorageErrorCode,
  StorageInsertManyError,
} from "./errors.js";
import { compileFilter, resolveFieldValues } from "./filter.js";
import {
  ID_INDEX_NAME,
  IndexSet,
  candidateKeys,
  idIndexSpec,
  normalizeIndexSpec,
  planQuery,
  type CreateIndexInput,
  type DocumentChange,
  type IndexIssue,
  type IndexSpec,
  type QueryPlan,
} from "./indexing/index.js";
import { compileProjection } from "./projection.js";
import {
  compareDocumentValues,
  compileSort,
  type SortSpecification,
} from "./sort.js";
import {
  compileUpdate,
  seedDocumentFromFilter,
  type CompiledUpdate,
} from "./update.js";

export interface StorageInsertOneResult {
  readonly insertedId: CustomId;
}

export interface StorageInsertManyResult {
  readonly insertedIds: readonly CustomId[];
}

export interface StorageFindOptions {
  readonly sort?: SortSpecification;
  readonly skip?: number;
  readonly limit?: number;
  /**
   * Which fields the returned documents keep. Applied after sort, skip and
   * limit, so queries can sort by fields that are not returned.
   */
  readonly projection?: Document;
  /**
   * Limits the time and the documents examined. The budget is charged as the
   * iterator is read, not when `find` is called.
   */
  readonly budget?: OperationBudget;
}

export interface StorageFindOneOptions {
  readonly projection?: Document;
  /** Limits the time and the documents examined. */
  readonly budget?: OperationBudget;
}

export interface StorageAggregateOptions {
  /**
   * Limits the time and the documents examined while reading the collection.
   * Later stages are not charged.
   */
  readonly budget?: OperationBudget;
}

export interface StorageUpdateOptions {
  readonly upsert?: boolean;
}

export interface StorageUpdateResult {
  readonly matchedCount: number;
  readonly modifiedCount: number;
  readonly upsertedId?: CustomId;
}

export interface StorageDeleteResult {
  readonly deletedCount: number;
}

export type JournalOperation =
  | {
      readonly kind: "put";
      readonly key: string;
      readonly document: Uint8Array;
    }
  | { readonly kind: "delete"; readonly key: string }
  | { readonly kind: "createIndex"; readonly spec: IndexSpec }
  | { readonly kind: "dropIndex"; readonly name: string };

export interface CollectionJournal {
  /**
   * Durably records the operations as one atomic unit. It must throw if they
   * cannot be recorded, in which case the collection is left unchanged.
   */
  commit(operations: readonly JournalOperation[]): void;
}

export interface InMemoryCollectionOptions {
  readonly journal?: CollectionJournal;
  /**
   * Previously recovered documents keyed by hexadecimal `_id`. The collection
   * takes ownership of the map.
   */
  readonly documents?: Map<string, Uint8Array>;
  /** Indexes to build over the recovered documents. */
  readonly indexes?: readonly IndexSpec[];
}

export interface IndexInfo extends IndexSpec {}

export interface ExplainResult {
  readonly stage: "COLLSCAN" | "IDLOOKUP" | "IXSCAN";
  readonly index?: string;
  /** The first field the index covers. */
  readonly field?: string;
  /** Every field of a compound index, in order. */
  readonly fields?: readonly string[];
  /** How many leading fields of a compound index the query fixes. */
  readonly prefixLength?: number;
  readonly access?: "equality" | "in" | "range";
  readonly lower?: {
    readonly value: DocumentValue;
    readonly inclusive: boolean;
  };
  readonly upper?: {
    readonly value: DocumentValue;
    readonly inclusive: boolean;
  };
  readonly estimatedCandidates: number;
  readonly documents: number;
}

export interface IndexValidationReport {
  readonly valid: boolean;
  readonly indexes: number;
  readonly documents: number;
  readonly issues: readonly IndexIssue[];
}

interface PreparedInsert {
  readonly id: CustomId;
  readonly key: string;
  readonly encoded: Uint8Array;
}

interface LocatedDocument {
  readonly key: string;
  readonly encoded: Uint8Array;
  readonly document: Document;
}

export class InMemoryCollection {
  private readonly documents: Map<string, Uint8Array>;
  private readonly journal: CollectionJournal | undefined;
  private readonly indexes = new IndexSet();
  private sequence: Map<string, number> | undefined;
  private nextSequence = 1;

  public constructor(options: InMemoryCollectionOptions = {}) {
    this.documents = options.documents ?? new Map<string, Uint8Array>();
    this.journal = options.journal;

    for (const spec of options.indexes ?? []) {
      this.buildIndex(spec);
    }
  }

  /**
   * Every stored document as its hexadecimal `_id` and encoded bytes. The
   * bytes are never modified in place, so they are safe to keep.
   */
  public entries(): IterableIterator<[string, Uint8Array]> {
    return this.documents.entries();
  }

  public get documentCount(): number {
    return this.documents.size;
  }

  public insertOne(document: Document): StorageInsertOneResult {
    const prepared = this.prepareInsert(document, undefined);
    const rollback = this.trackInsert(prepared);

    try {
      this.commit([
        { kind: "put", key: prepared.key, document: prepared.encoded },
      ]);
    } catch (error: unknown) {
      rollback();

      throw error;
    }

    this.put(prepared.key, prepared.encoded);

    return {
      insertedId: prepared.id,
    };
  }

  public insertMany(documents: readonly Document[]): StorageInsertManyResult {
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new StorageError(
        StorageErrorCode.InvalidBatch,
        "insertMany requires at least one document.",
      );
    }

    const accepted: PreparedInsert[] = [];
    const rollbacks: (() => void)[] = [];
    const pending = new Set<string>();
    let failure: { index: number; error: StorageError } | undefined;

    for (let index = 0; index < documents.length; index += 1) {
      try {
        const prepared = this.prepareInsert(
          documents[index] as Document,
          pending,
        );

        rollbacks.push(this.trackInsert(prepared));
        accepted.push(prepared);
        pending.add(prepared.key);
      } catch (error: unknown) {
        if (error instanceof StorageError) {
          failure = { index, error };
          break;
        }

        throw error;
      }
    }

    if (accepted.length > 0) {
      try {
        this.commit(
          accepted.map((entry) => ({
            kind: "put" as const,
            key: entry.key,
            document: entry.encoded,
          })),
        );
      } catch (error: unknown) {
        for (const rollback of rollbacks.reverse()) {
          rollback();
        }

        throw error;
      }

      for (const entry of accepted) {
        this.put(entry.key, entry.encoded);
      }
    }

    const insertedIds = accepted.map((entry) => entry.id);

    if (failure !== undefined) {
      throw new StorageInsertManyError(
        failure.index,
        insertedIds,
        failure.error,
      );
    }

    return {
      insertedIds: Object.freeze(insertedIds),
    };
  }

  public findOne(
    filter: Document,
    options: StorageFindOneOptions = {},
  ): Document | undefined {
    const project =
      options.projection === undefined
        ? undefined
        : compileProjection(options.projection);
    const found = this.findFirst(filter, options.budget);

    return found === undefined || project === undefined
      ? found
      : project(found);
  }

  private findFirst(
    filter: Document,
    budget?: OperationBudget,
  ): Document | undefined {
    const matches = compileFilter(filter);
    const id = filter["_id"];

    if (id instanceof CustomId) {
      const document = this.findById(id);

      if (document === undefined) {
        return undefined;
      }

      return matches(document) ? document : undefined;
    }

    for (const [, encoded] of this.candidates(filter, budget)) {
      const document = decodeDocument(encoded);

      if (matches(document)) {
        return document;
      }
    }

    return undefined;
  }

  public find(
    filter: Document,
    options: StorageFindOptions = {},
  ): IterableIterator<Document> {
    const matches = compileFilter(filter);
    const sorter =
      options.sort === undefined ? undefined : compileSort(options.sort);
    const skip = validateSkip(options.skip);
    const limit = validateLimit(options.limit);

    const project =
      options.projection === undefined
        ? undefined
        : compileProjection(options.projection);
    const results = this.scan(
      filter,
      matches,
      sorter,
      skip,
      limit,
      options.budget,
    );

    return project === undefined ? results : projectAll(results, project);
  }

  /**
   * Runs an aggregation pipeline (see {@link compilePipeline}) over the
   * collection. The pipeline is checked before the first document is read. A
   * leading `$match` can use an index.
   */
  public aggregate(
    pipeline: readonly Document[],
    options: StorageAggregateOptions = {},
  ): IterableIterator<Document> {
    const compiled = compilePipeline(pipeline);

    return compiled.run(
      this.find(compiled.filter ?? {}, {
        ...(options.budget === undefined ? {} : { budget: options.budget }),
      }),
    );
  }

  /**
   * How many documents match the filter. An empty filter is answered from the
   * size of the collection without reading any document.
   */
  public count(filter: Document, budget?: OperationBudget): number {
    const matches = compileFilter(filter);

    if (Object.keys(filter).length === 0) {
      return this.documents.size;
    }

    let total = 0;

    for (const [, encoded] of this.candidates(filter, budget)) {
      if (matches(decodeDocument(encoded))) {
        total += 1;
      }
    }

    return total;
  }

  /**
   * The distinct values of a field among the documents that match the filter,
   * in sort order (see docs/query-semantics.md). An array contributes its
   * elements instead of itself, and a document without the field contributes
   * nothing. Values are distinct by canonical equality, so `1` and `1n` are two
   * values.
   */
  public distinct(
    field: string,
    filter: Document = {},
    budget?: OperationBudget,
  ): DocumentValue[] {
    const segments = validateDistinctField(field);
    const matches = compileFilter(filter);
    const seen = new Set<string>();
    const values: DocumentValue[] = [];

    for (const [, encoded] of this.candidates(filter, budget)) {
      const document = decodeDocument(encoded);

      if (!matches(document)) {
        continue;
      }

      for (const found of resolveFieldValues(document, segments)) {
        for (const value of Array.isArray(found) ? found : [found]) {
          const key = Buffer.from(encodeDocumentValue(value)).toString(
            "base64",
          );

          if (!seen.has(key)) {
            seen.add(key);
            values.push(value);
          }
        }
      }
    }

    return values.sort(compareDocumentValues);
  }

  public deleteOne(filter: Document): StorageDeleteResult {
    const located = this.locate(filter, compileFilter(filter));

    if (located === undefined) {
      return { deletedCount: 0 };
    }

    const rollback = this.trackChanges([
      { key: located.key, before: located.document },
    ]);

    try {
      this.commit([{ kind: "delete", key: located.key }]);
    } catch (error: unknown) {
      rollback();

      throw error;
    }

    this.remove(located.key);

    return { deletedCount: 1 };
  }

  public deleteMany(filter: Document): StorageDeleteResult {
    const matches = compileFilter(filter);
    const keys: string[] = [];
    const changes: DocumentChange[] = [];
    const indexed = !this.indexes.isEmpty;

    for (const [key, encoded] of this.candidates(filter)) {
      const document = decodeDocument(encoded);

      if (matches(document)) {
        keys.push(key);

        if (indexed) {
          changes.push({ key, before: document });
        }
      }
    }

    const rollback = this.trackChanges(changes);

    try {
      if (keys.length > 0) {
        this.commit(keys.map((key) => ({ kind: "delete" as const, key })));
      }
    } catch (error: unknown) {
      rollback();

      throw error;
    }

    for (const key of keys) {
      this.remove(key);
    }

    return { deletedCount: keys.length };
  }

  public replaceOne(
    filter: Document,
    replacement: Document,
    options: StorageUpdateOptions = {},
  ): StorageUpdateResult {
    const matches = compileFilter(filter);
    const upsert = validateUpsert(options.upsert);

    validateReplacement(replacement);

    const located = this.locate(filter, matches);

    if (located === undefined) {
      if (!upsert) {
        return { matchedCount: 0, modifiedCount: 0 };
      }

      const filterId = filter["_id"];
      const requested = replacement["_id"];

      if (
        Object.hasOwn(replacement, "_id") &&
        filterId instanceof CustomId &&
        !(requested instanceof CustomId && requested.equals(filterId))
      ) {
        throw immutableId();
      }

      const document: Document = Object.hasOwn(replacement, "_id")
        ? replacement
        : filterId instanceof CustomId
          ? { ...replacement, _id: filterId }
          : replacement;

      return {
        matchedCount: 0,
        modifiedCount: 0,
        upsertedId: this.insertOne(document).insertedId,
      };
    }

    const existingId = located.document["_id"] as CustomId;

    if (
      Object.hasOwn(replacement, "_id") &&
      !(
        replacement["_id"] instanceof CustomId &&
        replacement["_id"].equals(existingId)
      )
    ) {
      throw immutableId();
    }

    const encoded = encodeStoredDocument({ ...replacement, _id: existingId });
    const modified = !bytesEqual(encoded, located.encoded);

    if (modified) {
      const rollback = this.trackChanges([
        {
          key: located.key,
          before: located.document,
          after: decodeDocument(encoded),
        },
      ]);

      try {
        this.commit([{ kind: "put", key: located.key, document: encoded }]);
      } catch (error: unknown) {
        rollback();

        throw error;
      }

      this.put(located.key, encoded);
    }

    return { matchedCount: 1, modifiedCount: modified ? 1 : 0 };
  }

  public updateOne(
    filter: Document,
    update: Document,
    options: StorageUpdateOptions = {},
  ): StorageUpdateResult {
    const matches = compileFilter(filter);
    const apply = compileUpdate(update);
    const upsert = validateUpsert(options.upsert);
    const located = this.locate(filter, matches);

    if (located === undefined) {
      return this.upsertFromUpdate(filter, apply, upsert);
    }

    const before = this.indexes.isEmpty
      ? undefined
      : decodeDocument(located.encoded);
    const pending = prepareUpdate(located, apply);

    if (pending !== undefined) {
      const rollback = this.trackChanges([
        {
          key: pending.key,
          ...(before === undefined ? {} : { before }),
          after: decodeDocument(pending.encoded),
        },
      ]);

      try {
        this.commit([
          { kind: "put", key: pending.key, document: pending.encoded },
        ]);
      } catch (error: unknown) {
        rollback();

        throw error;
      }

      this.put(pending.key, pending.encoded);
    }

    return {
      matchedCount: 1,
      modifiedCount: pending === undefined ? 0 : 1,
    };
  }

  public updateMany(
    filter: Document,
    update: Document,
    options: StorageUpdateOptions = {},
  ): StorageUpdateResult {
    const matches = compileFilter(filter);
    const apply = compileUpdate(update);
    const upsert = validateUpsert(options.upsert);
    const pending: { key: string; encoded: Uint8Array }[] = [];
    const changes: DocumentChange[] = [];
    const indexed = !this.indexes.isEmpty;
    let matched = 0;

    for (const [key, encoded] of this.candidates(filter)) {
      const document = decodeDocument(encoded);

      if (!matches(document)) {
        continue;
      }

      matched += 1;

      const before = indexed ? decodeDocument(encoded) : undefined;
      const prepared = prepareUpdate({ key, encoded, document }, apply);

      if (prepared !== undefined) {
        pending.push(prepared);

        if (before !== undefined) {
          changes.push({
            key,
            before,
            after: decodeDocument(prepared.encoded),
          });
        }
      }
    }

    if (matched === 0) {
      return this.upsertFromUpdate(filter, apply, upsert);
    }

    const rollback = this.trackChanges(changes);

    try {
      if (pending.length > 0) {
        this.commit(
          pending.map((entry) => ({
            kind: "put" as const,
            key: entry.key,
            document: entry.encoded,
          })),
        );
      }
    } catch (error: unknown) {
      rollback();

      throw error;
    }

    for (const entry of pending) {
      this.put(entry.key, entry.encoded);
    }

    return { matchedCount: matched, modifiedCount: pending.length };
  }

  /**
   * Builds an index over the existing documents. Returns whether it was newly
   * created: asking for an identical index again succeeds without changes.
   */
  public createIndex(input: CreateIndexInput): {
    name: string;
    created: boolean;
  } {
    const spec = normalizeIndexSpec(input);
    const created = this.buildIndex(spec);

    if (created) {
      try {
        this.commit([{ kind: "createIndex", spec }]);
      } catch (error: unknown) {
        this.removeIndex(spec.name);
        throw error;
      }
    }

    return { name: spec.name, created };
  }

  public dropIndex(name: string): void {
    if (name === ID_INDEX_NAME) {
      throw new StorageError(
        StorageErrorCode.InvalidIndex,
        "The _id index cannot be dropped.",
      );
    }

    if (!this.indexes.has(name)) {
      throw new StorageError(
        StorageErrorCode.IndexNotFound,
        `There is no index named ${JSON.stringify(name)}.`,
      );
    }

    this.commit([{ kind: "dropIndex", name }]);
    this.removeIndex(name);
  }

  /** The definition of the indexes besides `_id`, in creation order. */
  public indexSpec(): IndexSpec[] {
    return this.indexes.specs();
  }

  /** The `_id` index followed by the other indexes in creation order. */
  public listIndexes(): IndexInfo[] {
    return [idIndexSpec(), ...this.indexes.specs()];
  }

  /** Describes how a query would be run without running it. */
  public explain(filter: Document): ExplainResult {
    compileFilter(filter);

    return describePlan(this.plan(filter), this.documents.size);
  }

  /** Rebuilds every index from the documents and reports any difference. */
  public validateIndexes(): IndexValidationReport {
    const issues = this.indexes.validate(() => this.decodedEntries());

    return {
      valid: issues.length === 0,
      indexes: this.indexes.all().length,
      documents: this.documents.size,
      issues,
    };
  }

  public findById(id: CustomId): Document | undefined {
    if (!(id instanceof CustomId)) {
      throw new TypeError("Document ID must be a CustomId.");
    }

    const encoded = this.documents.get(id.toHexString());

    if (encoded === undefined) {
      return undefined;
    }

    return decodeDocument(encoded);
  }

  public has(id: CustomId): boolean {
    if (!(id instanceof CustomId)) {
      throw new TypeError("Document ID must be a CustomId.");
    }

    return this.documents.has(id.toHexString());
  }

  public clear(): void {
    if (this.journal !== undefined) {
      throw new Error("A durable collection cannot be cleared.");
    }

    this.documents.clear();
    this.indexes.clear();
    this.sequence = undefined;
  }

  private upsertFromUpdate(
    filter: Document,
    apply: CompiledUpdate,
    upsert: boolean,
  ): StorageUpdateResult {
    if (!upsert) {
      return { matchedCount: 0, modifiedCount: 0 };
    }

    const seed = seedDocumentFromFilter(filter);

    apply(seed);

    return {
      matchedCount: 0,
      modifiedCount: 0,
      upsertedId: this.insertOne(seed).insertedId,
    };
  }

  private locate(
    filter: Document,
    matches: (document: Document) => boolean,
  ): LocatedDocument | undefined {
    const id = filter["_id"];

    if (id instanceof CustomId) {
      const key = id.toHexString();
      const encoded = this.documents.get(key);

      if (encoded === undefined) {
        return undefined;
      }

      const document = decodeDocument(encoded);

      return matches(document) ? { key, encoded, document } : undefined;
    }

    for (const [key, encoded] of this.candidates(filter)) {
      const document = decodeDocument(encoded);

      if (matches(document)) {
        return { key, encoded, document };
      }
    }

    return undefined;
  }

  private plan(filter: Document): QueryPlan {
    return planQuery(filter, this.indexes.all(), this.documents.size);
  }

  /**
   * The documents a filter could match, in insertion order. An index narrows
   * them, and the caller still applies the full filter to each one.
   */
  private *candidates(
    filter: Document,
    budget?: OperationBudget,
  ): IterableIterator<[string, Uint8Array]> {
    const plan = this.indexes.isEmpty ? undefined : this.plan(filter);

    if (plan === undefined || plan.stage === "COLLSCAN") {
      for (const entry of this.documents) {
        budget?.charge();
        yield entry;
      }

      return;
    }

    const sequence = this.sequence as Map<string, number>;
    const keys = [...candidateKeys(plan)]
      .filter((key) => this.documents.has(key))
      .sort(
        (left, right) =>
          (sequence.get(left) as number) - (sequence.get(right) as number),
      );

    for (const key of keys) {
      const encoded = this.documents.get(key);

      if (encoded !== undefined) {
        budget?.charge();
        yield [key, encoded];
      }
    }
  }

  private *decodedEntries(): IterableIterator<[string, Document]> {
    for (const [key, encoded] of this.documents) {
      yield [key, decodeDocument(encoded)];
    }
  }

  private buildIndex(spec: IndexSpec): boolean {
    const result = this.indexes.create(spec, this.decodedEntries());

    if (result === "created" && this.sequence === undefined) {
      this.sequence = new Map();

      for (const key of this.documents.keys()) {
        this.sequence.set(key, this.nextSequence);
        this.nextSequence += 1;
      }
    }

    return result === "created";
  }

  private removeIndex(name: string): void {
    this.indexes.drop(name);

    if (this.indexes.isEmpty) {
      this.sequence = undefined;
    }
  }

  private put(key: string, encoded: Uint8Array): void {
    if (this.sequence !== undefined && !this.documents.has(key)) {
      this.sequence.set(key, this.nextSequence);
      this.nextSequence += 1;
    }

    this.documents.set(key, encoded);
  }

  private remove(key: string): void {
    this.documents.delete(key);
    this.sequence?.delete(key);
  }

  private trackInsert(prepared: PreparedInsert): () => void {
    if (this.indexes.isEmpty) {
      return noop;
    }

    return this.indexes.applyChanges([
      { key: prepared.key, after: decodeDocument(prepared.encoded) },
    ]);
  }

  private trackChanges(changes: readonly DocumentChange[]): () => void {
    return this.indexes.applyChanges(changes);
  }

  private prepareInsert(
    document: Document,
    pending: ReadonlySet<string> | undefined,
  ): PreparedInsert {
    if (!isPlainDocument(document)) {
      throw new StorageError(
        StorageErrorCode.InvalidDocument,
        "Inserted value must be a document.",
      );
    }

    const id = resolveDocumentId(document);
    const key = id.toHexString();

    if (this.documents.has(key) || pending?.has(key) === true) {
      throw new StorageError(
        StorageErrorCode.DuplicateId,
        `A document with _id ${JSON.stringify(key)} already exists.`,
      );
    }

    let encoded: Uint8Array;

    try {
      encoded = encodeDocument({
        ...document,
        _id: id,
      });
    } catch (error: unknown) {
      throw new StorageError(
        StorageErrorCode.InvalidDocument,
        "Document could not be encoded.",
        {
          cause: error,
        },
      );
    }

    return { id, key, encoded };
  }

  private commit(operations: readonly JournalOperation[]): void {
    this.journal?.commit(operations);
  }

  private *scan(
    filter: Document,
    matches: (document: Document) => boolean,
    sorter: ((document: readonly Document[]) => Document[]) | undefined,
    skip: number,
    limit: number | undefined,
    budget: OperationBudget | undefined,
  ): IterableIterator<Document> {
    if (sorter === undefined) {
      let skipped = 0;
      let yielded = 0;

      for (const [, encoded] of this.candidates(filter, budget)) {
        if (limit !== undefined && yielded >= limit) {
          return;
        }

        const document = decodeDocument(encoded);

        if (!matches(document)) {
          continue;
        }

        if (skipped < skip) {
          skipped += 1;
          continue;
        }

        yielded += 1;
        yield document;

        if (limit !== undefined && yielded >= limit) {
          return;
        }
      }

      return;
    }

    const matched: Document[] = [];

    for (const [, encoded] of this.candidates(filter, budget)) {
      const document = decodeDocument(encoded);

      if (matches(document)) {
        matched.push(document);
      }
    }

    const ordered = sorter(matched);

    yield* ordered.slice(skip, limit === undefined ? undefined : skip + limit);
  }
}

export function validateDistinctField(field: string): string[] {
  if (typeof field !== "string" || field.length === 0) {
    throw new StorageError(
      StorageErrorCode.InvalidFindOptions,
      "The distinct field must be a non-empty string.",
    );
  }

  const segments = field.split(".");

  for (const segment of segments) {
    if (
      segment.length === 0 ||
      segment.startsWith("$") ||
      segment === "__proto__"
    ) {
      throw new StorageError(
        StorageErrorCode.InvalidFindOptions,
        `The distinct field ${JSON.stringify(field)} contains an empty or reserved segment.`,
      );
    }
  }

  return segments;
}

function* projectAll(
  documents: Iterable<Document>,
  project: (document: Document) => Document,
): IterableIterator<Document> {
  for (const document of documents) {
    yield project(document);
  }
}

function prepareUpdate(
  located: LocatedDocument,
  apply: CompiledUpdate,
): { key: string; encoded: Uint8Array } | undefined {
  apply(located.document);

  const encoded = encodeStoredDocument(located.document);

  return bytesEqual(encoded, located.encoded)
    ? undefined
    : { key: located.key, encoded };
}

function encodeStoredDocument(document: Document): Uint8Array {
  try {
    return encodeDocument(document);
  } catch (error: unknown) {
    throw new StorageError(
      StorageErrorCode.InvalidDocument,
      "Document could not be encoded.",
      { cause: error },
    );
  }
}

function validateReplacement(replacement: Document): void {
  if (!isPlainDocument(replacement)) {
    throw new StorageError(
      StorageErrorCode.InvalidDocument,
      "Replacement must be a document.",
    );
  }

  if (Object.keys(replacement).some((key) => key.startsWith("$"))) {
    throw new StorageError(
      StorageErrorCode.InvalidDocument,
      "Replacement documents cannot contain update operators.",
    );
  }
}

function validateUpsert(upsert: boolean | undefined): boolean {
  if (upsert === undefined) {
    return false;
  }

  if (typeof upsert !== "boolean") {
    throw new StorageError(
      StorageErrorCode.InvalidUpdate,
      "The upsert option must be a boolean.",
    );
  }

  return upsert;
}

function immutableId(): StorageError {
  return new StorageError(
    StorageErrorCode.ImmutableId,
    "The _id field cannot be modified.",
  );
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) {
    return false;
  }

  return left.every((byte, index) => byte === right[index]);
}

function noop(): void {
  // Nothing was changed.
}

function describePlan(plan: QueryPlan, documents: number): ExplainResult {
  if (plan.stage === "COLLSCAN") {
    return {
      stage: "COLLSCAN",
      estimatedCandidates: plan.estimated,
      documents,
    };
  }

  if (plan.stage === "IDLOOKUP") {
    return {
      stage: "IDLOOKUP",
      index: ID_INDEX_NAME,
      field: "_id",
      access: "equality",
      estimatedCandidates: plan.estimated,
      documents,
    };
  }

  const base = {
    stage: "IXSCAN" as const,
    index: plan.index.spec.name,
    field: (plan.index.spec.keys[0] as { field: string }).field,
    estimatedCandidates: plan.estimated,
    documents,
  };

  if (plan.access.kind === "prefix") {
    return {
      ...base,
      fields: plan.index.spec.keys.map((key) => key.field),
      prefixLength: plan.access.fixed,
      access:
        plan.access.range !== undefined
          ? "range"
          : plan.viaMembership
            ? "in"
            : "equality",
      ...(plan.access.range?.lower === undefined
        ? {}
        : { lower: plan.access.range.lower }),
      ...(plan.access.range?.upper === undefined
        ? {}
        : { upper: plan.access.range.upper }),
    };
  }

  if (plan.access.kind === "range") {
    return {
      ...base,
      access: "range",
      ...(plan.access.lower === undefined ? {} : { lower: plan.access.lower }),
      ...(plan.access.upper === undefined ? {} : { upper: plan.access.upper }),
    };
  }

  return { ...base, access: plan.viaMembership ? "in" : "equality" };
}

function validateSkip(skip: number | undefined): number {
  if (skip === undefined) {
    return 0;
  }

  if (!Number.isSafeInteger(skip) || skip < 0) {
    throw new StorageError(
      StorageErrorCode.InvalidFindOptions,
      "Skip must be a non-negative safe integer.",
    );
  }

  return skip;
}

function validateLimit(limit: number | undefined): number | undefined {
  if (limit === undefined) {
    return undefined;
  }

  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new StorageError(
      StorageErrorCode.InvalidFindOptions,
      "Limit must be a positive safe integer.",
    );
  }

  return limit;
}

function resolveDocumentId(document: Document): CustomId {
  if (!Object.hasOwn(document, "_id")) {
    return CustomId.generate();
  }

  const id = document["_id"];

  if (!(id instanceof CustomId)) {
    throw new StorageError(
      StorageErrorCode.InvalidDocumentId,
      "Document _id must be a CustomId when provided.",
    );
  }

  return id;
}

function isPlainDocument(value: unknown): value is Document {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}
