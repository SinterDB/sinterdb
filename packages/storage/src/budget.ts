import { StorageError, StorageErrorCode } from "./errors.js";

/** The limits of an {@link OperationBudget}. Each one is optional. */
export interface BudgetLimits {
  /** Most milliseconds the operation may run. */
  readonly maxTimeMS?: number | undefined;
  /** Most documents the operation may examine. */
  readonly maxScanned?: number | undefined;
}

/** How many examined documents pass between two looks at the clock. */
const CLOCK_INTERVAL = 64;

/**
 * Limits what one operation may cost: how long it runs, and how many documents
 * it examines. The storage code calls {@link OperationBudget.charge} for every
 * document it examines, and `charge` throws a {@link StorageError} once a limit
 * is passed.
 *
 * The clock is read for the first document and then once for every 64, so a
 * limit can be passed by up to 63 documents' worth of time. An operation that
 * examines no documents is never charged, and a long sort or group is not
 * interrupted once its documents have been read.
 *
 * A budget can be restarted with fresh limits, which a cursor does for every
 * `getMore`.
 */
export class OperationBudget {
  private limits: BudgetLimits = {};
  private scanned = 0;
  private deadline: number | undefined;

  public constructor(
    limits: BudgetLimits = {},
    private readonly now: () => number = Date.now,
  ) {
    this.restart(limits);
  }

  /** Starts counting again, with these limits, from now. */
  public restart(limits: BudgetLimits = {}): void {
    validateLimit("maxTimeMS", limits.maxTimeMS);
    validateLimit("maxScanned", limits.maxScanned);

    this.limits = limits;
    this.scanned = 0;
    this.deadline =
      limits.maxTimeMS === undefined
        ? undefined
        : this.now() + limits.maxTimeMS;
  }

  /** How many documents have been charged since the last restart. */
  public get documentsScanned(): number {
    return this.scanned;
  }

  /** Counts one examined document and throws when a limit has been passed. */
  public charge(): void {
    this.scanned += 1;

    if (
      this.limits.maxScanned !== undefined &&
      this.scanned > this.limits.maxScanned
    ) {
      throw new StorageError(
        StorageErrorCode.ScanLimitExceeded,
        `The operation examined more than ${this.limits.maxScanned} documents.`,
      );
    }

    if (
      this.deadline !== undefined &&
      this.scanned % CLOCK_INTERVAL === 1 &&
      this.now() >= this.deadline
    ) {
      throw new StorageError(
        StorageErrorCode.OperationTimeLimitExceeded,
        `The operation ran longer than ${this.limits.maxTimeMS}ms.`,
      );
    }
  }
}

function validateLimit(name: string, value: number | undefined): void {
  if (value === undefined) {
    return;
  }

  if (!Number.isSafeInteger(value) || value < 1) {
    throw new StorageError(
      StorageErrorCode.InvalidFindOptions,
      `${name} must be a positive safe integer.`,
    );
  }
}
