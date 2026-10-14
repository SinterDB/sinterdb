# Known limitations

SinterDB `0.2.0` is a developer preview. This page lists what it does not do
yet, the hard limits it enforces, and the rough edges you may meet. Tests check
the numbers and the "not supported" lists against the code, so this page stays
true as the code changes. If something here surprises you, please open an
issue.

## Security

- **There is no authentication and no TLS.** Anyone who can open a connection
  to the port can read, change, and delete every database. Keep the server on
  `127.0.0.1` or on a private network behind a firewall. See
  [configuration.md](./configuration.md) and [docker.md](./docker.md).
- **Nothing is encrypted at rest.** The data directory holds plain documents.
- There are no users, roles, or per-database permissions.

## Deployment

- **One server, one machine.** There is no replication, no clustering, no
  sharding, and no failover. If the server is down, your data is unavailable.
- **One server per data directory.** A second server on the same directory
  refuses to start.
- **Backups need the server stopped.** `sinterd backup` works on a closed data
  directory. Use a volume snapshot to back up a running server. See
  [backup.md](./backup.md).
- **Repair works on whole files and log records.** `sinterd repair` can cut a
  damaged log, set aside segments a snapshot already covers and rebuild a
  missing manifest, but it cannot recover records that were lost or repair
  single documents. Keep backups. See [repair.md](./repair.md).
- **Linux is the tested platform.** Continuous integration runs on Linux with
  Node.js 24 and 26. macOS and Windows may work but are not tested, and the
  durability guarantees of the `flushed` write concern depend on the operating system and disk.
- **Node.js 24 or later** is required, for the server and the driver.
- There is no published Docker image yet. Build it from the repository; see
  [docker.md](./docker.md).

## Capacity and performance

- **All data lives in memory.** The data directory makes it durable, but the
  whole dataset must fit in RAM, and recovery briefly needs about twice the
  size of the snapshot it loads.
- **Disk use can reach two to three times the data size**, because the two
  newest snapshots and the log since the older one are kept.
- **One thread does everything.** Reads and writes from all clients, checkpoints,
  and index builds run one after another. A long operation pauses the others:
  creating an index on a large collection, or a checkpoint of a large dataset,
  delays every other client while it runs.
- **Startup time grows with the data.** The server loads the newest snapshot,
  replays the log, and rebuilds every index before it listens.
- **A query that cannot use an index reads every document.** Documents are kept
  in encoded form, so a full scan decodes each one. In the benchmark on a small
  virtual machine, a scan of 20,000 documents took most of a second. Index the
  fields you filter on.
- Sorting is not served by indexes. Results are found first and sorted
  afterwards, so sorting a large result set takes time and memory.

[benchmarks.md](./benchmarks.md) shows what to expect on a small machine.

## Hard limits

| What                              | Limit                              |
| --------------------------------- | ---------------------------------- |
| Database and collection name      | 255 bytes                          |
| One request or response           | 16 MiB                             |
| Nesting inside a document         | 99 levels                          |
| Indexes per collection            | 32, not counting the `_id` index   |
| Index name                        | 127 characters                     |
| `batchSize` of a query            | 1 to 10,000 (the default is 100)   |
| `limit` of a query                | 1 or more                          |
| Idle time before a cursor expires | 10 minutes                         |
| Time to close connections on stop | 5 seconds, then they are destroyed |

Notes:

- A request is the whole message, so an `insertMany` has to fit in 16 MiB
  together. Insert large sets in several calls.
- The protocol allows 100 levels. The request that carries your document uses
  some of them, so a document can contain 98 levels of nested documents inside
  itself.
- A query may match more data than fits in one message. The server splits the
  result into several batches, so `find` and `for await` keep working. A
  result that cannot be split, because one document is too large for a message,
  fails with a `ResultTooLarge` server error. Keep documents far below the
  limit.
- A cursor belongs to the connection that opened it. It is released when it is
  exhausted, closed, expired, or when the connection ends.

When you break a limit that the driver can see, such as a request over 16 MiB
or a document that is too deep, the call fails with a `SinterDocumentError`
(`INVALID_DOCUMENT`) before anything is sent. Limits that only the server
knows, such as the name length, come back as a `SinterServerError`.

## Documents

- **Key order is not preserved.** The database stores the fields of a document
  sorted by name, and returns them in that order. Do not depend on the order
  you wrote them in. Arrays keep their order.
- **Only these values can be stored:** `null`, booleans, numbers, `bigint`,
  strings, `Date`, `Uint8Array`, `CustomId`, arrays, and plain objects.
  Anything else is rejected, including `undefined`, functions, symbols, and
  class instances such as `Map` and `Set`.
- **`undefined` is an error, not a missing field.** Leave a field out instead
  of setting it to `undefined`.
- **`_id` is a `CustomId`.** If you supply one, it has to be a `CustomId`, and
  it cannot be changed afterwards. Plain strings and numbers are not accepted
  as `_id`.
- **Values are compared by their stored form.** `1` and `1n` are different,
  and so are `0` and `-0`. See [query-semantics.md](./query-semantics.md).
- The database does not validate documents against a schema. The type you give
  `collection<T>()` is checked by TypeScript only.

## Queries

Supported filter operators: `$eq`, `$ne`, `$in`, `$nin`, `$exists`, `$not`,
`$gt`, `$gte`, `$lt`, `$lte`, `$elemMatch`, `$size`, `$and`, `$or`, and `$nor`.
How they compare values, and how they treat arrays, is in
[query-semantics.md](./query-semantics.md).

Not supported, and rejected with `DocumentValidationFailed`: `$regex`, `$all`,
`$type`, `$mod`, `$expr`, `$text`, and `$where`.

Also missing:

- **No projection.** A query returns whole documents.
- **No aggregation, no joins, and no `count` or `distinct`.** Count by reading
  the documents, or keep a counter yourself with `$inc`.
- **No full-text, geospatial, or regular-expression search.**
- **A cursor is not a snapshot.** It reads the collection as it goes, so
  documents written while you iterate may or may not show up, and the document
  after the current one may already have been read.
- Compound and multi-field indexes do not exist. Each index covers one field,
  and a query uses at most one index. See [indexes.md](./indexes.md).
- `explain()` is marked `@beta`; its shape may change in any release.

## Updates and transactions

Supported update operators: `$set`, `$unset`, `$inc`, `$min`, `$max`, `$push`,
`$addToSet`, and `$pull`.

Not supported, and rejected with `InvalidUpdate`: `$mul`, `$rename`, `$pop`,
and every other operator. There are no positional operators and no update
pipelines.

- **Each command is atomic. There are no transactions across commands.** An
  `updateMany` or `deleteMany` is applied completely or not at all, and when
  one document cannot be updated, none are. Two separate commands can be
  interleaved with commands from other clients.
- `insertMany` is ordered. When a document fails, the ones before it stay
  inserted, and the `SinterInsertManyError` tells you which.
- There is no `findOneAndUpdate`, no `bulkWrite`, and no change streams.

## Managing data

- **You cannot drop a collection or a database yet.** `deleteMany({})` removes
  every document and leaves the empty collection. To remove everything, stop
  the server and delete the data directory.
- **There is no `createCollection` in the driver.** Collections appear when you
  first insert into them, or create an index on them.
- You cannot rename a collection or a database.
- The only management commands are listing databases, listing collections, and
  creating, listing, validating, and dropping indexes.
- The server logs JSON lines to standard output and has no metrics endpoint.

## The driver

- **One client is one connection.** There is no connection pool. A client runs
  its requests over a single socket.
- **A client does not reconnect.** When the connection is lost, the client
  becomes closed, emits `closed`, and `connect()` rejects with `CLIENT_CLOSED`.
  Create a new `SinterClient`, and get new database and collection handles from
  it, because the old handles belong to the old client.
- Requests that were waiting when the connection broke fail with a
  `SinterConnectionError`. A write that was in flight may or may not have been
  applied; check before you retry it.
- A request that times out (`REQUEST_TIMEOUT`) may still have run on the server.

## Compatibility during the preview

- The driver and the server must speak the same wire protocol version, and a
  mismatch fails the handshake. Upgrade both together.
- Data files are upgraded in place by a newer server and cannot be read by an
  older one. Back up before you upgrade.
- Breaking changes to the API can happen in a minor release, and each comes
  with migration notes. Patch releases never intentionally invalidate data
  files. See [compatibility.md](./compatibility.md).
