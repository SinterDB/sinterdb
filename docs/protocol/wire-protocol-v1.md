# SinterDB Wire Protocol Version 1

Status: Experimental  
Protocol version: `1`  
Introduced by: SinterDB `0.0.2`

> [!WARNING]
> Protocol version 1 is under active development and may change before
> SinterDB reaches a stable release.

## 1. Conventions

The terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY**
describe protocol requirements.

All multibyte numeric values use big-endian network byte order.

Sizes and offsets are measured in bytes.

## 2. Transport

Protocol version 1 uses TCP.

TCP does not preserve application message boundaries. A receiver MUST support:

- Headers split across multiple TCP chunks
- Payloads split across multiple TCP chunks
- Multiple complete frames in one TCP chunk
- A complete frame followed by part of another frame

A receiver MUST buffer incomplete frames until enough bytes are available.

## 3. Frame Format

Every message is contained in a binary frame with a fixed 16-byte header.

| Offset | Size | Type   | Field            |
| -----: | ---: | ------ | ---------------- |
|      0 |    4 | Bytes  | Magic signature  |
|      4 |    2 | UInt16 | Protocol version |
|      6 |    1 | UInt8  | Message kind     |
|      7 |    1 | UInt8  | Flags            |
|      8 |    4 | UInt32 | Request ID       |
|     12 |    4 | UInt32 | Payload length   |
|     16 |    N | Bytes  | Encoded payload  |

### 3.1 Magic signature

The first four bytes MUST contain ASCII `SNTR`:

```text
53 4e 54 52
```

A receiver MUST reject any other signature.

### 3.2 Protocol version

The initial protocol version is:

```text
00 01
```

A receiver MUST reject unsupported protocol versions with a specific protocol
error.

Package versions and wire-protocol versions are independent.

### 3.3 Message kinds

| Value  | Name         | Purpose                                           |
| ------ | ------------ | ------------------------------------------------- |
| `0x01` | `Handshake`  | Client/server identity and capability negotiation |
| `0x02` | `Ping`       | Connection health request                         |
| `0x03` | `Command`    | Database operation request                        |
| `0x04` | `Result`     | Successful non-streamed result                    |
| `0x05` | `StreamItem` | One item in a streamed result                     |
| `0x06` | `StreamEnd`  | Successful completion of a streamed result        |
| `0x07` | `Error`      | Failed request or connection-level failure        |

Unknown message kinds MUST be rejected.

### 3.4 Flags

| Bit | Value  | Name   | Meaning                                   |
| --: | ------ | ------ | ----------------------------------------- |
|   0 | `0x01` | `More` | Additional correlated frames are expected |

A flags value of `0x00` means no flags are active.

All currently undefined flag bits MUST be zero. A receiver MUST reject frames
containing unsupported flag bits.

`More` is advisory for streamed responses. A `StreamEnd` message remains the
authoritative end of a streamed response.

### 3.5 Request IDs

Request IDs are unsigned 32-bit integers.

- `0` is reserved for uncorrelated or connection-level messages.
- Generated request IDs range from `1` through `4294967295`.
- After `4294967295`, a generator wraps to `1`.
- Responses MUST use the request ID of their corresponding request.
- Concurrent requests on one connection MUST use distinct active IDs.

A driver MUST NOT reuse an ID while a request with that ID is still active.

### 3.6 Payload length

Payload length is the number of bytes following the frame header.

The maximum payload length is `16,777,216` bytes (16 MiB). Therefore, the
maximum complete frame length is `16,777,232` bytes.

A receiver MUST reject payload declarations larger than this limit before
waiting for the payload body.

A standalone frame decoder MUST reject unexpected trailing bytes. An
incremental stream decoder MAY treat trailing bytes as the beginning of the
next frame.

## 4. Document Encoding

Message payloads use the SinterDB typed binary document encoding.

Every encoded value begins with a one-byte type tag.

| Tag    | Name     | Encoded data                                  |
| ------ | -------- | --------------------------------------------- |
| `0x00` | Null     | No additional bytes                           |
| `0x01` | False    | No additional bytes                           |
| `0x02` | True     | No additional bytes                           |
| `0x03` | Int32    | Signed 32-bit integer                         |
| `0x04` | Int64    | Signed 64-bit safe JavaScript integer         |
| `0x05` | Float64  | IEEE 754 binary64                             |
| `0x06` | BigInt64 | Signed 64-bit bigint                          |
| `0x07` | String   | UInt32 byte length followed by UTF-8          |
| `0x08` | Binary   | UInt32 byte length followed by raw bytes      |
| `0x09` | DateTime | Signed 64-bit Unix epoch milliseconds         |
| `0x0a` | Array    | UInt32 item count followed by encoded values  |
| `0x0b` | Document | UInt32 field count followed by encoded fields |
| `0x0c` | CustomId | 16-byte SinterDB document identifier          |

Unknown type tags MUST be rejected.

### 4.1 Numbers

JavaScript numbers are encoded using these rules:

1. An integer within the signed 32-bit range uses `Int32`.
2. Any other safe integer uses `Int64`.
3. All remaining numbers use `Float64`.

`Float64` includes:

- Fractional values
- Positive and negative infinity
- Negative zero
- `NaN`

Encoders MUST emit the canonical quiet-NaN representation:

```text
7f f8 00 00 00 00 00 00
```

Decoders MAY accept other valid IEEE 754 NaN representations.

An `Int64` value outside JavaScript’s safe-integer range MUST be rejected.
Applications requiring the full signed 64-bit range MUST use `BigInt64`.

### 4.2 Bigints

A bigint MUST fit within the signed 64-bit range:

```text
-9223372036854775808 through 9223372036854775807
```

Values outside this range MUST be rejected.

`BigInt64` decodes to JavaScript `bigint`, while `Int32` and `Int64` decode to
JavaScript `number`.

### 4.3 Strings

Strings use well-formed UTF-8.

Their encoding is:

| Size | Field                       |
| ---: | --------------------------- |
|    4 | UTF-8 byte length as UInt32 |
|    N | UTF-8 bytes                 |

Strings and document keys containing unpaired UTF-16 surrogates MUST be
rejected because they cannot round-trip through UTF-8 without modification.

Unicode normalization is not performed. Canonically equivalent strings remain
distinct unless an application normalizes them before encoding.

Invalid UTF-8 MUST be rejected while decoding.

### 4.4 Binary data

Binary data is encoded as:

| Size | Field                 |
| ---: | --------------------- |
|    4 | Byte length as UInt32 |
|    N | Raw bytes             |

Binary values decode to `Uint8Array`.

### 4.5 Dates

Dates are encoded as signed 64-bit Unix epoch milliseconds.

Invalid JavaScript `Date` values and decoded dates outside the JavaScript date
range MUST be rejected.

Dates decode to JavaScript `Date`.

### 4.6 Arrays

Arrays are encoded as:

| Size | Field                      |
| ---: | -------------------------- |
|    4 | Item count as UInt32       |
|    N | Consecutive encoded values |

Array order is preserved.

### 4.7 Documents

Documents are encoded as:

| Size | Field                 |
| ---: | --------------------- |
|    4 | Field count as UInt32 |
|    N | Consecutive fields    |

Each field is encoded as:

|     Size | Field                     |
| -------: | ------------------------- |
|        4 | Key byte length as UInt32 |
|        N | UTF-8 key bytes           |
| Variable | Encoded value             |

Encoders MUST sort fields lexicographically by their encoded UTF-8 key bytes.
This provides deterministic output across programming languages.

Decoders MUST reject duplicate keys.

Only plain objects are valid documents. Functions, symbols, `undefined`,
custom class instances, and other unsupported values MUST be rejected.

Cyclic arrays and documents MUST be rejected. Repeated non-cyclic values MAY
be encoded independently.

### 4.8 Custom identifiers

A `CustomId` is encoded as exactly 16 bytes:

| Size | Field                                      |
| ---: | ------------------------------------------ |
|    6 | Unsigned Unix epoch timestamp milliseconds |
|   10 | Cryptographically random bytes             |

The timestamp uses big-endian byte order.

The canonical text representation is a lowercase, 32-character hexadecimal
string. Text parsing MAY accept uppercase hexadecimal character, but string
serialization MUST produce lowercase characters.

Binary decoding MUST preserve all 16 identifier bytes exactly.

### 4.9 Nesting limit

The maximum document and array nesting depth is `100`.

Values exceeding that depth MUST be rejected by both encoders and decoders.

### 4.10 Complete-value requirement

A standalone value decoder MUST consume the complete provided byte sequence.

Unexpected trailing bytes, incomplete values, invalid lengths, and unknown
tags MUST produce specific protocol errors.

## 5. Message Payloads

Every frame payload MUST contain a top-level encoded document.

Receivers MAY ignore unknown fields whose values use supported document types.
This permits compatible protocol extensions.

### 5.1 Handshake

| Field             | Type                     | Required | Description                            |
| ----------------- | ------------------------ | -------- | -------------------------------------- |
| `role`            | String                   | Yes      | `client` or `server`                   |
| `protocolVersion` | UInt16-compatible number | Yes      | Requested or accepted protocol version |
| `product`         | Non-empty string         | Yes      | Product identifier                     |
| `productVersion`  | Non-empty string         | Yes      | Product package version                |
| `capabilities`    | String array             | Yes      | Supported capability identifiers       |

Initial known capabilities are:

- `typed-documents`
- `streaming`
- `projection`: the server understands the optional `projection` parameter of
  `find` and `findOne`. A server without it ignores the parameter and returns
  whole documents, so clients MUST NOT send a projection to such a server.
- `compound-indexes`: the server understands the `keys` option of `createIndex`. A server without it rejects the option as unknown, and clients SHOULD NOT send it.
- `aggregation`: the server understands the `aggregate` command. A server without it answers `UnknownCommand`.
- `query-budgets`: the server understands the optional `maxTimeMS` and `maxScanned` parameters of `find`, `findOne`, `aggregate`, `count`, `distinct` and `getMore`. A server without it ignores them, so clients MUST NOT send them to such a server.

Unknown capability strings MUST be preserved during decoding and MAY be
ignored when determining the negotiated feature set.

### 5.2 Ping

| Field    | Type     | Required |
| -------- | -------- | -------- |
| `sentAt` | DateTime | Yes      |

A successful ping receives a `Result` using the same request ID.

### 5.3 Command

| Field        | Type             | Required | Description                 |
| ------------ | ---------------- | -------- | --------------------------- |
| `command`    | Non-empty string | Yes      | Command name                |
| `database`   | Non-empty string | No       | Target logical database     |
| `parameters` | Document         | Yes      | Command-specific parameters |

An omitted optional field MUST not be encoded as `undefined`.

### 5.4 Result

| Field   | Type                | Required |
| ------- | ------------------- | -------- |
| `value` | Any supported value | Yes      |

### 5.5 Stream item

| Field      | Type                      | Required |
| ---------- | ------------------------- | -------- |
| `sequence` | Non-negative safe integer | Yes      |
| `value`    | Any supported value       | Yes      |

Sequence numbers begin at `0` and increase by one for each item in the same
stream.

### 5.6 Stream end

| Field   | Type                      | Required |
| ------- | ------------------------- | -------- |
| `count` | Non-negative safe integer | Yes      |

`count` is the total number of emitted stream items.

### 5.7 Error

| Field       | Type                     | Required |
| ----------- | ------------------------ | -------- |
| `code`      | UInt32-compatible number | Yes      |
| `name`      | Non-empty string         | Yes      |
| `message`   | Non-empty string         | Yes      |
| `retryable` | Boolean                  | Yes      |
| `details`   | Document                 | No       |

Unknown numeric wire error codes MUST remain decodable so newer servers can
communicate with older clients.

### 5.8 Command reference

Commands are sent in a Command payload (section 5.3) and answered with a Result
payload (section 5.4). Commands marked "database" require the `database` field.
Database and collection names are created on first write.

| Command            | Database | Parameters                                                                          | Result                                                         |
| ------------------ | -------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `serverInfo`       | No       | none                                                                                | `product`, `productVersion`, `protocolVersion`, `capabilities` |
| `listDatabases`    | No       | none                                                                                | `databases`: array of names                                    |
| `createCollection` | Yes      | `name`                                                                              | `database`, `collection`, `created`                            |
| `listCollections`  | Yes      | none                                                                                | `database`, `collections`: array of names                      |
| `insertOne`        | Yes      | `collection`, `document`                                                            | `acknowledged`, `insertedId`                                   |
| `insertMany`       | Yes      | `collection`, `documents`                                                           | `acknowledged`, `insertedCount`, `insertedIds`                 |
| `findOne`          | Yes      | `collection`, `filter`, optional `projection`                                       | `document`: document or `null`                                 |
| `find`             | Yes      | `collection`, `filter`, optional `batchSize`, `sort`, `skip`, `limit`, `projection` | `cursorId` (number or `null`), `documents`                     |
| `count`            | Yes      | `collection`, `filter`                                                              | `count`: non-negative integer                                  |
| `distinct`         | Yes      | `collection`, `field`, `filter`                                                     | `values`: array                                                |
| `aggregate`        | Yes      | `collection`, `pipeline`, optional `batchSize`                                      | `cursorId` (number or `null`), `documents`                     |
| `getMore`          | Yes      | `cursorId`, optional `batchSize`                                                    | `cursorId` (number or `null`), `documents`                     |
| `closeCursor`      | Yes      | `cursorId`                                                                          | `closed`: boolean                                              |
| `replaceOne`       | Yes      | `collection`, `filter`, `replacement`, optional `upsert`                            | `acknowledged`, `matchedCount`, `modifiedCount`, `upsertedId`  |
| `updateOne`        | Yes      | `collection`, `filter`, `update`, optional `upsert`                                 | `acknowledged`, `matchedCount`, `modifiedCount`, `upsertedId`  |
| `updateMany`       | Yes      | `collection`, `filter`, `update`, optional `upsert`                                 | `acknowledged`, `matchedCount`, `modifiedCount`, `upsertedId`  |
| `deleteOne`        | Yes      | `collection`, `filter`                                                              | `acknowledged`, `deletedCount`                                 |
| `deleteMany`       | Yes      | `collection`, `filter`                                                              | `acknowledged`, `deletedCount`                                 |
| `createIndex`      | Yes      | `collection`, `index`                                                               | `acknowledged`, `name`, `created`                              |
| `dropIndex`        | Yes      | `collection`, `name`                                                                | `acknowledged`                                                 |
| `listIndexes`      | Yes      | `collection`                                                                        | `indexes`: array of index definitions                          |
| `explain`          | Yes      | `collection`, `filter`                                                              | the query plan, see below                                      |
| `validateIndexes`  | Yes      | `collection`                                                                        | `valid`, `indexes`, `documents`, `issues`                      |

Notes:

- `sort` is an ordered array of `[path, direction]` pairs where direction is
  `1` or `-1`. An array is used because document key order is not preserved on
  the wire.
- `projection` is a document of field paths mapped to `1`/`true` (keep only
  these fields) or `0`/`false` (keep everything but these fields). It is
  applied to each result after sorting, skipping, and limiting, and only
  servers that advertise the `projection` capability understand it. The rules
  are in `docs/query-semantics.md`. An invalid projection returns
  `DocumentValidationFailed` with `details.storageErrorCode` set to
  `INVALID_FIND_OPTIONS`, like an invalid `sort`. Result documents carry `_id`
  unless the projection excludes it, so clients must not assume it is
  present.
- `aggregate` runs `pipeline`, an array of stage documents, and returns a cursor
  batch like `find`, which `getMore` and `closeCursor` continue. Each stage is a
  document with one key: `$match` (a filter), `$project` (a projection), `$sort`
  (an array of `[path, direction]` pairs, as for `find`), `$skip`, `$limit`, or
  `$count` (a field name), or `$group` (a document with an `_id` and
  accumulators; see [aggregation](../aggregation.md)). A pipeline has at most 32
  stages. An invalid pipeline
  returns `DocumentValidationFailed` with `details.storageErrorCode` set to
  `INVALID_PIPELINE`, or to the code of the filter, projection or sort that was
  invalid, even when the collection does not exist. A `pipeline` that is not an
  array of documents returns `InvalidRequest`. Result documents may lack `_id`.
  Only servers that advertise the `aggregation` capability understand it.
- `count` counts the documents that match `filter`; an empty filter counts the
  whole collection without reading it. `distinct` returns the distinct values of
  `field` among the matching documents, in sort order, with the elements of any
  array standing in for the array. Both treat a missing collection as empty and
  still reject an invalid `filter`. The rules are in `docs/query-semantics.md`.
  An invalid `field` returns `DocumentValidationFailed` with
  `details.storageErrorCode` set to `INVALID_FIND_OPTIONS`. A result larger than
  one message returns `ResultTooLarge`. A server that predates these commands
  answers `UnknownCommand`.
- `find`, `findOne`, `aggregate`, `count`, `distinct` and `getMore` accept two
  optional budget parameters, `maxTimeMS` and `maxScanned`, each an integer of at
  least 1 (anything else returns `InvalidRequest`, even for a collection that
  does not exist). `maxScanned` is the most documents the command may examine,
  and `maxTimeMS` the most time it may take, measured from when the server
  starts the command. A command that passes one fails with
  `OperationTimeLimitExceeded` or `ScanLimitExceeded`, with
  `details.storageErrorCode` set to `OPERATION_TIME_LIMIT_EXCEEDED` or
  `SCAN_LIMIT_EXCEEDED`. A cursor's budget is per command: `getMore` uses the
  limits it carries, or none, and a `getMore` that fails closes the cursor.
  Only servers that advertise the `query-budgets` capability understand them.
- An invalid `filter` is rejected with `DocumentValidationFailed` whether or not
  the collection exists, for every command that takes one.
- `skip` is a non-negative integer. `limit` is a positive integer. `batchSize`
  is an integer from 1 to 10,000.
- A `cursorId` of `null` means the result set is exhausted and no cursor
  remains. Cursors belong to the connection that opened them, expire after ten
  minutes without use, and are released when the connection closes. Using an
  unknown cursor returns `CursorNotFound`.
- `upsertedId` is `null` unless a document was inserted.
- `updateMany` is all-or-nothing: if any matched document cannot be updated,
  no document is changed.
- Updates may only contain `$set`, `$unset`, `$inc`, `$min`, `$max`, `$push`,
  `$pull`, and `$addToSet`. Any other update document returns `InvalidUpdate`.
  A change to `_id` returns `ImmutableId`.
- When a server with durable storage cannot record a write, it returns
  `InternalError` (9000). If the disk is full or the server may not write to its
  data directory, `details.storageErrorCode` is `DISK_FULL` or
  `PERMISSION_DENIED` and the write was not applied. For any other failure the
  outcome of that write is unknown until the server restarts and recovers.
- `createIndex` takes an `index` document with either `field` and the optional
  `direction` (`1` or `-1`), or `keys` (an array of `[field, direction]` pairs
  for a compound index, from one to eight), and the optional `unique`,
  `sparse`, and `name`. Giving both `field` and `keys` is `InvalidIndex`. Unknown options
  return `InvalidRequest`. An invalid definition returns `InvalidIndex`, a
  definition that conflicts with an existing index returns `IndexConflict`, and
  a unique index that existing documents violate returns `DuplicateKey`. It
  creates the collection if it does not exist, and `created` is `false` when an
  identical index already exists.
- `dropIndex` returns `IndexNotFound` for an unknown index or collection and
  `InvalidIndex` for the `_id_` index.
- Each entry of `listIndexes` has `name`, `field`, `direction`, `keys`,
  `unique`, and `sparse`. `field` and `direction` are the first key. `keys` is
  an array of documents with `field` and `direction`, one for each indexed
  field. A server older than 0.3.0 sends no `keys`. The `_id_` index is first, followed by the others in creation order.
  A collection that does not exist has no indexes.
- `explain` returns `stage` (`COLLSCAN`, `IDLOOKUP`, or `IXSCAN`),
  `estimatedCandidates`, and `documents`. For an index it also returns `index`,
  `field`, and `access` (`equality`, `in`, or `range`), and for a range `lower`
  and `upper` documents with `value` and `inclusive`. For a compound index it
  adds `fields` (every field in order) and `prefixLength` (how many leading
  fields the query fixes), and `field` is the first one. The plan format is
  experimental.
- `validateIndexes` returns `issues`, an array of documents with `index`,
  `problem`, and `detail`. A collection that does not exist is valid.
- A write that violates a unique index returns `DuplicateKey` with the index
  name in the message. `insertMany` reports `failedIndex` and `insertedCount` in
  the error details.
- `updateOne`, `updateMany`, `replaceOne`, `deleteOne`, and `deleteMany` do not
  create a collection. `updateOne`, `updateMany`, and `replaceOne` create it
  only when `upsert` is `true` and a document is inserted.

## 6. Wire Error Codes

Local codec failures use string-based `ProtocolErrorCode` values. Errors sent
across a connection use numeric `WireErrorCode` values.

### 6.1 Protocol and request errors

| Code | Name                         |
| ---: | ---------------------------- |
| 1000 | `InvalidRequest`             |
| 1001 | `UnsupportedProtocolVersion` |
| 1002 | `UnsupportedCapability`      |
| 1003 | `UnknownCommand`             |
| 1004 | `RequestTimeout`             |

### 6.2 Authentication and authorization errors

| Code | Name                     |
| ---: | ------------------------ |
| 2000 | `AuthenticationRequired` |
| 2001 | `AuthenticationFailed`   |
| 2002 | `PermissionDenied`       |

### 6.3 Namespace errors

| Code | Name                |
| ---: | ------------------- |
| 3000 | `NamespaceNotFound` |
| 3001 | `NamespaceConflict` |

### 6.4 Document and write errors

| Code | Name                       |
| ---: | -------------------------- |
| 4000 | `DocumentValidationFailed` |
| 4001 | `DuplicateKey`             |
| 4002 | `InvalidUpdate`            |
| 4003 | `ImmutableId`              |

### 6.5 Cursor errors

| Code | Name             |
| ---: | ---------------- |
| 5000 | `CursorNotFound` |

### 6.6 Index errors

| Code | Name            |
| ---: | --------------- |
| 6000 | `InvalidIndex`  |
| 6001 | `IndexNotFound` |
| 6002 | `IndexConflict` |

### 6.7 Query budget errors

| Code | Name                         |
| ---: | ---------------------------- |
| 7000 | `OperationTimeLimitExceeded` |
| 7001 | `ScanLimitExceeded`          |

### 6.8 Internal errors

| Code | Name            |
| ---: | --------------- |
| 9000 | `InternalError` |

Published numeric codes MUST NOT be reassigned to different meanings.

## 7. Response Behavior

A request produces one of the following:

- One `Result`
- One `Error`
- Zero or more `StreamItem` messages followed by one `StreamEnd`
- Zero or more `StreamItem` messages followed by one `Error`

All correlated response frames MUST use the originating request ID.

A connection-level `Error` MAY use request ID `0`.

## 8. Invalid Input

A receiver MUST reject at least the following:

- Invalid magic signatures
- Unsupported protocol versions
- Unknown message kinds
- Unsupported flag bits
- Oversized payload declarations
- Incomplete frames when the input stream ends
- Payload-length mismatches
- Unknown document tags
- Invalid UTF-8
- Unsafe `Int64` values
- Invalid dates
- Duplicate document keys
- Excessive nesting
- Invalid message envelope fields
- Unexpected bytes after a standalone frame or value

A server SHOULD close a connection after an unrecoverable framing error because
the next valid frame boundary may no longer be known.

## 9. Golden Fixtures

Canonical protocol fixtures are stored at:

```text
packages/protocol/fixtures/protocol-v1.json
```

Their JSON Schema is stored at:

```text
packages/protocol/schemas/golden-fixtures.schema.json
```

Implementations SHOULD verify their encoders and decoders against these
fixtures.

Changing existing golden bytes requires either:

- A compatible correction with documented migration impact, or
- A new wire-protocol version

## 10. Compatibility

Protocol changes that alter frame interpretation, type tags, canonical bytes,
or required envelope fields require a new protocol version.

Adding optional envelope fields, new capability strings, or new numeric error
codes does not necessarily require a new protocol version when older
implementations can safely ignore them.
