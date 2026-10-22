import type { Document } from "sinterdb-protocol";

/**
 * Limits on what one server request may cost. Both are optional, and a
 * request that passes a limit fails with a {@link SinterServerError} named
 * `OperationTimeLimitExceeded` or `ScanLimitExceeded`.
 *
 * The limits apply to each round trip, not to the whole cursor: a cursor
 * sends them again with every `getMore`, so each batch gets a fresh budget.
 */
export interface QueryBudgetOptions {
  /**
   * The most milliseconds the server may spend on the request. The server
   * looks at the clock while it examines documents, so a limit can be passed
   * by a little before the request stops, and a long sort or group is not
   * interrupted once its documents are read. A positive integer.
   *
   * This is separate from the client's `requestTimeoutMS`, which gives up
   * waiting for the answer. Keep `requestTimeoutMS` larger than `maxTimeMS`,
   * or the client may stop waiting first.
   */
  readonly maxTimeMS?: number;
  /**
   * The most documents the server may examine for the request, counting every
   * document it reads, not only the ones it returns. An index lowers the
   * number. A positive integer.
   */
  readonly maxScanned?: number;
}

/** The budget parameters to send, or nothing when there are no limits. */
export function budgetParameters(options: QueryBudgetOptions): Document {
  return {
    ...(options.maxTimeMS === undefined
      ? {}
      : { maxTimeMS: options.maxTimeMS }),
    ...(options.maxScanned === undefined
      ? {}
      : { maxScanned: options.maxScanned }),
  };
}
