# SinterDB

[![CI](https://img.shields.io/github/actions/workflow/status/SinterDB/sinterdb/ci.yml?branch=main&label=CI&logo=githubactions)](https://github.com/SinterDB/sinterdb/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/sinterdb?logo=npm&logoColor=white)](https://www.npmjs.com/package/sinterdb/v/0.2.0)
[![License](https://img.shields.io/github/license/SinterDB/sinterdb?color=blue)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A524-339933?logo=nodedotjs&logoColor=white)](package.json)
[![Status](https://img.shields.io/badge/Status-Alpha-orange)](ROADMAP.md)

A document-oriented database, its official Node.js driver, and supporting packages.

> [!WARNING]
> SinterDB `0.2.0` is a developer preview for local projects. The server can keep its data durably in a data directory (`--data-dir`) and recover it after a restart or crash. Without a data directory it keeps everything in memory and loses it on shutdown. The whole dataset must fit in memory, and APIs and protocol details may change before `1.0.0`.

## Project Goals

SinterDB aims to provide:

- A document-oriented database server
- A versioned network protocol
- Persistent local storage
- An official TypeScript-first Node.js driver
- Transactions, indexes, authentication, and replication
- A separate ODM package inspired by tools such as Mongoose
- A straightforward local-development experience

## Workspace

| Package                         | Visibility | Purpose                                        |
| ------------------------------- | ---------- | ---------------------------------------------- |
| `sinterdb`                      | Public     | Official Node.js database driver               |
| `sinterdb-protocol`             | Public     | Wire-protocol types, framing, and errors       |
| `@sinterdb/cli`                 | Public     | `sinterd` server executable                    |
| `@sinterdb-internal/server`     | Private    | Sessions, commands, and query execution        |
| `@sinterdb-internal/storage`    | Private    | Persistent storage, WAL, indexes, and recovery |
| `@sinterdb-internal/test-utils` | Private    | Shared fixtures and server test utilities      |
| `@sinterdb-internal/api-docs`   | Private    | Generates the driver API reference             |
| `@sinterdb-examples/todo-app`   | Private    | Example command-line application               |
| `@sinterdb-internal/bench`      | Private    | Basic benchmarks (`pnpm bench`)                |
| `@sinterdb-internal/release`    | Private    | Release checks and rehearsal                   |

The ODM will be developed separately as `sinterdb-odm` after the driver API
becomes stable enough to support it.

## Repository Layout

```text
sinterdb/
├── apps/
│   └── server-cli/
├── packages/
│   ├── driver/
│   ├── protocol/
│   ├── server/
│   ├── storage/
│   └── test-utils/
├── tests/
│   ├── integration/
│   └── specification/
├── docs/
│   ├── architecture/
│   ├── protocol/
│   └── reference/
├── examples/
│   ├── docker/
│   └── todo-app/
├── tools/
│   ├── api-docs/
│   └── bench/
├── Dockerfile
└── ROADMAP.md
```

## Requirements

- Node.js 24 or newer
- pnpm 12 or newer

## Development

Clone the repository and install its dependencies:

```sh
git clone https://github.com/SinterDB/sinterdb.git
cd sinterdb
pnpm install --frozen-lockfile
```

Run the complete validation suite:

```sh
pnpm all
```

The individual validation commands are:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

Remove generated output:

```sh
pnpm clean
```

## Server CLI

Build and start the development server:

```sh
pnpm --filter @sinterdb/cli build
node apps/server-cli/dist/index.js
```

Use a custom address:

```sh
node apps/server-cli/dist/index.js \
  --host 127.0.0.1 \
  --port 5000
```

Store data durably by giving the server a data directory:

```sh
node apps/server-cli/dist/index.js --data-dir ./data
```

See [Durable Storage](./docs/storage.md) for durability modes, checkpoints, and
recovery, and [Indexes](./docs/indexes.md) for indexes and query planning.

Display the available options:

```sh
node apps/server-cli/dist/index.js --help
```

The server emits newline-delimited JSON lifecycle logs and shuts down gracefully
on `SIGINT` or `SIGTERM`.

## Documentation

- [Quick start](./docs/quick-start.md)
- [Configuration reference](./docs/configuration.md)
- [Connection strings](./docs/connection-strings.md)
- [Durable storage](./docs/storage.md)
- [Indexes](./docs/indexes.md)
- [Aggregation](./docs/aggregation.md)
- [Query semantics](./docs/query-semantics.md)
- [Compatibility and versioning](./docs/compatibility.md)
- [Running in Docker](./docs/docker.md)
- [Known limitations](./docs/limitations.md)
- [Benchmarks](./docs/benchmarks.md)
- [Releasing](./docs/releasing.md) (for maintainers)
- [Example application](./examples/todo-app) (a to-do list on the driver)
- API reference: run `pnpm docs:api` to generate it in `docs/api/`; CI
  publishes it as a build artifact

## Development Status

The current milestone is `0.2.0 — Storage Reliability`.

Implemented so far:

- Publishable pnpm monorepo
- TypeScript builds and declarations
- Binary wire framing
- Deterministic typed document encoding
- Custom identifier generation and binary serialization
- Incremental protocol stream decoding
- Protocol handshakes and capability negotiation
- TCP server and session lifecycle
- Official Node.js driver connection lifecycle
- Driver lifecycle events and error hierarchy
- Ping requests
- Typed database and collection handles
- In-memory document storage
- `insertOne` and ordered `insertMany`
- `findOne` and `find` with equality, comparison, membership, existence,
  logical, and nested-field filters
- Server-side cursors with batching, idle timeout, and explicit close
- `FindCursor` with `for await...of`, `next`, `hasNext`, `toArray`, and `close`
- `sort`, `skip`, and `limit`
- Typed `Filter<TDocument>` and `Sort<TDocument>` APIs
- `listDatabases` and `listCollections`
- `updateOne` and `updateMany` with `$set`, `$unset`, `$inc`, `$min`, `$max`,
  `$push`, `$pull`, and `$addToSet`
- `replaceOne`, `deleteOne`, and `deleteMany`
- Upserts and matched, modified, deleted, and upserted result counts
- Immutable `_id` enforcement and all-or-nothing multi-document updates
- Typed `UpdateFilter<TDocument>` API
- Durable storage with a write-ahead log, atomic multi-document writes, and
  configurable `flushed`, `journaled` or `memory` write concerns
- Checkpoints, log compaction, and startup recovery from snapshots
- Data directory locking and storage format versioning
- Crash tests that terminate the server with `SIGKILL` during writes and
  during checkpoints
- Single-field indexes with `createIndex`, `dropIndex`, and `indexes`, in either
  direction, with `unique` and `sparse` options and nested field paths
- A query planner that chooses between a collection scan, an `_id` lookup, and
  an index lookup, with results identical to a scan
- `explain()` and `validateIndexes()`
- Index definitions that survive restarts, with indexes rebuilt on recovery
- Typed `IndexDefinition<TDocument>` API
- Duplicate identifier detection
- Document-size and nesting validation
- Structured server logging
- Temporary-port test-server utilities
- End-to-end driver and server integration tests
- Graceful signal shutdown
- A compatibility promise and a recorded public driver API
- A tested quick start, a configuration reference, and generated API docs
- A Docker image, benchmarks, and documented limitations
- Publishing to npm from GitHub Actions with provenance

The next milestone, `0.2.0`, is Storage Reliability.

See [ROADMAP.md](./ROADMAP.md) for the complete development plan.

## Versioning

SinterDB follows semantic versioning.

Before `1.0.0`, APIs and protocol details may change between minor versions.
Changesets are used to track package changes and coordinate releases.

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

See [NOTICE](NOTICE) for attribution information.
