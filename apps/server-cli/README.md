# @sinterdb/cli

Command-line server for SinterDB. The package installs the `sinterd` executable.

> [!WARNING]
> SinterDB is under active development and is not ready for production data. Without `--data-dir` the server keeps all data in memory and loses it on shutdown.

## Installation

The `0.2.0` developer preview is on npm:

```bash
npm install --global @sinterdb/cli
```

See the [quick start](../../docs/quick-start.md) for a walkthrough and the
[configuration reference](../../docs/configuration.md) for every option, exit
code, and default.

## Development

Build the executable from the repository root:

```bash
pnpm --filter @sinterdb/cli build
```

Start the server:

```bash
node apps/server-cli/dist/index.js
```

The default address is:

```text
sinterdb://127.0.0.1:4721
```

## Command-Line Options

```text
Usage:
  sinterd [options]

Options:
  --host <host>       Address to listen on
  -p, --port <port>   TCP port to listen on
  --data-dir <path>   Store data durably in this directory
  --write-concern <level>
                      How writes are acknowledged: flushed (default),
                      journaled or memory
  --durability <mode> Deprecated: fsync means flushed, buffered means journaled
  --checkpoint-bytes <n>
                      Bytes of log between automatic checkpoints (default 64 MiB)
  --checkpoint-interval <seconds>
                      Also checkpoint at least this often when data changed
  --checkpoint-keep <n>
                      Snapshots to keep (default 2)
  --reclaim-lock      Take over a data directory lock left by another host or
                      container
  -h, --help          Show the help message
  -v, --version       Show the server version
```

Example:

```bash
sinterd --host 0.0.0.0 --port 5000
```

SinterDB has no authentication or TLS yet. Listen on a non-local address only
on a network you trust.

Port `0` asks the operating system to select an available temporary port.

## Environment Variables

| Variable                       | Purpose                                | Default     |
| ------------------------------ | -------------------------------------- | ----------- |
| `SINTERDB_HOST`                | Listening address                      | `127.0.0.1` |
| `SINTERDB_PORT`                | TCP port                               | `4721`      |
| `SINTERDB_DATA_DIR`            | Data directory                         | none        |
| `SINTERDB_WRITE_CONCERN`       | `flushed`, `journaled`, `memory`       | `flushed`   |
| `SINTERDB_CHECKPOINT_BYTES`    | Bytes of log between checkpoints       | 64 MiB      |
| `SINTERDB_CHECKPOINT_INTERVAL` | Seconds between time-based checkpoints | none        |
| `SINTERDB_CHECKPOINT_KEEP`     | Snapshots to keep                      | `2`         |

Command-line options take precedence over environment variables.

## Durable Storage

```bash
sinterd --data-dir /var/lib/sinterdb
```

With a data directory, acknowledged writes survive restarts and crashes. See
[Durable Storage](../../docs/storage.md) for the write concerns, checkpoints,
recovery, and backups.

| Level       | A write is acknowledged when...                 | Survives a power loss |
| ----------- | ----------------------------------------------- | --------------------- |
| `flushed`   | it has been flushed to stable storage (default) | Yes                   |
| `journaled` | it has reached the operating system             | No                    |
| `memory`    | it is applied in memory (logged within ~100 ms) | No                    |

`--write-concern` and the checkpoint options require `--data-dir`.

## Backup, Inspection and Repair

These commands work on a data directory the server is not using. They share
the server's colors on a terminal and are plain text when piped.

```bash
sinterd backup --data-dir ./data --to ./backups/today
sinterd verify-backup --from ./backups/today
sinterd restore --from ./backups/today --data-dir ./restored
sinterd inspect --data-dir ./data
sinterd repair --data-dir ./data
```

See [Backup and restore](../../docs/backup.md) and
[Inspecting and repairing](../../docs/repair.md).

## Structured Logging

Lifecycle events are written as newline-delimited JSON:

```json
{
  "timestamp": "2026-09-19T02:48:23.277Z",
  "level": "info",
  "event": "server.started",
  "message": "SinterDB server is listening.",
  "details": {
    "host": "127.0.0.1",
    "port": 4721,
    "family": "IPv4",
    "version": "0.2.0",
    "storage": "disk",
    "dataDirectory": "/var/lib/sinterdb",
    "writeConcern": "flushed",
    "databases": 1,
    "collections": 2,
    "checkpointLsn": "1042",
    "replayedRecords": 0,
    "rebuiltIndexes": 3,
    "skippedCheckpoints": []
  }
}
```

## Shutdown

`SIGINT` and `SIGTERM` stop the listener, close active connections, write a final checkpoint when a data directory is in use, and allow the process to exit cleanly.

A process that is killed instead of stopped is recovered on the next start. The server takes over the lock the dead process left behind.

## Current Commands

After completing the protocol handshake, clients can use:

- `ping`
- `serverInfo`
- `listDatabases`
- `createCollection`
- `listCollections`
- `insertOne`
- `insertMany`
- `findOne`
- `find`
- `getMore`
- `closeCursor`
- `updateOne`
- `updateMany`
- `replaceOne`
- `deleteOne`
- `deleteMany`
- `createIndex`
- `dropIndex`
- `listIndexes`
- `explain`
- `validateIndexes`

## License

Licensed under the Apache License, Version 2.0.
