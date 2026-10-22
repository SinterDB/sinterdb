import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";

import {
  InMemoryCollection,
  type CollectionJournal,
  type IndexValidationReport,
  type JournalOperation,
} from "../in-memory-collection.js";
import { sameDefinition, type IndexSpec } from "../indexing/spec.js";
import {
  StorageCorruptionError,
  StorageError,
  StorageErrorCode,
} from "../errors.js";
import {
  RECORD_HEADER_SIZE,
  WriteAheadLog,
  type WriteConcern,
  type WalRecord,
} from "../wal/index.js";
import {
  CheckpointDamagedError,
  listCheckpoints,
  readCheckpoint,
  removeTemporaryCheckpoints,
  writeCheckpoint,
  writeCheckpointSteps,
  type CheckpointCollection,
  type CheckpointStage,
  type ReadCheckpoint,
} from "./checkpoint.js";
import { translateIo } from "../io-error.js";
import { writeFileAtomic } from "./files.js";
import { acquireDirectoryLock, type DirectoryLock } from "./lock.js";
import {
  MIGRATIONS,
  planMigrations,
  type MigrationEvent,
  type MigrationPlan,
} from "./migrations.js";
import {
  RecordType,
  decodeOperations,
  encodeOperations,
  type Operation,
} from "./operations.js";

export const STORAGE_FORMAT = "sinterdb-data";
/**
 * Version 2 adds index definitions to the log and to snapshots. Version 1
 * directories are upgraded in place when they are opened.
 */
export const STORAGE_FORMAT_VERSION = 3;
export const DEFAULT_CHECKPOINT_THRESHOLD_BYTES = 64 * 1024 * 1024;
export const DEFAULT_MEMORY_FLUSH_INTERVAL_MS = 100;
/**
 * Snapshots kept after a checkpoint. Keeping two means a damaged newest
 * snapshot never loses data, so this is also the smallest allowed value.
 */
export const DEFAULT_CHECKPOINT_RETENTION = 2;

export interface StorageEngineOptions {
  readonly directory: string;
  /** How a write is acknowledged. Defaults to `flushed`. */
  readonly writeConcern?: WriteConcern;
  /**
   * With the `flushed` write concern, a write is not flushed to stable storage
   * until `commit` is called, so many writes can share one flush. Callers must
   * not acknowledge a write before `commit` returns. Defaults to false.
   */
  readonly groupCommit?: boolean;
  /**
   * With the `memory` write concern, pending log records are written to the
   * operating system at least this often. Defaults to 100 milliseconds.
   */
  readonly memoryFlushIntervalMs?: number;
  readonly segmentSizeBytes?: number;
  /**
   * A checkpoint is taken automatically once this many bytes of log have been
   * written since the previous one.
   */
  readonly checkpointThresholdBytes?: number;
  /**
   * Also take a checkpoint at least this often, in milliseconds, while writes
   * have happened since the last one. Off by default.
   */
  readonly checkpointIntervalMs?: number;
  /**
   * How many snapshots to keep, at least 2. The log since the oldest kept
   * snapshot is kept too. Defaults to 2.
   */
  readonly checkpointRetention?: number;
  /**
   * Take a final checkpoint when the engine is closed so the next start has
   * little or nothing to replay. Defaults to true.
   */
  readonly checkpointOnClose?: boolean;
  /**
   * Write automatic checkpoints in the background. The snapshot is written in
   * steps between other work, so a large data set does not stop reads and
   * writes while it is saved. It needs a point-in-time copy of the document
   * list while it runs. Calling `checkpoint()` or closing the engine cancels a
   * running background checkpoint and checkpoints in one go instead. Defaults
   * to false.
   */
  readonly backgroundCheckpoints?: boolean;
  /**
   * Take over a lock file left by a process on another host. Only set this
   * when no other server can be using the directory at the same time, for
   * example because a container platform started this server in place of one
   * that stopped. A lock left by a process on this host is always checked.
   */
  readonly reclaimLock?: boolean;
  /**
   * Called before each step that upgrades an older data directory to the
   * current storage format, so a server can say what it is doing.
   */
  readonly onMigration?: (event: MigrationEvent) => void;
  /**
   * The format version to write and the steps that lead to it. Defaults to the
   * current version and its steps. Intended for tests and tools.
   */
  readonly migrationPlan?: MigrationPlan;
  /**
   * Called as a checkpoint passes each stage. Intended for tests and
   * diagnostics; throwing from it aborts the checkpoint at that point.
   */
  readonly onCheckpointStage?: (stage: CheckpointStage) => void;
}

export interface CheckpointResult {
  readonly lsn: bigint;
  readonly file: string;
  readonly collections: number;
  readonly documents: number;
  readonly removedSnapshots: number;
  readonly removedSegments: number;
}

export interface SkippedCheckpoint {
  readonly file: string;
  readonly reason: string;
}

export interface RecoveryReport {
  /** The snapshot recovery started from, or 0 when it replayed the whole log. */
  readonly checkpointLsn: bigint;
  readonly checkpointFile: string | undefined;
  /** Newer snapshots that were damaged and therefore not used. */
  readonly skippedCheckpoints: readonly SkippedCheckpoint[];
  readonly replayedRecords: number;
  /** Indexes rebuilt from the documents. Their contents are never stored. */
  readonly rebuiltIndexes: number;
  readonly lastLsn: bigint;
}

export interface CollectionIndexReport {
  readonly database: string;
  readonly collection: string;
  readonly report: IndexValidationReport;
}

interface RecoveredState {
  readonly documents: Map<string, Uint8Array>;
  indexes: IndexSpec[];
}

interface Settings {
  readonly checkpointThresholdBytes: number;
  readonly checkpointRetention: number;
  readonly checkpointOnClose: boolean;
  readonly backgroundCheckpoints: boolean;
  readonly onCheckpointStage: (stage: CheckpointStage) => void;
}

interface Manifest {
  readonly format: string;
  readonly formatVersion: number;
  readonly createdAt: string;
  readonly upgradedFrom?: number;
  readonly upgradedAt?: string;
  /**
   * Set while an upgrade that rewrites files is under way. The version above
   * is already the new one, so older servers refuse the directory; if a crash
   * leaves this behind, the next start runs the whole upgrade again.
   */
  readonly migratingFrom?: number;
}

interface ActiveCheckpoint {
  promise: Promise<CheckpointResult | undefined>;
  /** Stops the checkpoint now and removes its unfinished file. */
  abort(): void;
}

interface BegunCheckpoint {
  readonly lsn: bigint;
  readonly collections: CheckpointCollection[];
  readonly documents: number;
  readonly bytes: number;
}

interface ManifestPlan {
  readonly plan: MigrationPlan;
  readonly onMigration?: (event: MigrationEvent) => void;
}

const SUBDIRECTORIES = ["wal", "segments", "indexes", "checkpoints"] as const;

export class StorageEngine {
  private readonly databases = new Map<
    string,
    Map<string, InMemoryCollection>
  >();
  private closed = false;
  private flushTimer: ReturnType<typeof setInterval> | undefined;
  private checkpointTimer: ReturnType<typeof setInterval> | undefined;
  private lastCheckpoint = 0n;
  private bytesSinceCheckpoint = 0;
  private nextCheckpointAt: number;
  private checkpointFailure: unknown;
  private activeCheckpoint: ActiveCheckpoint | undefined;
  private report: RecoveryReport = {
    checkpointLsn: 0n,
    checkpointFile: undefined,
    skippedCheckpoints: [],
    replayedRecords: 0,
    rebuiltIndexes: 0,
    lastLsn: 0n,
  };

  private constructor(
    private readonly root: string,
    private readonly log: WriteAheadLog,
    private readonly lock: DirectoryLock,
    private readonly settings: Settings,
  ) {
    this.nextCheckpointAt = settings.checkpointThresholdBytes;
  }

  public static open(options: StorageEngineOptions): StorageEngine {
    const root = options.directory;
    const threshold =
      options.checkpointThresholdBytes ?? DEFAULT_CHECKPOINT_THRESHOLD_BYTES;

    if (!Number.isSafeInteger(threshold) || threshold < 1) {
      throw new TypeError(
        "The checkpoint threshold must be a positive safe integer.",
      );
    }

    const flushInterval =
      options.memoryFlushIntervalMs ?? DEFAULT_MEMORY_FLUSH_INTERVAL_MS;

    if (!Number.isSafeInteger(flushInterval) || flushInterval < 1) {
      throw new TypeError(
        "The memory flush interval must be a positive safe integer.",
      );
    }

    const retention =
      options.checkpointRetention ?? DEFAULT_CHECKPOINT_RETENTION;

    if (!Number.isSafeInteger(retention) || retention < 2) {
      throw new TypeError(
        "The checkpoint retention must be an integer of at least 2.",
      );
    }

    const interval = options.checkpointIntervalMs;

    if (
      interval !== undefined &&
      (!Number.isSafeInteger(interval) || interval < 1)
    ) {
      throw new TypeError(
        "The checkpoint interval must be a positive safe integer.",
      );
    }

    const settings: Settings = {
      checkpointThresholdBytes: threshold,
      checkpointRetention: retention,
      checkpointOnClose: options.checkpointOnClose ?? true,
      backgroundCheckpoints: options.backgroundCheckpoints ?? false,
      onCheckpointStage: options.onCheckpointStage ?? (() => undefined),
    };

    mkdirSync(root, { recursive: true });

    const lock = acquireDirectoryLock(join(root, "LOCK"), {
      reclaimForeignLock: options.reclaimLock === true,
    });

    try {
      for (const name of SUBDIRECTORIES) {
        mkdirSync(join(root, name), { recursive: true });
      }

      prepareManifest(root, {
        plan: options.migrationPlan ?? {
          targetVersion: STORAGE_FORMAT_VERSION,
          migrations: MIGRATIONS,
        },
        ...(options.onMigration === undefined
          ? {}
          : {
              onMigration: options.onMigration,
            }),
      });

      const log = WriteAheadLog.open({
        directory: join(root, "wal"),
        ...(options.writeConcern === undefined
          ? {}
          : { writeConcern: options.writeConcern }),
        ...(options.groupCommit === undefined
          ? {}
          : { groupCommit: options.groupCommit }),
        ...(options.segmentSizeBytes === undefined
          ? {}
          : { segmentSizeBytes: options.segmentSizeBytes }),
      });

      try {
        const engine = new StorageEngine(root, log, lock, settings);

        engine.recover();

        if (log.writeConcern === "memory") {
          engine.startFlushTimer(flushInterval);
        }

        if (interval !== undefined) {
          engine.startCheckpointTimer(interval);
        }

        return engine;
      } catch (error: unknown) {
        log.close();

        throw error;
      }
    } catch (error: unknown) {
      lock.release();

      throw error;
    }
  }

  public get directory(): string {
    return this.root;
  }

  public get writeConcern(): WriteConcern {
    return this.log.writeConcern;
  }

  /** True while some writes are applied but not yet flushed by `commit`. */
  public get hasUncommittedWrites(): boolean {
    return !this.closed && this.log.hasUncommittedWrites;
  }

  public get lastLsn(): bigint {
    return this.log.lastLsn;
  }

  public get recovery(): RecoveryReport {
    return this.report;
  }

  /** The log sequence number covered by the newest snapshot, or 0. */
  public get lastCheckpointLsn(): bigint {
    return this.lastCheckpoint;
  }

  /** The error from the most recent automatic checkpoint that failed. */
  public get lastCheckpointError(): unknown {
    return this.checkpointFailure;
  }

  /** Flushes all write since the last commit. See `groupCommit`. */
  public commit(): void {
    if (this.closed) {
      return;
    }

    this.log.commit();
  }

  public listDatabases(): string[] {
    return [...this.databases.keys()].sort();
  }

  public listCollections(database: string): string[] {
    return [...(this.databases.get(database)?.keys() ?? [])].sort();
  }

  public getCollection(
    database: string,
    collection: string,
  ): InMemoryCollection | undefined {
    return this.databases.get(database)?.get(collection);
  }

  /**
   * Returns the collection, creating and journaling it first when it does not
   * exist yet.
   */
  public openCollection(
    database: string,
    collection: string,
  ): InMemoryCollection {
    const existing = this.getCollection(database, collection);

    if (existing !== undefined) {
      return existing;
    }

    this.append([{ kind: "createCollection", database, collection }]);

    return this.register(database, collection, new Map());
  }

  /** Rebuilds every index in every collection and reports any difference. */
  public validateIndexes(): CollectionIndexReport[] {
    const reports: CollectionIndexReport[] = [];

    for (const [database, byName] of this.databases) {
      for (const [collection, store] of byName) {
        reports.push({ database, collection, report: store.validateIndexes() });
      }
    }

    return reports;
  }

  public close(): void {
    if (this.closed) {
      return;
    }

    let failure: unknown;

    this.activeCheckpoint?.abort();

    if (
      this.settings.checkpointOnClose &&
      this.lastCheckpoint < this.log.lastLsn
    ) {
      try {
        this.checkpoint();
      } catch (error: unknown) {
        failure = error;
      }
    }

    this.closed = true;

    if (this.flushTimer !== undefined) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    if (this.checkpointTimer !== undefined) {
      clearInterval(this.checkpointTimer);
      this.checkpointTimer = undefined;
    }

    try {
      this.log.close();
    } catch (error: unknown) {
      failure ??= error;
    } finally {
      this.lock.release();
    }

    if (failure !== undefined) {
      throw failure;
    }
  }

  /**
   * Writes a snapshot of every collection, then removes snapshots and log
   * segments that are no longer needed. Two snapshots and the log since the
   * older one are always kept, so a damaged newest snapshot never loses data.
   * Returns undefined when nothing was written since the last checkpoint.
   *
   * This runs synchronously and blocks the server while it works.
   */
  public checkpoint(): CheckpointResult | undefined {
    this.assertOpen();
    this.activeCheckpoint?.abort();

    const begun = this.beginCheckpoint(false);

    if (begun === undefined) {
      return undefined;
    }

    const directory = join(this.root, "checkpoints");
    let file: string;

    try {
      file = writeCheckpoint(
        directory,
        begun.lsn,
        begun.collections,
        this.settings.onCheckpointStage,
      );
    } catch (error: unknown) {
      throw translateIo("write a snapshot", directory, error);
    }

    return this.finishCheckpoint(begun, file);
  }

  /** True while a background checkpoint is being written. */
  public get isCheckpointing(): boolean {
    return this.activeCheckpoint !== undefined;
  }

  /**
   * Like `checkpoint`, but writes the snapshot in steps and lets reads and
   * writes run in between, so a large data set does not block the engine. The
   * snapshot holds the state at the moment this was called; later writes stay
   * in the log. If a background checkpoint is already running this returns
   * its result instead of starting another. Closing the engine or calling
   * `checkpoint` cancels it, and the promise then resolves to undefined.
   */
  public checkpointAsync(): Promise<CheckpointResult | undefined> {
    this.assertOpen();

    if (this.activeCheckpoint !== undefined) {
      return this.activeCheckpoint.promise;
    }

    const begun = this.beginCheckpoint(true);

    if (begun === undefined) {
      return Promise.resolve(undefined);
    }

    const directory = join(this.root, "checkpoints");
    const steps = writeCheckpointSteps(
      directory,
      begun.lsn,
      begun.collections,
      this.settings.onCheckpointStage,
    );
    let aborted = false;
    const active: ActiveCheckpoint = {
      promise: Promise.resolve(undefined),
      abort: () => {
        aborted = true;
        steps.return("");
      },
    };

    this.activeCheckpoint = active;

    const run = async (): Promise<CheckpointResult | undefined> => {
      try {
        for (;;) {
          let step: IteratorResult<void, string>;

          try {
            step = steps.next();
          } catch (error: unknown) {
            throw translateIo("write a snapshot", directory, error);
          }

          if (step.done === true) {
            return this.finishCheckpoint(begun, step.value);
          }

          await new Promise<void>((resolve) => setImmediate(resolve));

          if (aborted) {
            return undefined;
          }
        }
      } finally {
        if (this.activeCheckpoint === active) {
          this.activeCheckpoint = undefined;
        }
      }
    };

    active.promise = run();

    return active.promise;
  }

  /**
   * Flushes the log and notes what the snapshot must contain. The documents of
   * a background checkpoint are copied into an array, because the maps change
   * while it runs; stored documents are never modified in place.
   */
  private beginCheckpoint(copy: boolean): BegunCheckpoint | undefined {
    const lsn = this.log.lastLsn;

    if (lsn === 0n || lsn === this.lastCheckpoint) {
      return undefined;
    }

    this.log.sync();

    const collections: CheckpointCollection[] = [];
    let documents = 0;

    for (const [database, byName] of this.databases) {
      for (const [collection, store] of byName) {
        const entries = copy ? Array.from(store.entries()) : store.entries();

        collections.push({
          database,
          collection,
          documents: entries,
          documentCount: store.documentCount,
          indexes: store.indexSpec(),
        });
        documents += store.documentCount;
      }
    }

    return { lsn, collections, documents, bytes: this.bytesSinceCheckpoint };
  }

  private finishCheckpoint(
    begun: BegunCheckpoint,
    file: string,
  ): CheckpointResult | undefined {
    if (this.closed) {
      return undefined;
    }

    const directory = join(this.root, "checkpoints");
    const stage = this.settings.onCheckpointStage;
    const snapshots = listCheckpoints(directory);
    let removedSnapshots = 0;

    for (const old of snapshots.slice(this.settings.checkpointRetention)) {
      try {
        unlinkSync(old.path);
      } catch (error: unknown) {
        throw translateIo("remove an old snapshot", old.path, error);
      }

      removedSnapshots += 1;
    }

    stage("snapshots-pruned");

    const oldestKept = snapshots[this.settings.checkpointRetention - 1];
    const removedSegments =
      oldestKept === undefined ? 0 : this.log.truncateThrough(oldestKept.lsn);

    stage("log-truncated");

    this.lastCheckpoint = begun.lsn;
    this.bytesSinceCheckpoint = Math.max(
      0,
      this.bytesSinceCheckpoint - begun.bytes,
    );
    this.nextCheckpointAt = this.settings.checkpointThresholdBytes;
    this.checkpointFailure = undefined;

    return {
      lsn: begun.lsn,
      file,
      collections: begun.collections.length,
      documents: begun.documents,
      removedSnapshots,
      removedSegments,
    };
  }

  private register(
    database: string,
    collection: string,
    documents: Map<string, Uint8Array>,
    indexes: readonly IndexSpec[] = [],
  ): InMemoryCollection {
    const journal: CollectionJournal = {
      commit: (operations) => {
        this.append(
          operations.map((operation) =>
            toOperation(database, collection, operation),
          ),
        );
      },
    };

    const created = new InMemoryCollection({ journal, documents, indexes });
    let collections = this.databases.get(database);

    if (collections === undefined) {
      collections = new Map();
      this.databases.set(database, collections);
    }

    collections.set(collection, created);

    return created;
  }

  private startFlushTimer(intervalMs: number): void {
    this.flushTimer = setInterval(() => {
      try {
        this.log.flush();
      } catch {
        // The log marks itself failed, so the next write reports the error.
      }
    }, intervalMs);

    this.flushTimer.unref();
  }

  private startCheckpointTimer(intervalMs: number): void {
    this.checkpointTimer = setInterval(() => {
      if (this.closed || this.activeCheckpoint !== undefined) {
        return;
      }

      try {
        if (this.settings.backgroundCheckpoints) {
          this.checkpointAsync().catch((error: unknown) => {
            this.checkpointFailure = error;
          });
        } else {
          this.checkpoint();
        }
      } catch (error: unknown) {
        this.checkpointFailure = error;
      }
    }, intervalMs);

    this.checkpointTimer.unref();
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new StorageError(
        StorageErrorCode.Closed,
        "The storage engine is closed.",
      );
    }
  }

  private append(operations: readonly Operation[]): void {
    this.assertOpen();

    this.runDueCheckpoint();

    let payload: Uint8Array;

    try {
      payload = encodeOperations(operations);
      this.log.append(RecordType.Transaction, payload);
      this.bytesSinceCheckpoint += RECORD_HEADER_SIZE + payload.byteLength;
    } catch (error: unknown) {
      if (error instanceof RangeError) {
        throw new StorageError(
          StorageErrorCode.InvalidBatch,
          `The operation is too large to record: ${error.message}`,
          { cause: error },
        );
      }

      throw error;
    }
  }

  /**
   * Checkpoints run at the start of an append, never in the middle of one,
   * because only then does memory match every record in the log.
   */
  private runDueCheckpoint(): void {
    if (
      this.bytesSinceCheckpoint < this.nextCheckpointAt ||
      this.activeCheckpoint !== undefined
    ) {
      return;
    }

    this.runAutomaticCheckpoint();
  }

  private runAutomaticCheckpoint(): void {
    const failed = (error: unknown): void => {
      this.checkpointFailure = error;
      this.nextCheckpointAt =
        this.bytesSinceCheckpoint + this.settings.checkpointThresholdBytes;
    };

    try {
      if (this.settings.backgroundCheckpoints) {
        this.checkpointAsync().catch(failed);
      } else {
        this.checkpoint();
      }
    } catch (error: unknown) {
      failed(error);
    }
  }

  private recover(): void {
    const directory = join(this.root, "checkpoints");

    removeTemporaryCheckpoints(directory);

    const skipped: SkippedCheckpoint[] = [];
    let base: ReadCheckpoint | undefined;
    let baseFile: string | undefined;

    for (const candidate of listCheckpoints(directory)) {
      try {
        base = readCheckpoint(candidate.path);

        if (base.lsn !== candidate.lsn) {
          throw new CheckpointDamagedError(
            "The snapshot's sequence number does not match its file name.",
          );
        }

        baseFile = candidate.file;
        break;
      } catch (error: unknown) {
        base = undefined;
        skipped.push({
          file: candidate.file,
          reason:
            error instanceof CheckpointDamagedError
              ? error.message
              : (error as Error).message,
        });
      }
    }

    const baseLsn = base?.lsn ?? 0n;

    if (this.log.firstLsn > baseLsn + 1n) {
      const problem =
        skipped.length > 0
          ? ` The newer snapshot${skipped.length > 1 ? "s" : ""} (${skipped
              .map((entry) => `${entry.file}: ${entry.reason}`)
              .join(
                "; ",
              )}) could not be read and the log before ${this.log.firstLsn} has already been compacted away.`
          : ` The log before ${this.log.firstLsn} has been removed and no snapshot covers it.`;

      throw new StorageCorruptionError(
        `The data in ${this.root} cannot be recovered.${problem} Restore the data directory from a backup.`,
        { file: this.root, offset: 0 },
      );
    }

    if (this.log.lastLsn < baseLsn) {
      throw new StorageCorruptionError(
        `The snapshot ${baseFile ?? ""} covers log sequence number ${baseLsn} but the log ends at ${this.log.lastLsn}. The log has lost records. Restore the data directory from a backup.`,
        { file: this.root, offset: 0 },
      );
    }

    const recovered = new Map<string, Map<string, RecoveredState>>();

    for (const entry of base?.collections ?? []) {
      let collections = recovered.get(entry.database);

      if (collections === undefined) {
        collections = new Map();
        recovered.set(entry.database, collections);
      }

      collections.set(entry.collection, {
        documents: entry.documents,
        indexes: [...entry.indexes],
      });
    }

    let replayed = 0;

    for (const record of this.log.records(baseLsn)) {
      replayed += 1;
      this.bytesSinceCheckpoint +=
        RECORD_HEADER_SIZE + record.payload.byteLength;
      let operations: Operation[];

      if (record.type !== RecordType.Transaction) {
        throw this.corrupt(
          record,
          `It has unknown record type ${record.type}. The data was probably written by a newer version of SinterDB.`,
        );
      }

      try {
        operations = decodeOperations(record.payload);
      } catch (error: unknown) {
        throw this.corrupt(record, (error as Error).message);
      }

      for (const operation of operations) {
        this.applyRecovered(recovered, operation, record);
      }
    }

    let rebuilt = 0;

    for (const [database, collections] of recovered) {
      for (const [collection, state] of collections) {
        try {
          this.register(database, collection, state.documents, state.indexes);
        } catch (error: unknown) {
          if (error instanceof StorageError) {
            throw new StorageCorruptionError(
              `The index definitions of collections "${database}.${collection}" cannot be rebuilt from its document: ${error.message} The data in ${this.root} is inconsistent. Restore the data directory from a backup.`,
              { file: this.root, offset: 0 },
            );
          }

          throw error;
        }

        rebuilt += state.indexes.length;
      }
    }

    this.lastCheckpoint = baseLsn;
    this.report = {
      checkpointLsn: baseLsn,
      checkpointFile: baseFile,
      skippedCheckpoints: skipped,
      replayedRecords: replayed,
      rebuiltIndexes: rebuilt,
      lastLsn: this.log.lastLsn,
    };
  }

  private applyRecovered(
    recovered: Map<string, Map<string, RecoveredState>>,
    operation: Operation,
    record: WalRecord,
  ): void {
    if (operation.kind === "createCollection") {
      let collections = recovered.get(operation.database);

      if (collections === undefined) {
        collections = new Map();
        recovered.set(operation.database, collections);
      }

      if (!collections.has(operation.collection)) {
        collections.set(operation.collection, {
          documents: new Map(),
          indexes: [],
        });
      }

      return;
    }

    const state = recovered.get(operation.database)?.get(operation.collection);

    if (state === undefined) {
      throw this.corrupt(
        record,
        `It refers to collection "${operation.database}.${operation.collection}", which was never created.`,
      );
    }

    if (operation.kind === "createIndex") {
      const existing = state.indexes.find(
        (index) => index.name === operation.index.name,
      );

      if (existing === undefined) {
        state.indexes.push(operation.index);
      } else if (!sameDefinition(existing, operation.index)) {
        throw this.corrupt(
          record,
          `It creates index "${operation.index.name}" with a definition that conflicts with the existing index of that name.`,
        );
      }

      return;
    }

    if (operation.kind === "dropIndex") {
      const position = state.indexes.findIndex(
        (index) => index.name === operation.name,
      );

      if (position < 0) {
        throw this.corrupt(
          record,
          `It drops index "${operation.name}", which does not exist.`,
        );
      }

      state.indexes.splice(position, 1);

      return;
    }

    const key = Buffer.from(operation.id).toString("hex");

    if (operation.kind === "put") {
      state.documents.set(key, operation.document);
    } else {
      state.documents.delete(key);
    }
  }

  private corrupt(record: WalRecord, reason: string): StorageCorruptionError {
    const directory = join(this.root, "wal");

    return new StorageCorruptionError(
      `The write-ahead log in ${directory} contains an unusable record (log sequence number ${record.lsn}): ${reason} Restore the data directory from a backup, or open it with the SinterDB version that wrote it.`,
      { file: directory, offset: 0, lsn: record.lsn },
    );
  }
}

function toOperation(
  database: string,
  collection: string,
  operation: JournalOperation,
): Operation {
  if (operation.kind === "createIndex") {
    return { kind: "createIndex", database, collection, index: operation.spec };
  }

  if (operation.kind === "dropIndex") {
    return { kind: "dropIndex", database, collection, name: operation.name };
  }

  const id = Buffer.from(operation.key, "hex");

  return operation.kind === "put"
    ? { kind: "put", database, collection, id, document: operation.document }
    : { kind: "delete", database, collection, id };
}

function prepareManifest(
  root: string,
  { plan, onMigration }: ManifestPlan,
): void {
  const path = join(root, "manifest.json");
  const target = plan.targetVersion;
  // A crash while replacing this manifest can leave the temporary copy behind.
  // The real manifest is untouched at that point, so the copy is just debris.
  rmSync(`${path}.tmp`, { force: true });

  if (!existsSync(path)) {
    if (hasLogData(root)) {
      throw new StorageCorruptionError(
        `The data directory ${root} contains write-ahead log files but no manifest.json. Restore manifest.json from a backup; do not start the server on this directory until it is restored.`,
        { file: path, offset: 0 },
      );
    }

    const manifest: Manifest = {
      format: STORAGE_FORMAT,
      formatVersion: target,
      createdAt: new Date().toISOString(),
    };

    writeFileAtomic(root, path, `${JSON.stringify(manifest, null, 2)}\n`);

    return;
  }

  let manifest: Partial<Manifest>;

  try {
    manifest = JSON.parse(readFileSync(path, "utf8")) as Partial<Manifest>;
  } catch (error: unknown) {
    throw new StorageCorruptionError(
      `The manifest ${path} is not valid JSON: ${(error as Error).message}. Restore it from a backup.`,
      { file: path, offset: 0 },
    );
  }

  if (manifest.format !== STORAGE_FORMAT) {
    throw new StorageError(
      StorageErrorCode.UnsupportedFormat,
      `The directory ${root} is not a SinterDB data directory (manifest format is ${JSON.stringify(manifest.format)}).`,
    );
  }

  if (typeof manifest.formatVersion !== "number") {
    throw new StorageCorruptionError(
      `The manifest ${path} has no valid format version.`,
      { file: path, offset: 0 },
    );
  }

  if (!Number.isInteger(manifest.formatVersion) || manifest.formatVersion < 1) {
    throw new StorageCorruptionError(
      `The manifest ${path} has an invalid format version.`,
      { file: path, offset: 0 },
    );
  }

  if (manifest.formatVersion > target) {
    throw new StorageError(
      StorageErrorCode.UnsupportedFormat,
      `The data directory uses storage format version ${manifest.formatVersion}, but this version of SinterDB only supports up to version ${target}. Upgrade SinterDB to open it.`,
    );
  }

  const interrupted = readInterruptedUpgrade(manifest, path, target);
  const from = interrupted ?? manifest.formatVersion;

  if (from === target && interrupted === undefined) {
    return;
  }

  const steps = planMigrations(from, plan);
  const rewrites = steps.some((step) => step.run !== undefined);
  const createdAt =
    typeof manifest.createdAt === "string"
      ? manifest.createdAt
      : new Date().toISOString();

  if (rewrites && interrupted === undefined) {
    // Older servers cannot read what the new version writes, and they must not
    // open a directory whose files are half rewritten. Mark it first.
    const marked: Manifest = {
      format: STORAGE_FORMAT,
      formatVersion: target,
      createdAt,
      migratingFrom: from,
    };

    writeFileAtomic(root, path, `${JSON.stringify(marked, null, 2)}\n`);
  }

  for (const step of steps) {
    onMigration?.({
      from: step.from,
      to: step.to,
      description: step.description,
    });
    step.run?.({ directory: root });
  }

  const upgraded: Manifest = {
    format: STORAGE_FORMAT,
    formatVersion: target,
    createdAt,
    upgradedFrom: from,
    upgradedAt: new Date().toISOString(),
  };

  writeFileAtomic(root, path, `${JSON.stringify(upgraded, null, 2)}\n`);
}

/** The version an unfinished upgrade started from, if there is one. */
function readInterruptedUpgrade(
  manifest: Partial<Manifest>,
  path: string,
  target: number,
): number | undefined {
  if (manifest.migratingFrom === undefined) {
    return undefined;
  }

  if (
    !Number.isInteger(manifest.migratingFrom) ||
    manifest.migratingFrom < 1 ||
    manifest.migratingFrom >= target
  ) {
    throw new StorageCorruptionError(
      `The manifest ${path} records an upgrade from an invalid version.`,
      { file: path, offset: 0 },
    );
  }

  return manifest.migratingFrom;
}

function hasLogData(root: string): boolean {
  const wal = join(root, "wal");

  return (
    existsSync(wal) && readdirSync(wal).some((name) => name.endsWith(".wal"))
  );
}
