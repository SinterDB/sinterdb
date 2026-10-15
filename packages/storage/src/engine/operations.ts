import {
  normalizeIndexSpec,
  type IndexKey,
  type IndexSpec,
} from "../indexing/spec.js";
import { StorageError, StorageErrorCode } from "../errors.js";

export const RecordType = {
  Transaction: 1,
} as const;

export const ID_BYTE_LENGTH = 16;
export const MAX_NAME_BYTE_LENGTH = 65_535;

const OperationKind = {
  CreateCollection: 1,
  Put: 2,
  Delete: 3,
  CreateIndex: 4,
  DropIndex: 5,
} as const;

export type Operation =
  | {
      readonly kind: "createCollection";
      readonly database: string;
      readonly collection: string;
    }
  | {
      readonly kind: "put";
      readonly database: string;
      readonly collection: string;
      readonly id: Uint8Array;
      readonly document: Uint8Array;
    }
  | {
      readonly kind: "delete";
      readonly database: string;
      readonly collection: string;
      readonly id: Uint8Array;
    }
  | {
      readonly kind: "createIndex";
      readonly database: string;
      readonly collection: string;
      readonly index: IndexSpec;
    }
  | {
      readonly kind: "dropIndex";
      readonly database: string;
      readonly collection: string;
      readonly name: string;
    };

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export function encodeOperations(operations: readonly Operation[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const header = Buffer.alloc(4);

  header.writeUInt32BE(operations.length, 0);
  parts.push(header);

  for (const operation of operations) {
    switch (operation.kind) {
      case "createCollection":
        parts.push(
          Uint8Array.of(OperationKind.CreateCollection),
          encodeName(operation.database),
          encodeName(operation.collection),
        );
        break;

      case "put":
        parts.push(
          Uint8Array.of(OperationKind.Put),
          encodeName(operation.database),
          encodeName(operation.collection),
          encodeId(operation.id),
          encodeBytes(operation.document),
        );
        break;

      case "delete":
        parts.push(
          Uint8Array.of(OperationKind.Delete),
          encodeName(operation.database),
          encodeName(operation.collection),
          encodeId(operation.id),
        );
        break;

      case "createIndex":
        parts.push(
          Uint8Array.of(OperationKind.CreateIndex),
          encodeName(operation.database),
          encodeName(operation.collection),
          encodeIndexSpec(operation.index),
        );
        break;

      case "dropIndex":
        parts.push(
          Uint8Array.of(OperationKind.DropIndex),
          encodeName(operation.database),
          encodeName(operation.collection),
          encodeName(operation.name),
        );
        break;
    }
  }

  return Buffer.concat(parts);
}

export function decodeOperations(payload: Uint8Array): Operation[] {
  const reader = new Reader(payload);
  const count = reader.u32();
  const operations: Operation[] = [];

  for (let index = 0; index < count; index += 1) {
    const kind = reader.u8();

    switch (kind) {
      case OperationKind.CreateCollection:
        operations.push({
          kind: "createCollection",
          database: reader.name(),
          collection: reader.name(),
        });
        break;

      case OperationKind.Put:
        operations.push({
          kind: "put",
          database: reader.name(),
          collection: reader.name(),
          id: reader.bytes(ID_BYTE_LENGTH),
          document: reader.bytes(reader.u32()),
        });
        break;

      case OperationKind.Delete:
        operations.push({
          kind: "delete",
          database: reader.name(),
          collection: reader.name(),
          id: reader.bytes(ID_BYTE_LENGTH),
        });
        break;

      case OperationKind.CreateIndex:
        operations.push({
          kind: "createIndex",
          database: reader.name(),
          collection: reader.name(),
          index: readIndexSpec(reader),
        });
        break;

      case OperationKind.DropIndex:
        operations.push({
          kind: "dropIndex",
          database: reader.name(),
          collection: reader.name(),
          name: reader.name(),
        });
        break;

      default:
        throw malformed(`Unknown operation kind ${kind}.`);
    }
  }

  reader.finish();

  return operations;
}

const UNIQUE_FLAG = 1;
const SPARSE_FLAG = 2;
const DESCENDING_FLAG = 4;
const COMPOUND_FLAG = 8;
const KNOWN_FLAGS = UNIQUE_FLAG | SPARSE_FLAG | DESCENDING_FLAG | COMPOUND_FLAG;

/**
 * An index definition is its name, its first field and a flags byte. A
 * single-field index ends there, exactly as in storage format 2. A compound
 * index sets the compound flag and adds the other fields: a count, then each
 * field's name and a direction byte (0 ascending, 1 descending).
 */
export function encodeIndexSpec(spec: IndexSpec): Uint8Array {
  const [first, ...others] = spec.keys as [IndexKey, ...IndexKey[]];
  const flags =
    (spec.unique ? UNIQUE_FLAG : 0) |
    (spec.sparse ? SPARSE_FLAG : 0) |
    (first.direction === -1 ? DESCENDING_FLAG : 0) |
    (others.length > 0 ? COMPOUND_FLAG : 0);
  const parts: Uint8Array[] = [
    encodeName(spec.name),
    encodeName(first.field),
    Uint8Array.of(flags),
  ];

  if (others.length > 0) {
    parts.push(Uint8Array.of(others.length));

    for (const key of others) {
      parts.push(
        encodeName(key.field),
        Uint8Array.of(key.direction === -1 ? 1 : 0),
      );
    }
  }

  return Buffer.concat(parts);
}

export function readIndexSpec(reader: {
  name(): string;
  u8(): number;
}): IndexSpec {
  const name = reader.name();
  const field = reader.name();
  const flags = reader.u8();

  if ((flags & ~KNOWN_FLAGS) !== 0) {
    throw malformed(`An index definition has unknown flags ${flags}.`);
  }

  const keys: [string, 1 | -1][] = [
    [field, (flags & DESCENDING_FLAG) === 0 ? 1 : -1],
  ];

  if ((flags & COMPOUND_FLAG) !== 0) {
    const extra = reader.u8();

    for (let position = 0; position < extra; position += 1) {
      const otherField = reader.name();
      const direction = reader.u8();

      if (direction > 1) {
        throw malformed("An index definition has an unknown key direction.");
      }

      keys.push([otherField, direction === 1 ? -1 : 1]);
    }
  }

  try {
    return normalizeIndexSpec({
      name,
      keys,
      unique: (flags & UNIQUE_FLAG) !== 0,
      sparse: (flags & SPARSE_FLAG) !== 0,
    });
  } catch (error: unknown) {
    throw malformed(
      `An index definition is invalid: ${(error as Error).message}`,
    );
  }
}

export function encodeName(name: string): Uint8Array {
  const bytes = encoder.encode(name);

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

function encodeId(id: Uint8Array): Uint8Array {
  if (id.byteLength !== ID_BYTE_LENGTH) {
    throw new RangeError(`Document ids must be ${ID_BYTE_LENGTH} bytes.`);
  }

  return id;
}

function encodeBytes(bytes: Uint8Array): Uint8Array {
  const encoded = Buffer.alloc(4 + bytes.byteLength);

  encoded.writeUInt32BE(bytes.byteLength, 0);
  encoded.set(bytes, 4);

  return encoded;
}

function malformed(reason: string): StorageError {
  return new StorageError(
    StorageErrorCode.Corruption,
    `A transaction record is malformed: ${reason}`,
  );
}

export class Reader {
  private offset = 0;

  public constructor(private readonly buffer: Uint8Array) {}

  public u8(): number {
    this.require(1);

    const value = this.buffer[this.offset] as number;

    this.offset += 1;

    return value;
  }

  public u16(): number {
    this.require(2);

    const value =
      ((this.buffer[this.offset] as number) << 8) |
      (this.buffer[this.offset + 1] as number);

    this.offset += 2;

    return value;
  }

  public u32(): number {
    this.require(4);

    const view = new DataView(
      this.buffer.buffer,
      this.buffer.byteOffset + this.offset,
      4,
    );

    this.offset += 4;

    return view.getUint32(0, false);
  }

  public bytes(length: number): Uint8Array {
    this.require(length);

    const value = new Uint8Array(
      this.buffer.subarray(this.offset, this.offset + length),
    );

    this.offset += length;

    return value;
  }

  public name(): string {
    const length = this.u16();

    if (length === 0) {
      throw malformed("A name is empty.");
    }

    this.require(length);

    const raw = this.buffer.subarray(this.offset, this.offset + length);

    this.offset += length;

    try {
      return decoder.decode(raw);
    } catch {
      throw malformed("A name is not valid UTF-8.");
    }
  }

  public finish(): void {
    if (this.offset !== this.buffer.byteLength) {
      throw malformed("The record has trailing bytes.");
    }
  }

  private require(length: number): void {
    if (this.offset + length > this.buffer.byteLength) {
      throw malformed("The record ends unexpectedly.");
    }
  }
}
