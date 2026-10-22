import type { BudgetLimits, OperationBudget } from "@sinterdb-internal/storage";
import type { Document } from "sinterdb-protocol";

import { estimateEncodedSize } from "./document-size.js";

export const DEFAULT_CURSOR_BATCH_SIZE = 100;
export const DEFAULT_CURSOR_IDLE_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * A batch stops growing once its documents add up to this many bytes, even
 * when `batchSize` allows more. A message cannot exceed 16 MiB, so the limit
 * leaves room for the rest of the response. A batch always holds at least one
 * document.
 */
export const DEFAULT_CURSOR_BATCH_BYTES = 8 * 1024 * 1024;

export interface CursorBatch {
  readonly cursorId: number | null;
  readonly documents: readonly Document[];
}

export interface CursorManagerOptions {
  readonly idleTimeoutMS?: number;
  readonly maxBatchBytes?: number;
  readonly now?: () => number;
}

interface CursorState {
  readonly iterator: Iterator<Document>;
  buffered: Document | undefined;
  exhausted: boolean;
  lastUsed: number;
  /** The budget the iterator charges, restarted for every `getMore`. */
  readonly budget: OperationBudget | undefined;
}

export class CursorManager {
  private readonly cursors = new Map<number, CursorState>();
  private nextCursorId = 1;
  private readonly idleTimeoutMS: number;
  private readonly maxBatchBytes: number;
  private readonly now: () => number;

  public constructor(options: CursorManagerOptions = {}) {
    const timeout = options.idleTimeoutMS ?? DEFAULT_CURSOR_IDLE_TIMEOUT_MS;

    if (!Number.isSafeInteger(timeout) || timeout <= 0) {
      throw new TypeError(
        "Cursor idle timeout must be a positive safe integer.",
      );
    }

    this.idleTimeoutMS = timeout;
    this.maxBatchBytes = options.maxBatchBytes ?? DEFAULT_CURSOR_BATCH_BYTES;

    if (!Number.isSafeInteger(this.maxBatchBytes) || this.maxBatchBytes <= 0) {
      throw new TypeError(
        "Cursor batch byte limit must be a positive safe integer.",
      );
    }
    this.now = options.now ?? Date.now;
  }

  public get activeCursorCount(): number {
    return this.cursors.size;
  }

  public open(
    documents: Iterable<Document>,
    batchSize = DEFAULT_CURSOR_BATCH_SIZE,
    budget?: OperationBudget,
  ): CursorBatch {
    validateBatchSize(batchSize);
    this.sweepExpired();

    const state: CursorState = {
      iterator: documents[Symbol.iterator](),
      buffered: undefined,
      exhausted: false,
      lastUsed: this.now(),
      budget,
    };

    const documentsBatch = takeBatch(state, batchSize, this.maxBatchBytes);

    if (isExhausted(state)) {
      return {
        cursorId: null,
        documents: Object.freeze(documentsBatch),
      };
    }

    const cursorId = this.allocateCursorId();

    this.cursors.set(cursorId, state);

    return {
      cursorId,
      documents: Object.freeze(documentsBatch),
    };
  }

  public getMore(
    cursorId: number,
    batchSize = DEFAULT_CURSOR_BATCH_SIZE,
    limits: BudgetLimits = {},
  ): CursorBatch {
    validateCursorId(cursorId);
    validateBatchSize(batchSize);
    this.sweepExpired();

    const state = this.cursors.get(cursorId);

    if (state === undefined) {
      throw new CursorNotFoundError(cursorId);
    }

    state.lastUsed = this.now();
    state.budget?.restart(limits);

    let documents: Document[];

    try {
      documents = takeBatch(state, batchSize, this.maxBatchBytes);
    } catch (error: unknown) {
      // An iterator that threw is finished, so the cursor cannot continue.
      this.cursors.delete(cursorId);

      throw error;
    }

    if (isExhausted(state)) {
      this.cursors.delete(cursorId);

      return {
        cursorId: null,
        documents: Object.freeze(documents),
      };
    }

    return {
      cursorId,
      documents: Object.freeze(documents),
    };
  }

  public sweepExpired(): number {
    const cutoff = this.now() - this.idleTimeoutMS;
    let removed = 0;

    for (const [cursorId, state] of this.cursors) {
      if (state.lastUsed <= cutoff) {
        this.cursors.delete(cursorId);
        removed += 1;
      }
    }

    return removed;
  }

  public close(cursorId: number): boolean {
    validateCursorId(cursorId);

    return this.cursors.delete(cursorId);
  }

  public clear(): void {
    this.cursors.clear();
  }

  private allocateCursorId(): number {
    const first = this.nextCursorId;

    while (this.cursors.has(this.nextCursorId)) {
      this.advanceCursorId();

      if (this.nextCursorId === first) {
        throw new Error("No cursor IDs are available.");
      }
    }

    const cursorId = this.nextCursorId;

    this.advanceCursorId();

    return cursorId;
  }

  private advanceCursorId(): void {
    if (this.nextCursorId === Number.MAX_SAFE_INTEGER) {
      this.nextCursorId = 1;
      return;
    }

    this.nextCursorId += 1;
  }
}

export class CursorNotFoundError extends Error {
  public readonly cursorId: number;

  public constructor(cursorId: number) {
    super(`Cursor ${cursorId} does not exist or has already exhausted.`);

    this.name = "CursorNotFound";
    this.cursorId = cursorId;
  }
}

function takeBatch(
  state: CursorState,
  batchSize: number,
  maxBatchBytes: number,
): Document[] {
  const documents: Document[] = [];
  let bytes = 0;

  if (state.buffered !== undefined) {
    documents.push(state.buffered);
    bytes += estimateEncodedSize(state.buffered);
    state.buffered = undefined;
  }

  while (documents.length < batchSize) {
    const result = state.iterator.next();

    if (result.done === true) {
      state.exhausted = true;
      return documents;
    }

    const size = estimateEncodedSize(result.value);

    // Keep this document for the next batch rather than overflow a message.
    if (documents.length > 0 && bytes + size > maxBatchBytes) {
      state.buffered = result.value;
      return documents;
    }

    documents.push(result.value);
    bytes += size;
  }

  const lookahead = state.iterator.next();

  if (lookahead.done === true) {
    state.exhausted = true;
  } else {
    state.buffered = lookahead.value;
  }

  return documents;
}

function isExhausted(state: CursorState): boolean {
  return state.exhausted && state.buffered === undefined;
}

function validateCursorId(cursorId: number): void {
  if (!Number.isSafeInteger(cursorId) || cursorId <= 0) {
    throw new TypeError("Cursor ID must be a positive safe integer.");
  }
}

function validateBatchSize(batchSize: number): void {
  if (!Number.isSafeInteger(batchSize) || batchSize <= 0) {
    throw new TypeError("Cursor batch size must be a positive safe integer.");
  }
}
