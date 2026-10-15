# Custom Database, Node.js Driver, and ODM Roadmap

Status: Planning draft  
Working name: `SinterDB`  
Package scope: `@sinterdb-internal/*`  
License: Apache-2.0  
Primary language: TypeScript  
Package manager: pnpm

> `SinterDB`, its URI scheme, and its npm scope are placeholders until the project receives a final name.

## 1. Project Vision

Build a document-oriented database with three deliberately separate products:

1. **SinterDB Server** — owns storage, query execution, indexing, authentication, transactions, and replication.
2. **SinterDB Node.js Driver** — implements the wire protocol and exposes a typed `Client → Database → Collection → Cursor` API.
3. **SinterDB ODM** — an optional, separately published Mongoose-style modeling layer built on the public driver API.

The driver must remain useful without the ODM. The ODM must never import server internals or bypass the driver.

## 2. Non-Goals Before 1.0

- MongoDB wire-protocol compatibility
- SQL support
- Browser clients connecting directly to the database
- Multi-region consensus
- Sharding and automatic partition rebalancing
- A graphical administration application
- Compatibility with Mongoose models or plugins
- Supporting every JavaScript runtime before Node.js behavior is stable

## 3. Repository Strategy

Development begins in one monorepo so protocol, server, and driver changes can be tested atomically. The ODM is developed as a separate repository once the driver reaches `0.3.0`.

```text
sinterdb/
├── .changeset/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── workflows/
├── apps/
│   └── server-cli/
├── docs/
│   ├── architecture/
│   ├── protocol/
│   └── reference/
├── examples/
│   ├── basic/
│   └── typescript/
├── packages/
│   ├── protocol/
│   ├── server/
│   ├── driver/
│   ├── storage/
│   └── test-utils/
├── tests/
│   ├── integration/
│   └── specification/
├── LICENSE
├── NOTICE
├── README.md
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

Separately, when ODM development begins:

```text
sinterdb-odm/
├── docs/
├── examples/
├── packages/
│   └── odm/
├── tests/
├── LICENSE
├── NOTICE
├── README.md
├── package.json
└── tsconfig.json
```

## 4. Package Responsibilities

| Package                         | Published                | Responsibility                                                                          |
| ------------------------------- | ------------------------ | --------------------------------------------------------------------------------------- |
| `sinterdb-protocol`             | Yes, low-level           | Versioned request/response types, framing, serialization, capabilities, and error codes |
| `@sinterdb-internal/storage`    | No                       | Data files, write-ahead log, checkpoints, indexes, recovery, and compaction             |
| `@sinterdb-internal/server`     | Optional                 | Query execution, sessions, authentication, transactions, and TCP server                 |
| `@sinterdb/cli`                 | Optional executable      | CLI that configures and starts the server                                               |
| `sinterdb`                      | Yes                      | Official Node.js driver and primary public npm package                                  |
| `@sinterdb-internal/test-utils` | Later                    | Test-server lifecycle and fixtures for downstream packages                              |
| `sinterdb-odm`                  | Yes, separate repository | Schemas, models, validation, hooks, virtuals, and population                            |

## 5. Public Driver Shape

The intended low-level API is familiar without pretending to be MongoDB-compatible:

```ts
import { SinterClient, type Document } from "sinterdb";

interface User extends Document {
  username: string;
  createdAt: Date;
}

const client = new SinterClient("sinterdb://127.0.0.1:4721");

await client.connect();

const users = client.db("app").collection<User>("users");

await users.insertOne({
  username: "Killer88967",
  createdAt: new Date(),
});

const user = await users.findOne({
  username: "Killer88967",
});

await client.close();
```

The public object hierarchy is:

```text
SinterClient
└── Database
    └── Collection<TDocument>
        └── Cursor<TDocument>
```

## 6. Wire Protocol Principles

- TCP transport for the first stable release.
- A fixed binary frame header containing a version, message kind, request ID, flags, and payload length.
- A deterministic typed document encoding rather than plain JSON.
- Dates, binary data, integers, nulls, arrays, and nested documents must preserve their types.
- Every request receives one response or an explicitly streamed sequence.
- Request IDs allow concurrent operations over one socket.
- Capability negotiation prevents newer drivers from silently using unsupported server features.
- Stable numeric error codes accompany human-readable messages.
- Limits for frame size, document size, nesting depth, batch size, and operation time are enforced on both sides.
- Protocol documentation and conformance fixtures are public contracts.

## 7. Versioning Rules

- Before `1.0.0`, minor releases may change experimental APIs but must include migration notes.
- Patch releases fix bugs and must not intentionally break documented behavior.
- Every protocol change declares its minimum driver and server versions.
- The driver and server can have independent package versions after `1.0.0`.
- Experimental exports live behind an `experimental` namespace or explicit option.
- Deprecations must warn for at least one minor release before removal.
- The ODM follows its own version line and only supports declared driver ranges.

---

# Release Roadmap

## `0.0.1` — Repository Foundation

**Goal:** Establish a publishable, testable workspace without pretending the database works yet.

### Deliverables

- pnpm workspace and shared TypeScript configuration
- Packages for `protocol`, `storage`, `server`, `driver`, and `test-utils`
- ESM-first builds with generated declaration files
- Root scripts for `build`, `typecheck`, `lint`, `test`, and `format`
- Vitest unit-test setup
- Changesets release setup
- GitHub Actions for installation, typechecking, testing, and building
- Apache-2.0 `LICENSE` and `NOTICE`
- Initial architecture decision records
- Minimal package README files with explicit experimental warnings

### Repository layout

```text
packages/
├── driver/src/index.ts
├── protocol/src/index.ts
├── server/src/index.ts
├── storage/src/index.ts
└── test-utils/src/index.ts
```

### Exit criteria

- A clean checkout passes every CI task.
- `pnpm pack` produces a driver package containing JavaScript, types, license, and README.
- No package accidentally exposes workspace-only source paths.

## `0.0.2` — Protocol Primitives

**Goal:** Define how clients and servers exchange safe, correlated messages.

### Deliverables

- Protocol version constant
- Binary frame header
- Request and response envelopes
- Request ID generation
- Message kinds for handshake, ping, command, result, stream item, stream end, and error
- Incremental decoder that handles partial and combined TCP chunks
- Maximum frame-size validation
- Typed protocol errors
- Golden-byte fixtures for encoder/decoder compatibility
- Initial protocol specification in `docs/protocol`

### Exit criteria

- Any valid message round-trips without losing typed values.
- Fragmented and combined frames decode correctly.
- Invalid lengths, versions, and message kinds fail predictably.

## `0.0.3` — Server Lifecycle and In-Memory Catalog

**Goal:** Start a database process and manage logical databases and collections in memory.

### Deliverables

- `@sinterdb/cli` CLI
- Configuration through command-line flags and environment variables
- Graceful startup and shutdown
- TCP listener
- Connection and session lifecycle
- In-memory database and collection catalog
- `ping`, `serverInfo`, `listDatabases`, `createCollection`, and `listCollections`
- Structured server logging
- Temporary-port test-server utility

### Exit criteria

- The server starts, accepts multiple sockets, responds to `ping`, and shuts down cleanly.
- `SIGINT` and `SIGTERM` stop accepting connections and drain active work.

## `0.0.4` — First Driver Connection

**Goal:** Publish the first driver capable of talking to the server.

### Deliverables

- `SinterClient`
- URI parser for `sinterdb://host:port/database`
- `connect()`, `close()`, and `db()`
- Handshake and capability negotiation
- Socket timeout and connection timeout
- One active connection per client
- Driver events for connecting, connected, closed, and error
- Driver error hierarchy using `instanceof`
- Typed `Database` and `Collection<TDocument>` handles

### Exit criteria

- The driver connects, pings, selects a database, and closes without leaked handles.
- Malformed URIs and incompatible protocol versions produce specific errors.

## `0.0.5` — Insert and Point Read

**Goal:** Complete the first useful end-to-end data path.

### Deliverables

- `insertOne`
- `insertMany`
- Generated `CustomId` identifiers
- `findOne` with equality filters
- Document-size and nesting validation
- Duplicate `_id` detection
- Insert result types
- Ordered batch behavior
- In-memory collection storage

### Exit criteria

- Typed documents can be inserted and read through the published driver API.
- IDs remain stable across serialization.
- Batch failures report the failed position and successfully applied operations.

## `0.0.6` — Filters and Cursors

**Goal:** Support useful multi-document queries without loading every result into the client at once.

### Deliverables

- `find()` returning `FindCursor<TDocument>`
- Cursor iteration with `for await...of`
- `toArray`, `next`, `hasNext`, `limit`, `skip`, and `sort`
- Equality, comparison, membership, existence, logical, and nested-field operators
- Server-side cursor IDs and batches
- Cursor timeout and explicit `close()`
- Typed `Filter<TDocument>` API

### Exit criteria

- Large results are delivered in bounded batches.
- Abandoned or closed cursors release server resources.
- Filters have shared conformance tests for server behavior and driver typing.

## `0.0.7` — Updates, Replacements, and Deletes

**Goal:** Complete the basic CRUD surface.

### Deliverables

- `updateOne` and `updateMany`
- `replaceOne`
- `deleteOne` and `deleteMany`
- `$set`, `$unset`, `$inc`, `$min`, `$max`, `$push`, `$pull`, and `$addToSet`
- Upsert support
- Matched, modified, deleted, and upserted result types
- Immutable `_id` enforcement
- Atomic modification of one document

### Exit criteria

- Every CRUD operation has unit, integration, and type-level tests.
- Failed updates never leave a partially modified document.

## `0.0.8` — Durable Storage and Recovery

**Goal:** Make acknowledged data survive a normal restart and recover from interrupted writes.

### Deliverables

- On-disk data-directory layout
- Append-only write-ahead log
- Checksummed records
- Startup replay and recovery
- Configurable acknowledgement modes
- Checkpoints and snapshots
- Background compaction
- File locking to prevent two servers from opening one data directory
- Storage-format version
- Corruption detection with actionable diagnostics

### Data-directory layout

```text
data/
├── LOCK
├── manifest.json
├── wal/
├── segments/
├── indexes/
└── checkpoints/
```

### Exit criteria

- Acknowledged writes survive restart.
- Recovery ignores incomplete trailing records without accepting corrupt committed records.
- Crash tests repeatedly terminate the server during writes and preserve its invariants.

## `0.0.9` — Indexes and Query Planning

**Goal:** Avoid full scans for common queries and enforce uniqueness efficiently.

### Deliverables

- Primary `_id` index
- Single-field ascending and descending indexes
- Unique and sparse indexes
- `createIndex`, `dropIndex`, and `listIndexes`
- Persistent index metadata
- Index rebuilding after recovery
- Basic query planner choosing between a collection scan and index lookup
- `explain()` with an experimental documented shape
- Index-consistency validator

### Exit criteria

- Indexed equality and range queries return the same results as collection scans.
- Unique constraints remain correct across concurrent writes and restarts.

## `0.1.0` — Developer Preview

**Goal:** Release the first coherent database and driver preview for real local projects.

### Deliverables

- Consolidated CRUD, cursor, persistence, and index APIs
- Stable URI format for the `0.x` line
- Configuration reference
- Quick-start guide
- API documentation generated from public TypeScript declarations
- Example TypeScript application
- Dockerfile and local-container example
- Basic benchmarks and documented limitations
- Automated npm prerelease with provenance

### Compatibility promise

- Data and protocol migrations are documented from this point forward.
- Patch releases do not intentionally invalidate existing data files.
- Breaking API changes require a minor release and migration notes.

### Exit criteria

- A new user can install the server and driver, perform CRUD operations, restart the server, and recover their data using only the documentation.

## `0.2.0` — Storage Reliability

**Goal:** Harden durability before adding distributed features.

### Deliverables

- Configurable `memory`, `journaled`, and `flushed` write concerns
- Group commit
- Atomic manifest replacement
- Online compaction
- Checkpoint scheduling and retention
- Backup and restore commands
- Storage inspection and repair commands
- Disk-full and permission-error handling
- Fault-injection test suite
- Data-format migration framework

### Exit criteria

- Recovery and backup tests pass under forced termination, truncated writes, simulated disk exhaustion, and checksum failures.

## `0.3.0` — Query Engine and Driver Contract

**Goal:** Stabilize the query language enough for downstream ODM development.

### Deliverables

- Projection with inclusion and exclusion
- Compound sorting
- Compound indexes
- Array and nested-document query semantics
- `countDocuments`, `estimatedDocumentCount`, and `distinct`
- Initial aggregation stages: `$match`, `$project`, `$sort`, `$skip`, `$limit`, `$count`, and `$group`
- Documented collation rules for supported value types
- Query budgets and operation timeouts
- Stable driver interfaces consumed by the ODM
- Driver API report checked in CI

### Exit criteria

- Query semantics are documented with specification tests.
- ODM development can use only public `sinterdb` exports.

## v0.3.5: Interactive CLI

**Goal:** Give `@sinterdb/cli` a full-screen interactive console for running and controlling a server, without breaking anything that already works. This is a CLI-focused release. The driver, storage format and query engine stay unchanged apart from one additive logging change.

### Compatibility rules

- No breaking changes to the driver API, the on-disk format, or existing CLI commands and flags.
- Server changes are additive only (structured log events); default output is unchanged.
- The full-screen UI opens only on an interactive TTY. Non-TTY runs, `--no-ui`, and `ui: false` in config keep the current plain behavior.
- `sinterdb start` still runs the server headless for Docker, systemd and CI.
- New dependencies (UI library) are added to `@sinterdb/cli` only, never to the driver.

### Slices

1. **Structured log events**
   - Server emits structured events (level, timestamp, op, collection, duration, message) alongside the existing plain logs.
   - Plain output stays the default; structured output is opt-in.

2. **Server supervisor**
   - Run the server as a child process, with logs streamed over a pipe.
   - States: stopped, starting, running, stopping, crashed.
   - `start`, `stop` (graceful: flush WAL, checkpoint, with timeout), and `kill` (immediate).
   - Lock file in the data directory to prevent two servers opening the same data.

3. **Config system**
   - `config get`, `config set`, `config list`, `config unset`, stored in a config file.
   - Precedence: flags, then env vars, then config file, then defaults.
   - Validation on set; clear notice when a change needs a restart (e.g. `dataDir`).

4. **Interactive UI shell**
   - Alternate screen buffer with clean terminal restore on exit or crash.
   - Layout: status header, stats line, scrolling log pane, button row, command prompt.
   - Log pane: capped ring buffer, follow mode, pause, level filter, search.
   - Keyboard shortcut for every button (`?` help, `p` pause, `/` filter, `q` quit).

5. **UI actions**
   - Wire Help, Inspect, Backup and Repair to the existing CLI functions (no duplicated logic).
   - Overlay panels that close with `esc`.
   - Confirmation prompts for `kill` and for quitting while the server is running.

6. **Compatibility, docs and release**
   - TTY detection, `--no-ui`, headless `start` verified in tests.
   - Tests for the supervisor state machine, config precedence and lock file.
   - README and docs updated, changeset added, GitHub release, npm publish with provenance.

### Out of scope

- Mouse-only interactions (everything must work from the keyboard).
- Any driver API, query engine or storage format changes.
- Remote or multi-server management.

### Done when

- Running the CLI in a terminal opens the UI in a stopped state, and the user can start, stop and kill the server and change config from inside it.
- All existing commands and scripts behave exactly as they did in 0.3.0.
- The driver package needs no changes or version bump beyond the additive logging.

## `sinterdb-odm@0.0.1` — ODM Foundation

**Begins after driver `0.3.0`.**

### Deliverables

- Independent repository and package
- `Schema`, `SchemaType`, `Model`, and hydrated-document primitives
- Required fields, defaults, enum rules, and custom validators
- Type inference from schema definitions
- Model registry per driver connection
- `create`, `find`, `findOne`, `findById`, `updateOne`, and `deleteOne`
- No middleware, population, or plugins yet

### Exit criteria

- The ODM passes integration tests against the public driver package without importing workspace internals.

## `0.4.0` — Authentication and Transport Security

**Goal:** Make remote deployment defensible.

### Server and driver deliverables

- TLS with certificate verification
- Username/password authentication using a challenge-response design
- Server-side password hashing with a modern memory-hard KDF
- Users, roles, and database-scoped permissions
- Authentication database in the connection URI
- Credential redaction in errors and logs
- Connection rate limiting and temporary lockout policy
- Authorization checks on every command
- Security threat model and deployment guide

### ODM companion `0.1.0`

- Schema composition
- Setters and getters
- Timestamps
- Custom instance and static methods
- Validation error tree
- Lean query results

### Exit criteria

- Unauthorized operations fail without revealing protected metadata.
- TLS validation failures cannot silently downgrade the connection to plaintext.

## `0.5.0` — Pooling, Monitoring, and Resilience

**Goal:** Make the driver suitable for web servers and concurrent applications.

### Server and driver deliverables

- Configurable connection pool
- Wait queue and acquisition timeout
- Idle-connection cleanup
- Keepalive and heartbeat
- Retryable reads and explicitly safe retryable writes
- Cancellation through `AbortSignal`
- Server-selection and command-monitoring events
- Structured metrics
- Graceful behavior during server restarts
- Load and leak testing

### ODM companion `0.2.0`

- Pre/post middleware
- Query builder
- Schema indexes
- Optimistic-concurrency field
- Reusable schema plugins

### Exit criteria

- Pool behavior remains bounded under load.
- Retried commands cannot accidentally apply retryable writes twice.

## `0.6.0` — Sessions and Transactions

**Goal:** Support atomic multi-document work on one server.

### Server and driver deliverables

- Client sessions
- Precisely documented snapshot and isolation semantics
- `withTransaction()` helper
- Commit, abort, timeout, and conflict errors
- Deadlock and conflict-detection strategy
- Transaction-aware cursors
- Transaction size and duration limits
- Recovery of committed transactions after restart

### ODM companion `0.3.0`

- Session propagation through model operations
- ODM transaction helper
- Transaction-aware middleware
- Document-state restoration after abort

### Exit criteria

- Transactions remain atomic across crashes.
- Isolation anomalies outside the documented model have reproducible tests and are treated as bugs.

## `0.7.0` — Replication Preview

**Goal:** Introduce high availability without claiming production readiness.

### Server and driver deliverables

- Primary/replica topology
- Ordered operation log
- Initial synchronization
- Replica catch-up
- Manual or conservative leader election
- Read-preference and write-concern types
- Driver topology discovery
- Failover-aware retry logic
- Replication-lag metrics
- Explicit preview warning

### ODM companion `0.4.0`

- Read-preference and write-concern options
- Reference fields
- Initial `populate()` for singular and array references
- Discriminators and inheritance

### Exit criteria

- A replica can be rebuilt from a primary and validated logically.
- Planned failover preserves acknowledged-write guarantees for the selected write concern.

## `0.8.0` — Operational Tooling and ODM Beta

**Goal:** Make the system observable, maintainable, and practical for serious testing.

### Server and driver deliverables

- Administrative CLI
- Health, readiness, and diagnostic commands
- Live-operation listing and cancellation
- Slow-query logging
- Configurable resource limits
- Rolling-compatible protocol negotiation
- Import/export using a documented extended JSON format
- Upgrade and downgrade checks
- Performance-regression suite
- Published compatibility matrix

### ODM companion `0.5.0`

- Middleware-ordering guarantees
- Virtual fields and virtual population
- Validation during updates
- Bulk model operations
- Plugin API beta
- Public API report and compatibility policy
- Migration guide from direct driver usage

### Exit criteria

- Operators can diagnose storage, query, pool, and replication state without manually reading data files.
- The ODM supports a complete example application without accessing private APIs.

## `0.9.0` — Release Candidate

**Goal:** Freeze the intended `1.0` contracts and spend the release on correctness.

### Deliverables

- Public API freeze candidate
- Wire Protocol v1 freeze candidate
- Storage Format v1 freeze candidate
- Security audit and dependency review
- Cross-platform testing on supported Node.js and operating-system versions
- Upgrade testing from every supported preview data version
- Multi-day stress, soak, and recovery testing
- Complete reference documentation
- Error-code registry
- Deprecation and support policies
- Release signing and provenance process
- No new major feature work after the freeze

### ODM companion `0.9.0`

- API freeze candidate
- Complete validation, middleware, population, and plugin documentation
- Driver-compatibility tests
- Performance and memory profiling
- Migration and troubleshooting guides

### Exit criteria

- No unresolved critical correctness, durability, security, or data-loss bugs.
- All breaking changes proposed for `1.0` are complete and documented.

## `0.9.1` through `0.9.x` — Stabilization Releases

**Goal:** Fix release-candidate defects without expanding scope.

### Allowed changes

- Bug fixes
- Performance fixes backed by benchmarks
- Documentation corrections
- Better diagnostics
- Compatibility corrections
- Security fixes

### Disallowed changes without resetting release-candidate review

- New query-language families
- New storage engines
- New distributed-system modes
- Broad new public API surfaces

## `1.0.0` — Stable Release

**Goal:** Declare the database, Node.js driver, and their compatibility contracts stable for production evaluation and use.

### Server guarantees

- Documented durability and transaction behavior
- Storage Format v1 with migrations for future changes
- Wire Protocol v1
- Authentication, authorization, and TLS
- Backup, restore, repair, and diagnostics
- Supported standalone and replica-topology definitions
- Clear resource and operational limits

### Driver guarantees

- Stable `SinterClient`, `Database`, `Collection`, cursor, session, and transaction APIs
- Stable error hierarchy and error codes
- Connection pooling, monitoring, cancellation, retries, TLS, and authentication
- Supported Node.js version matrix
- Semantic-versioning policy
- npm provenance and generated API documentation

### ODM `1.0.0` guarantees

- Released separately after its own `0.9.x` cycle and driver `1.0.0`
- Stable schemas, models, documents, validation, middleware, virtuals, population, transactions, and plugins
- Declared compatible driver versions
- No dependency on server or driver internals

### Exit criteria

- The full compatibility, durability, crash, conformance, security, upgrade, and stress suites pass.
- Installation, deployment, backup, failure recovery, driver use, and ODM use are documented from a new user’s perspective.
- Release artifacts can be reproduced and verified.

---

# Quality Gates Applied to Every Release

Each release must include:

- Unit tests for changed logic
- Integration tests for behavior crossing package boundaries
- Type tests for the public driver or ODM API
- Protocol or storage fixtures when a format changes
- Documentation for new public behavior
- A changeset and changelog entry
- Clean installation and package tests
- No leaked sockets, timers, file handles, or cursors
- Dependency and license review
- A documented migration when compatibility changes

## Required CI Matrix by `0.9.0`

| Area                 | Required coverage                                                       |
| -------------------- | ----------------------------------------------------------------------- |
| Node.js              | Every declared supported LTS/current release                            |
| Operating systems    | Linux, macOS, and Windows                                               |
| Package installation | pnpm, npm, and Yarn consumer fixtures                                   |
| Protocol             | Minimum and maximum compatible driver/server pairs                      |
| Storage              | Fresh data, upgraded data, recovery, and corrupted fixtures             |
| Security             | TLS, authentication, authorization, redaction, and malformed input      |
| Reliability          | Stress, soak, forced termination, disk errors, and network interruption |

# Initial Issue Milestones

The roadmap should be mirrored into these milestones:

1. `0.0.1 — Foundation`
2. `0.0.2 — Protocol`
3. `0.0.3 — Server Lifecycle`
4. `0.0.4 — Driver Connection`
5. `0.0.5 — Insert and Read`
6. `0.0.6 — Filters and Cursors`
7. `0.0.7 — Complete CRUD`
8. `0.0.8 — Persistence`
9. `0.0.9 — Indexes`
10. `0.1.0 — Developer Preview`

Later milestones should be opened only after the developer preview validates the fundamental architecture.

# Decisions Required Before Implementing `0.0.1`

1. Final project, executable, URI scheme, npm package, and scope names
2. Whether the server remains TypeScript through `1.0` or may later move storage/query internals to Rust
3. Minimum supported Node.js version
4. ESM-only versus dual ESM/CommonJS publishing
5. Initial document encoding: a custom binary format or an existing specification with extensions
6. Default data directory and server port
7. Repository ownership and npm organization
8. Whether replication is mandatory for `1.0` or may move to `1.1`

# Recommended First Implementation Order

Once the naming decisions are complete, implementation should follow this order:

1. Create the workspace and package manifests.
2. Configure TypeScript, builds, tests, formatting, and CI.
3. Define protocol values and document encoding independently of sockets.
4. Add golden protocol fixtures.
5. Build the incremental frame decoder.
6. Start a TCP server with `ping`.
7. Connect through `SinterClient`.
8. Add one vertical data path: `insertOne` followed by `findOne`.

That vertical slice proves the package boundaries before more CRUD, persistence, indexes, authentication, or ODM work is added.
