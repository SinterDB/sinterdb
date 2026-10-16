import { CustomId, type Document, type DocumentValue } from "sinterdb-protocol";

import type { WithId } from "./collection.js";
import { SinterProtocolError } from "./errors.js";
import type { SortDirection } from "./filter.js";
import { parseExplainResult, type ExplainResult } from "./indexes.js";

/**
 * The function a {@link FindCursor} uses to reach the server. Cursors are
 * created by {@link SinterCollection.find}; do not construct them directly.
 */
export type CursorExecutor = (
  command: string,
  parameters: Document,
) => Promise<DocumentValue>;

/** The query parts of a find that are sent with the first request. */
export interface FindQueryOptions {
  /** Sort order as `[path, direction]` pairs. */
  readonly sort?: readonly (readonly [string, SortDirection])[];
  /** How many matching documents to skip. */
  readonly skip?: number;
  /** The maximum number of documents to return. */
  readonly limit?: number;
  /** Which fields to return. */
  readonly projection?: Document;
}

/**
 * The batching shared by every cursor: it sends the opening command on the
 * first read, continues with `getMore`, and releases the server-side cursor.
 */
class BatchReader<TResult extends object> {
  private buffer: TResult[] = [];
  private cursorId: number | null | undefined = undefined;
  private closed = false;

  public constructor(
    private readonly execute: CursorExecutor,
    private readonly open: (size: Document) => {
      command: string;
      parameters: Document;
    },
    private readonly batchSize: number | undefined,
    private readonly requireId: boolean,
  ) {}

  public async hasNext(): Promise<boolean> {
    while (this.buffer.length === 0) {
      if (this.closed || this.cursorId === null) {
        return false;
      }

      await this.fetchBatch();
    }

    return true;
  }

  public async next(): Promise<TResult | null> {
    if (!(await this.hasNext())) {
      return null;
    }

    return this.buffer.shift() ?? null;
  }

  public async toArray(): Promise<TResult[]> {
    const results: TResult[] = [];

    try {
      for (let doc = await this.next(); doc !== null; doc = await this.next()) {
        results.push(doc);
      }
    } finally {
      await this.close();
    }

    return results;
  }

  public async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.buffer = [];

    const id = this.cursorId;
    this.cursorId = null;

    if (typeof id === "number") {
      await this.execute("closeCursor", { cursorId: id });
    }
  }

  public async *iterate(): AsyncGenerator<TResult, void, undefined> {
    try {
      for (let doc = await this.next(); doc !== null; doc = await this.next()) {
        yield doc;
      }
    } finally {
      await this.close();
    }
  }

  private async fetchBatch(): Promise<void> {
    const size =
      this.batchSize === undefined ? {} : { batchSize: this.batchSize };

    let value: DocumentValue;

    if (this.cursorId === undefined) {
      const { command, parameters } = this.open(size);

      value = await this.execute(command, parameters);
    } else {
      value = await this.execute("getMore", {
        cursorId: this.cursorId,
        ...size,
      });
    }

    const batch = parseBatch<TResult>(value, this.requireId);

    this.cursorId = batch.cursorId;
    this.buffer.push(...batch.documents);
  }
}

/**
 * A lazy, batched cursor over the results of a find.
 *
 * Nothing is sent until the first read. Documents arrive in batches, and the
 * cursor releases its server-side state when it is exhausted or closed.
 * `toArray()` and `for await` close the cursor for you, even when the loop
 * exits early or throws.
 */
export class FindCursor<
  TDocument extends object = Document,
  TResult extends object = WithId<TDocument>,
> implements AsyncIterable<TResult> {
  private readonly reader: BatchReader<TResult>;

  public constructor(
    private readonly execute: CursorExecutor,
    private readonly collection: string,
    private readonly filter: Document,
    batchSize: number | undefined,
    query: FindQueryOptions = {},
  ) {
    this.reader = new BatchReader<TResult>(
      execute,
      (size) => ({
        command: "find",
        parameters: {
          collection,
          filter,
          ...size,
          ...(query.sort === undefined
            ? {}
            : {
                sort: query.sort.map(([path, direction]) => [path, direction]),
              }),
          ...(query.skip === undefined ? {} : { skip: query.skip }),
          ...(query.limit === undefined ? {} : { limit: query.limit }),
          ...(query.projection === undefined
            ? {}
            : { projection: query.projection }),
        },
      }),
      batchSize,
      query.projection === undefined,
    );
  }

  /**
   * Asks the server how it would run this query, without running it. The
   * sort, skip, limit, and batch size do not change the plan.
   *
   * @beta
   */
  public async explain(): Promise<ExplainResult> {
    const value = await this.execute("explain", {
      collection: this.collection,
      filter: this.filter,
    });

    return parseExplainResult(value);
  }

  /**
   * Whether another document is available. This may fetch the next batch.
   */
  public hasNext(): Promise<boolean> {
    return this.reader.hasNext();
  }

  /**
   * Returns the next document, or `null` when the results are exhausted or
   * the cursor is closed.
   */
  public next(): Promise<TResult | null> {
    return this.reader.next();
  }

  /**
   * Reads all remaining documents into an array and closes the cursor. Large
   * result sets are held in memory; iterate instead when they may be large.
   */
  public toArray(): Promise<TResult[]> {
    return this.reader.toArray();
  }

  /**
   * Closes the cursor and releases it on the server. Closing twice does
   * nothing.
   */
  public close(): Promise<void> {
    return this.reader.close();
  }

  /**
   * Iterates the remaining documents, closing the cursor when the loop ends.
   */
  public [Symbol.asyncIterator](): AsyncGenerator<TResult, void, undefined> {
    return this.reader.iterate();
  }
}

/**
 * A lazy, batched cursor over the results of an aggregation. It reads like a
 * {@link FindCursor}: nothing is sent until the first read, documents arrive in
 * batches, and `toArray()` and `for await` close the cursor for you.
 */
export class AggregateCursor<
  TResult extends object = Document,
> implements AsyncIterable<TResult> {
  private readonly reader: BatchReader<TResult>;

  public constructor(
    execute: CursorExecutor,
    collection: string,
    pipeline: readonly Document[],
    batchSize: number | undefined,
  ) {
    this.reader = new BatchReader<TResult>(
      execute,
      (size) => ({
        command: "aggregate",
        parameters: { collection, pipeline: [...pipeline], ...size },
      }),
      batchSize,
      false,
    );
  }

  /** Whether another document is available. This may fetch the next batch. */
  public hasNext(): Promise<boolean> {
    return this.reader.hasNext();
  }

  /**
   * Returns the next document, or `null` when the results are exhausted or
   * the cursor is closed.
   */
  public next(): Promise<TResult | null> {
    return this.reader.next();
  }

  /**
   * Reads all remaining documents into an array and closes the cursor. Large
   * result sets are held in memory; iterate instead when they may be large.
   */
  public toArray(): Promise<TResult[]> {
    return this.reader.toArray();
  }

  /**
   * Closes the cursor and releases it on the server. Closing twice does
   * nothing.
   */
  public close(): Promise<void> {
    return this.reader.close();
  }

  /**
   * Iterates the remaining documents, closing the cursor when the loop ends.
   */
  public [Symbol.asyncIterator](): AsyncGenerator<TResult, void, undefined> {
    return this.reader.iterate();
  }
}

function parseBatch<TResult extends object>(
  value: DocumentValue,
  requireId: boolean,
): {
  cursorId: number | null;
  documents: TResult[];
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalidBatch();
  }

  const record = value as Document;
  const cursorId = record["cursorId"];
  const documents = record["documents"];

  const validCursorId =
    cursorId === null ||
    (typeof cursorId === "number" &&
      Number.isSafeInteger(cursorId) &&
      cursorId > 0);

  if (
    !validCursorId ||
    !Array.isArray(documents) ||
    !documents.every(
      (doc) =>
        typeof doc === "object" &&
        doc !== null &&
        !Array.isArray(doc) &&
        (!requireId || (doc as Document)["_id"] instanceof CustomId),
    )
  ) {
    throw invalidBatch();
  }

  return {
    cursorId: cursorId as number | null,
    documents: documents as unknown as TResult[],
  };
}

function invalidBatch(): SinterProtocolError {
  return new SinterProtocolError(
    "The server returned an invalid cursor batch.",
  );
}
