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
  private buffer: TResult[] = [];
  private cursorId: number | null | undefined = undefined;
  private closed = false;

  public constructor(
    private readonly execute: CursorExecutor,
    private readonly collection: string,
    private readonly filter: Document,
    private readonly batchSize: number | undefined,
    private readonly query: FindQueryOptions = {},
  ) {}

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
  public async hasNext(): Promise<boolean> {
    while (this.buffer.length === 0) {
      if (this.closed || this.cursorId === null) {
        return false;
      }

      await this.fetchBatch();
    }

    return true;
  }

  /**
   * Returns the next document, or `null` when the results are exhausted or
   * the cursor is closed.
   */
  public async next(): Promise<TResult | null> {
    if (!(await this.hasNext())) {
      return null;
    }

    return this.buffer.shift() ?? null;
  }

  /**
   * Reads all remaining documents into an array and closes the cursor. Large
   * result sets are held in memory; iterate instead when they may be large.
   */
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

  /**
   * Closes the cursor and releases it on the server. Closing twice does
   * nothing.
   */
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

  /**
   * Iterates the remaining documents, closing the cursor when the loop ends.
   */
  public async *[Symbol.asyncIterator](): AsyncGenerator<
    TResult,
    void,
    undefined
  > {
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

    const value =
      this.cursorId === undefined
        ? await this.execute("find", {
            collection: this.collection,
            filter: this.filter,
            ...size,
            ...(this.query.sort === undefined
              ? {}
              : {
                  sort: this.query.sort.map(([path, direction]) => [
                    path,
                    direction,
                  ]),
                }),
            ...(this.query.skip === undefined ? {} : { skip: this.query.skip }),
            ...(this.query.limit === undefined
              ? {}
              : { limit: this.query.limit }),
            ...(this.query.projection === undefined
              ? {}
              : { projection: this.query.projection }),
          })
        : await this.execute("getMore", {
            cursorId: this.cursorId as number,
            ...size,
          });

    const batch = parseBatch<TResult>(
      value,
      this.query.projection === undefined,
    );

    this.cursorId = batch.cursorId;
    this.buffer.push(...batch.documents);
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
