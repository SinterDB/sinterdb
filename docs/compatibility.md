# Compatibility and versioning

SinterDB is pre-1.0, and `0.x` releases can still change. From `0.1.0` onward
the project makes the promises on this page, so that a developer preview is
something you can build a real local project on.

The short version:

- **Patch releases (`0.1.x`)** fix bugs. They do not change the public API, the
  wire protocol, or the on-disk format, and they never intentionally make an
  existing data directory unreadable.
- **Minor releases (`0.x.0`)** may make breaking changes. Every breaking change
  is listed under [Migration notes](#migration-notes) with what to do about it.
- **Your data is never read wrongly.** A server that does not understand a data
  directory refuses to open it with a clear error. It does not guess.

## Format versions

These are the versions of the formats SinterDB reads and writes today. A test
checks this table against the code, so a release cannot change a format without
this page changing too.

| Format                   | Constant                    | Version |
| ------------------------ | --------------------------- | ------- |
| Wire protocol            | `PROTOCOL_VERSION`          | 1       |
| Storage directory        | `STORAGE_FORMAT_VERSION`    | 3       |
| Snapshot (checkpoint)    | `CHECKPOINT_FORMAT_VERSION` | 3       |
| Write-ahead log segments | `WAL_FORMAT_VERSION`        | 1       |

## Data files

- A server opens data directories written by any release from `0.0.8` on.
  Older directories are upgraded in place when first opened, before anything is
  written. The manifest records `upgradedFrom` and `upgradedAt`.
- **Upgrades are one way.** After an upgrade, an older server refuses the
  directory with an "Upgrade" error instead of ignoring data it does not
  understand. Copy the data directory before upgrading across a storage format
  change (stop the server first, then copy the whole directory).
- Patch releases never change a format version.
- A minor release that changes a format version says so in its release notes and
  in [Migration notes](#migration-notes), and either upgrades in place or gives
  explicit steps.
- A damaged or unrecognised file is reported with its path and offset. It is
  never skipped silently.

## Wire protocol

- A driver and a server talk only if their `PROTOCOL_VERSION` is equal. The
  handshake checks it, and a mismatch fails with `UnsupportedProtocolVersion`
  (wire code 1001) on the server or `SinterCompatibilityError` in the driver.
- Within one protocol version, commands and optional fields can be added but
  never removed or changed. A new driver calling a command an older server does
  not have gets `UnknownCommand` (wire code 1003). Run a driver and a server
  from the same minor release when you can.
- Raising `PROTOCOL_VERSION` is a breaking change and needs a minor release.
- Wire error codes are never renumbered or reused. New codes are added.

## The `sinterdb` driver API

The public API is what `sinterdb` exports. The list is recorded in
`packages/driver/etc/sinterdb.api.md`, and CI fails when it changes without that
file being updated, so every change to the public surface shows up in review.

Covered by the promise:

- Classes, functions, constants, and types exported from `sinterdb`, including
  the TypeScript types that appear in their signatures. Removing or renaming
  one, or changing what it does, is a breaking change.
- `SinterErrorCode` string values and the error class hierarchy.
- The [connection-string format](./connection-strings.md). A string that works
  today keeps working. Reserved parts (credentials, query parameters,
  fragments) are rejected today and may gain a meaning in a later release.
- Result shapes returned by CRUD, cursor, and index methods.

Not covered:

- **Anything marked `@beta`**, such as `explain()` and its result type. It can
  change in any release. Release notes mention changes.
- Error message text. Match on the error class or code.
- Type-level helper types (for example `FilterPaths`). Their names are public,
  but we may refine what they accept as TypeScript improves. Changes that make
  correct code stop compiling are treated as breaking.
- Performance characteristics.
- Anything imported from a path other than the package root.

### Building on the driver

A library built on `sinterdb`, such as an ODM, gets the promises above and
should follow these rules:

- **Import from `sinterdb` only.** The package `exports` map exposes nothing but
  the root, so a deep import such as `sinterdb/dist/client.js` fails. `CustomId`
  and `Document` are re-exported from the root, so a library does not need to
  import `sinterdb-protocol`.
- **Treat `SinterCompatibilityError` as "this server is too old".** When a
  server lacks a capability (`projection`, `compound-indexes`, `aggregation`,
  or `query-budgets`), the driver refuses the call before sending it. Check
  `client.serverInfo?.capabilities` if you want to decide earlier.
- **Match errors on class and code**, not on message text. Every driver error
  extends `SinterError`, and `SinterErrorCode` values are stable.
- **Avoid `executeCommand` unless you must.** It sends any command and returns
  the raw result. The driver promises the method, but the commands and result
  shapes it carries follow the [wire protocol](./protocol/wire-protocol-v1.md)
  and may gain fields.
- **Do not depend on `@beta` members** (see above).

`packages/driver/src/odm-contract.integration.test.ts` is a model layer written
the way an ODM would write one, using only the public exports. It runs on every
build, so a change that would break such a library fails CI.

Driver releases support Node.js 24 and later. Dropping a Node.js version is a
breaking change.

## Other packages

| Package                | Promise                                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sinterdb`             | The driver API above.                                                                                                                                                                   |
| `@sinterdb/cli`        | The `sinterd` command-line flags, environment variables, and exit codes, as listed in [configuration.md](./configuration.md). The format of log lines is for people and is not covered. |
| `sinterdb-protocol`    | Low-level wire codec. It follows `PROTOCOL_VERSION`: breaking changes ship in a minor release, and most applications never import it.                                                   |
| `@sinterdb-internal/*` | Internal. Not published and not covered.                                                                                                                                                |

## Migration notes

Each breaking change lands here in the release that makes it.

### 0.3.0

- **Storage format 2 became 3** so an index can cover several fields.
  Directories are upgraded in place on first open, and the upgrade is one way:
  `0.2.0` refuses a format 3 directory. Nothing is rewritten, because format 2
  files are read as they are. Copy your data directory before moving from
  `0.2.0`.
- **Compound indexes need a 0.3.0 server.** The server advertises a new
  `compound-indexes` capability. A 0.3.0 driver refuses to send a `keys` index
  definition to a server without it (`SinterCompatibilityError`). A `0.2.0`
  driver can still list the indexes of a collection that has a compound one,
  but sees only the first field of it, because `field` and `direction` describe
  the first key. Do not drop and recreate such an index from a `0.2.0` driver.
- **`IndexInfo` has a new `keys` property** with every field of the index, and
  `ExplainResult` gains optional `fields` and `prefixLength`. Existing code that
  reads `field` and `direction` keeps working.
- **Aggregation needs a 0.3.0 server.** The server advertises a new
  `aggregation` capability and an `aggregate` command with the stages `$match`,
  `$project`, `$sort`, `$skip`, `$limit`, `$count` and `$group`. A 0.3.0 driver
  refuses to send a pipeline to a server without it
  (`SinterCompatibilityError`). The driver exports `AggregateCursor` and the
  `AggregationStage`, `AggregateOptions`, `GroupSpecification`,
  `GroupAccumulator` and `GroupValue` types. Nothing that worked before
  changes.
- **Query budgets need a 0.3.0 server.** The server advertises a new
  `query-budgets` capability and accepts `maxTimeMS` and `maxScanned` on its
  query commands, with two new wire errors, `OperationTimeLimitExceeded` (7000)
  and `ScanLimitExceeded` (7001). A 0.3.0 driver refuses to send a limit to a
  server without the capability (`SinterCompatibilityError`). The driver exports
  the `QueryBudgetOptions` type. `countDocuments()` and `distinct()` take an
  options argument after their filter. Nothing that worked before changes.
- **Projection needs a 0.3.0 server.** The server advertises a new `projection`
  capability. A 0.3.0 driver refuses to send a projection to a server without
  it (`SinterCompatibilityError`) instead of getting whole documents back.
  Queries without a projection work against any server of the same protocol
  version. The protocol version is still 1 and data files are unchanged.
- **A query result may not contain `_id`.** With `projection: { _id: 0 }` the
  returned documents have no `_id`. The result type says so, but code that reads
  `_id` from a cursor of projected documents needs to allow for it.
- **`countDocuments`, `estimatedDocumentCount` and `distinct` need a 0.3.0
  server.** They use the new `count` and `distinct` commands, which an older
  server answers with `UnknownCommand` (a `SinterServerError`).
- **An invalid filter is always an error.** Before, `find` and `findOne` on a
  collection that did not exist returned nothing for a filter such as
  `{ a: { $nope: 1 } }`. They now fail with `DocumentValidationFailed`, like
  every other command that takes a filter.

### 0.2.0

- **Write concerns replace durability modes.** `--write-concern <level>` and
  `SINTERDB_WRITE_CONCERN` take `flushed` (the old `fsync`, still the default),
  `journaled` (the old `buffered`) or `memory`. `--durability` and
  `SINTERDB_DURABILITY` keep working with the old names, but they are
  deprecated and setting both an old and a new option is an error. The
  `server.started` log line reports `writeConcern` instead of `durability`.
  Data files are unchanged.
- **Log lines look different on a terminal.** When standard output and
  standard error are both terminals, the server prints readable, colored log
  entries instead of JSON. Anything that reads the log from a file, a pipe or
  `docker logs` without a terminal still gets one JSON object per line.
- **Storage format version 2 is unchanged.** A 0.1.0 data directory opens as it
  is. New files appear next to the old ones only when you use the new
  commands: a `quarantine` folder after `sinterd repair`, and `backup.json`
  inside a backup.

### 0.1.0

- **The CLI package is `@sinterdb/cli`.** Earlier GitHub release tarballs named
  it `sinterdb-server`. Install it with `npm install -g @sinterdb/cli`. The
  executable is still `sinterd`. The name `sinterdb-server` that the server
  reports in the handshake is a protocol identifier and did not change.
- **The driver's public API is now an explicit list.** These helpers were
  exported by accident and are no longer public: `parseSinterConnectionString`,
  `parseCreateIndexResult`, `parseIndexList`, `parseExplainResult`,
  `parseIndexValidation`, `DRIVER_PRODUCT`, and `DRIVER_PRODUCT_VERSION`. Use
  `new SinterClient(connectionString)` and read `client.target` for the parsed
  host, port, and database.
- **Connection strings are stricter.** These were accepted before and are now
  rejected with `SinterConnectionStringError`: an empty `?` or `#`, whitespace
  inside the string, and a non-ASCII host name (the driver would have tried to
  resolve a percent-encoded name that cannot exist). See
  [connection-strings.md](./connection-strings.md).
- **A document the database cannot store throws `SinterDocumentError`.** A
  value such as `undefined`, a function, or a `Map`, a document nested too
  deeply, or a request over 16 MiB used to fail with a connection error
  (`CONNECTION_FAILED`) that did not say what was wrong. It now rejects with
  `SinterDocumentError` (`INVALID_DOCUMENT`), sends nothing, and leaves the
  connection usable. Code that matched on `CONNECTION_FAILED` for this case
  should match `INVALID_DOCUMENT`.
- **A cursor batch can hold fewer documents than `batchSize`.** A batch stops
  at about 8 MiB, so large documents arrive in smaller batches. Iterating a
  cursor is unaffected. A result that is still too large for one reply gets a
  `ResultTooLarge` error instead of stopping the server.
- **Warnings and errors are written to standard error.** The server used to
  write every log line to standard output. Other lines still go to standard
  output. Tools that read only standard output no longer see warnings and errors.
- No data or protocol format changed. Storage format 2, snapshot format 2, WAL
  format 1, and protocol 1 are the same as in `0.0.9`.

### 0.0.9

- **Storage format 1 became 2** to store index definitions. Directories are
  upgraded in place on first open, and the upgrade is one way: `0.0.8` refuses a
  format 2 directory. Copy your data directory before moving from `0.0.8`.
