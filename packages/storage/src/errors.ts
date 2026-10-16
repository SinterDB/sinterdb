import { CustomId } from "sinterdb-protocol";

export const StorageErrorCode = {
  InvalidDocument: "INVALID_DOCUMENT",
  InvalidDocumentId: "INVALID_DOCUMENT_ID",
  InvalidFilter: "INVALID_FILTER",
  InvalidFindOptions: "INVALID_FIND_OPTIONS",
  InvalidBatch: "INVALID_BATCH",
  InvalidPipeline: "INVALID_PIPELINE",
  InvalidUpdate: "INVALID_UPDATE",
  ImmutableId: "IMMUTABLE_ID",
  DuplicateId: "DUPLICATE_ID",
  Corruption: "CORRUPTION",
  Io: "IO_ERROR",
  DiskFull: "DISK_FULL",
  PermissionDenied: "PERMISSION_DENIED",
  Closed: "CLOSED",
  Locked: "LOCKED",
  DuplicateKey: "DUPLICATE_KEY",
  InvalidIndex: "INVALID_INDEX",
  IndexNotFound: "INDEX_NOT_FOUND",
  IndexConflict: "INDEX_CONFLICT",
  UnsupportedFormat: "UNSUPPORTED_FORMAT",
  InvalidBackup: "INVALID_BACKUP",
} as const;

export type StorageErrorCode =
  (typeof StorageErrorCode)[keyof typeof StorageErrorCode];

export interface StorageCorruptionDetails {
  readonly file: string;
  readonly offset: number;
  readonly lsn?: bigint;
}

export class StorageError extends Error {
  public readonly code: StorageErrorCode;

  public constructor(
    code: StorageErrorCode,
    message: string,
    options: ErrorOptions = {},
  ) {
    super(message, options);

    this.name = "StorageError";
    this.code = code;
  }
}

export class StorageInsertManyError extends StorageError {
  public readonly failedIndex: number;
  public readonly insertedIds: readonly CustomId[];

  public constructor(
    failedIndex: number,
    insertedIds: readonly CustomId[],
    cause: StorageError,
  ) {
    super(
      cause.code,
      `Insert failed at batch index ${failedIndex}: ${cause.message}`,
      {
        cause,
      },
    );

    this.name = "StorageInsertManyError";
    this.failedIndex = failedIndex;
    this.insertedIds = Object.freeze([...insertedIds]);
  }
}

export class StorageCorruptionError extends StorageError {
  public readonly file: string;
  public readonly offset: number;
  public readonly lsn: bigint | undefined;

  public constructor(message: string, details: StorageCorruptionDetails) {
    super(StorageErrorCode.Corruption, message);

    this.name = "StorageCorruptionError";
    this.file = details.file;
    this.offset = details.offset;
    this.lsn = details.lsn;
  }
}
