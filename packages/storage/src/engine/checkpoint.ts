import { crc32 } from "node:zlib";
import {
  closeSync,
  fsyncSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { join } from "node:path";

import { syncDirectory } from "../wal/index.js";
import { type IndexSpec } from "../indexing/spec.js";
import {
  ID_BYTE_LENGTH,
  MAX_NAME_BYTE_LENGTH,
  encodeIndexSpec,
  readIndexSpec,
} from "./operations.js";

/**
 * Version 1 had no index definitions. Version 2 stores them before each
 * collection's documents. Version 3 lets a definition cover several fields.
 * All three can be read; new snapshots use version 3.
 */
export const CHECKPOINT_FORMAT_VERSION = 3;
const OLDEST_READABLE_VERSION = 1;

const MAGIC = Buffer.from("SINTSNP\0", "latin1");
const END_MAGIC = Buffer.from("SINTEND\0", "latin1");
const HEADER_SIZE = 24;
const FOOTER_SIZE = 12;
const FLUSH_THRESHOLD = 1024 * 1024;
const FILE_NAME = /^(\d{20})\.snap$/;
const TEMPORARY_SUFFIX = ".snap.tmp";

export type CheckpointStage =
  | "snapshot-written"
  | "snapshot-renamed"
  | "snapshots-pruned"
  | "log-truncated";

export interface CheckpointCollection {
  readonly database: string;
  readonly collection: string;
  readonly documents: Iterable<[string, Uint8Array]>;
  readonly documentCount: number;
  readonly indexes: readonly IndexSpec[];
}

export interface RecoveredCollection {
  readonly database: string;
  readonly collection: string;
  readonly documents: Map<string, Uint8Array>;
  readonly indexes: IndexSpec[];
}

export interface ReadCheckpoint {
  readonly lsn: bigint;
  readonly collections: RecoveredCollection[];
}

export interface CheckpointFile {
  readonly lsn: bigint;
  readonly file: string;
  readonly path: string;
}

export class CheckpointDamagedError extends Error {
  public constructor(reason: string) {
    super(reason);

    this.name = "CheckpointDamagedError";
  }
}

export function checkpointFileName(lsn: bigint): string {
  return `${lsn.toString().padStart(20, "0")}.snap`;
}

export function listCheckpoints(directory: string): CheckpointFile[] {
  return readdirSync(directory)
    .map((file) => ({ file, match: FILE_NAME.exec(file) }))
    .filter(
      (entry): entry is { file: string; match: RegExpExecArray } =>
        entry.match !== null,
    )
    .map((entry) => ({
      lsn: BigInt(entry.match[1] as string),
      file: entry.file,
      path: join(directory, entry.file),
    }))
    .sort((left, right) =>
      left.lsn < right.lsn ? 1 : left.lsn > right.lsn ? -1 : 0,
    );
}

export function removeTemporaryCheckpoints(directory: string): number {
  let removed = 0;

  for (const name of readdirSync(directory)) {
    if (name.endsWith(TEMPORARY_SUFFIX)) {
      unlinkSync(join(directory, name));
      removed += 1;
    }
  }

  if (removed > 0) {
    syncDirectory(directory);
  }

  return removed;
}

/**
 * Writes a snapshot in steps. The generator pauses after about 1 MiB has been
 * written so a caller can let other work run. Closing it early removes the
 * unfinished temporary file. The collections must not change while it runs:
 * pass a point-in-time copy of their documents.
 */
export function* writeCheckpointSteps(
  directory: string,
  lsn: bigint,
  collections: readonly CheckpointCollection[],
  onStage: (stage: CheckpointStage) => void,
): Generator<void, string, undefined> {
  const file = checkpointFileName(lsn);
  const path = join(directory, file);
  const temporary = join(directory, `${file.slice(0, -5)}${TEMPORARY_SUFFIX}`);
  const fd = openSync(temporary, "w");
  let checksum = 0;
  let fdOpen = true;
  let done = false;
  const pending: Uint8Array[] = [];
  let pendingBytes = 0;

  const flush = (): void => {
    if (pendingBytes === 0) {
      return;
    }

    const chunk = Buffer.concat(pending, pendingBytes);

    pending.length = 0;
    pendingBytes = 0;
    checksum = crc32(chunk, checksum);
    writeAll(fd, chunk);
  };

  const add = (bytes: Uint8Array): void => {
    pending.push(bytes);
    pendingBytes += bytes.byteLength;
  };

  try {
    const header = Buffer.alloc(HEADER_SIZE);

    MAGIC.copy(header, 0);
    header.writeUInt32BE(CHECKPOINT_FORMAT_VERSION, 8);
    header.writeBigUInt64BE(lsn, 12);
    header.writeUInt32BE(collections.length, 20);
    add(header);

    for (const collection of collections) {
      add(encodeName(collection.database));
      add(encodeName(collection.collection));

      const indexCount = Buffer.alloc(2);

      indexCount.writeUint16BE(collection.indexes.length, 0);
      add(indexCount);

      for (const index of collection.indexes) {
        add(encodeIndexSpec(index));
      }

      const count = Buffer.alloc(4);

      count.writeUInt32BE(collection.documentCount, 0);
      add(count);

      for (const [key, document] of collection.documents) {
        const entry = Buffer.alloc(ID_BYTE_LENGTH + 4);

        Buffer.from(key, "hex").copy(entry, 0);
        entry.writeUInt32BE(document.byteLength, ID_BYTE_LENGTH);
        add(entry);
        add(document);

        if (pendingBytes >= FLUSH_THRESHOLD) {
          flush();

          yield;
        }
      }
    }

    flush();

    const footer = Buffer.alloc(FOOTER_SIZE);

    footer.writeUInt32BE(checksum, 0);
    END_MAGIC.copy(footer, 4);
    writeAll(fd, footer);
    fsyncSync(fd);
    fdOpen = false;
    closeSync(fd);
    onStage("snapshot-written");
    renameSync(temporary, path);
    syncDirectory(directory);
    done = true;
  } finally {
    if (fdOpen) {
      try {
        closeSync(fd);
      } catch {
        // The file is removed below, so a failed close changes nothing.
      }
    }

    if (!done) {
      unlinkQuietly(temporary);
    }
  }

  onStage("snapshot-renamed");

  return file;
}

/** Writes a snapshot without pausing. */
export function writeCheckpoint(
  directory: string,
  lsn: bigint,
  collections: readonly CheckpointCollection[],
  onStage: (stage: CheckpointStage) => void,
): string {
  const steps = writeCheckpointSteps(directory, lsn, collections, onStage);

  for (;;) {
    const step = steps.next();

    if (step.done === true) {
      return step.value;
    }
  }
}

export function readCheckpoint(path: string): ReadCheckpoint {
  const bytes = readFileSync(path);

  if (bytes.byteLength < HEADER_SIZE + FOOTER_SIZE) {
    throw new CheckpointDamagedError("The snapshot file is too short.");
  }

  const footerStart = bytes.byteLength - FOOTER_SIZE;

  if (!bytes.subarray(footerStart + 4).equals(END_MAGIC)) {
    throw new CheckpointDamagedError(
      "The snapshot file is incomplete: its end marker is missing.",
    );
  }

  if (
    bytes.readUInt32BE(footerStart) !== crc32(bytes.subarray(0, footerStart))
  ) {
    throw new CheckpointDamagedError("The snapshot checksum does not match.");
  }

  if (!bytes.subarray(0, 8).equals(MAGIC)) {
    throw new CheckpointDamagedError("The file is not a SinterDB snapshot.");
  }

  const version = bytes.readUInt32BE(8);

  if (
    version < OLDEST_READABLE_VERSION ||
    version > CHECKPOINT_FORMAT_VERSION
  ) {
    throw new CheckpointDamagedError(
      `The snapshot uses unsupported format version ${version}.`,
    );
  }

  const lsn = bytes.readBigUInt64BE(12);
  const count = bytes.readUInt32BE(20);
  const reader = new SnapshotReader(bytes, footerStart);
  const collections: RecoveredCollection[] = [];

  reader.offset = HEADER_SIZE;

  for (let index = 0; index < count; index += 1) {
    const database = reader.name();
    const collection = reader.name();
    const indexes: IndexSpec[] = [];

    if (version >= 2) {
      const indexCount = reader.u16();

      for (let position = 0; position < indexCount; position += 1) {
        try {
          indexes.push(readIndexSpec(reader));
        } catch (error: unknown) {
          throw new CheckpointDamagedError(
            `The snapshot contains an invalid index definition: ${(error as Error).message}`,
          );
        }
      }
    }

    const documentCount = reader.u32();
    const documents = new Map<string, Uint8Array>();

    for (let item = 0; item < documentCount; item += 1) {
      const key = reader.bytes(ID_BYTE_LENGTH).toString("hex");
      const document = reader.bytes(reader.u32());

      documents.set(key, new Uint8Array(document));
    }

    collections.push({ database, collection, documents, indexes });
  }

  if (reader.offset !== footerStart) {
    throw new CheckpointDamagedError("The snapshot has trailing bytes.");
  }

  return { lsn, collections };
}

class SnapshotReader {
  public offset = 0;

  public constructor(
    private readonly buffer: Buffer,
    private readonly end: number,
  ) {}

  public u8(): number {
    this.require(1);

    const value = this.buffer.readUint8(this.offset);

    this.offset += 1;

    return value;
  }

  public u16(): number {
    this.require(2);

    const value = this.buffer.readUInt16BE(this.offset);

    this.offset += 2;

    return value;
  }

  public u32(): number {
    this.require(4);

    const value = this.buffer.readUInt32BE(this.offset);

    this.offset += 4;

    return value;
  }

  public bytes(length: number): Buffer {
    this.require(length);

    const value = this.buffer.subarray(this.offset, this.offset + length);

    this.offset += length;

    return value;
  }

  public name(): string {
    const length = this.u16();

    if (length === 0) {
      throw new CheckpointDamagedError("The snapshot contains an empty name.");
    }

    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(
        this.bytes(length),
      );
    } catch (error: unknown) {
      if (error instanceof CheckpointDamagedError) {
        throw error;
      }

      throw new CheckpointDamagedError(
        "The snapshot contains a name that is not valid UTF-8.",
      );
    }
  }

  private require(length: number): void {
    if (this.offset + length > this.end) {
      throw new CheckpointDamagedError("The snapshot ends unexpectedly.");
    }
  }
}

function encodeName(name: string): Uint8Array {
  const bytes = Buffer.from(name, "utf8");

  if (bytes.byteLength === 0 || bytes.byteLength > MAX_NAME_BYTE_LENGTH) {
    throw new RangeError(
      `Names must be 1 to ${MAX_NAME_BYTE_LENGTH} bytes of UTF-8.`,
    );
  }

  const encoded = Buffer.alloc(2 + bytes.byteLength);

  encoded.writeUInt16BE(bytes.byteLength, 0);
  encoded.set(bytes, 2);

  return encoded;
}

function writeAll(fd: number, bytes: Uint8Array): void {
  let written = 0;

  while (written < bytes.byteLength) {
    written += writeSync(fd, bytes, written, bytes.byteLength - written);
  }
}

function unlinkQuietly(path: string): void {
  try {
    unlinkSync(path);
  } catch {
    // The file may already be gone.
  }
}
