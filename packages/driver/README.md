# SinterDB Node.js Driver

The official Node.js driver for the SinterDB document database.

> [!WARNING]
> SinterDB is under active development and is not ready for production use.
> Data is durable only when the server runs with a data directory. Otherwise it is kept in memory and lost when the server stops.

## Installation

The `0.2.0` developer preview is on npm:

```bash
npm install sinterdb
```

See the [quick start](../../docs/quick-start.md) for a walkthrough,
[connection strings](../../docs/connection-strings.md) for the URI format, and
the [configuration reference](../../docs/configuration.md) for client options. The
[to-do app](../../examples/todo-app) is a complete example. Every public type
and method has a doc comment, and `pnpm docs:api` turns them into an HTML API
reference.

## Quick Start

```ts
import { CustomId, SinterClient } from "sinterdb";

interface User {
  _id: CustomId;
  name: string;
  email: string;
  active: boolean;
}

const client = new SinterClient("sinterdb://127.0.0.1:4721/application");

try {
  await client.connect();

  const users = client.db().collection<User>("users");

  const insert = await users.insertOne({
    name: "Ada",
    email: "ada@example.com",
    active: true,
  });

  const user = await users.findOne({
    _id: insert.insertedId,
  });

  console.log(user);
} finally {
  await client.close();
}
```

## Connection Strings

SinterDB connection strings use the following format:

```text
sinterdb://host:port/database
```

The port and database are optional. When omitted, the driver uses port `4721`
and requires a database name when calling `client.db()`.

```ts
const client = new SinterClient("sinterdb://127.0.0.1/application");

await client.connect();

const database = client.db();
```

## Client Options

Connection, request, and idle socket timeouts can be configured in
milliseconds:

```ts
const client = new SinterClient("sinterdb://127.0.0.1:4721/application", {
  connectTimeoutMS: 10_000,
  requestTimeoutMS: 10_000,
  socketTimeoutMS: 30_000,
});
```

Set `socketTimeoutMS` to `0` to disable the idle socket timeout.

## Typed Collections

Pass a document type to `collection<TDocument>()`:

```ts
import type { CustomId } from "sinterdb";

interface User {
  _id: CustomId;
  name: string;
  email: string;
  createdAt: Date;
}

const users = client.db("application").collection<User>("users");

console.log(users.name); // users
console.log(users.namespace); // application.users
```

The `_id` property may be omitted from inserts. The server generates a
`CustomId` when one is not provided.

## Insert One

```ts
const result = await users.insertOne({
  name: "Ada",
  email: "ada@example.com",
  createdAt: new Date(),
});

console.log(result.acknowledged); // true
console.log(result.insertedId.toHexString());
```

A caller-provided identifier is also supported:

```ts
import { CustomId } from "sinterdb";

const id = CustomId.generate();

await users.insertOne({
  _id: id,
  name: "Ada",
  email: "ada@example.com",
  createdAt: new Date(),
});
```

Duplicate identifiers produce a server error with the numeric
`DuplicateKey` wire-error code.

## Insert Many

`insertMany()` applies documents in array order:

```ts
const result = await users.insertMany([
  {
    name: "Ada",
    email: "ada@example.com",
    createdAt: new Date(),
  },
  {
    name: "Grace",
    email: "grace@example.com",
    createdAt: new Date(),
  },
]);

console.log(result.insertedCount); // 2
console.log(result.insertedIds);
```

An ordered batch stops at its first failure. Successfully inserted documents
remain stored.

```ts
import { SinterInsertManyError } from "sinterdb";

try {
  await users.insertMany(documents);
} catch (error: unknown) {
  if (error instanceof SinterInsertManyError) {
    console.error("Failed index:", error.failedIndex);
    console.error("Applied IDs:", error.insertedIds);
  } else {
    throw error;
  }
}
```

## Find One

`findOne()` accepts the same filters as `find()`, described below.

## Find

`find()` returns a `FindCursor` that fetches results from the server in
bounded batches:

```ts
for await (const user of users.find({ active: true }, { batchSize: 100 })) {
  console.log(user.name);
}

const everyone = await users.find().toArray();
```

Breaking out of a `for await` loop and calling `toArray()` both close the
server-side cursor. Cursors belong to the connection that opened them and
are released when the connection closes or after ten minutes without use.

### Options

```ts
const page = await users
  .find(
    { active: true },
    {
      sort: [
        ["age", -1],
        ["name", 1],
      ],
      skip: 20,
      limit: 10,
      batchSize: 50,
    },
  )
  .toArray();
```

- `sort` is an ordered list of `[path, 1 | -1]` pairs. Earlier pairs take
  priority.
- `skip` must be a non-negative integer.
- `limit` must be a positive integer.
- `batchSize` controls how many documents each round trip returns.

Values of different types sort in this order: missing, `null`, numbers and
bigints, strings, binary values, `CustomId`, booleans, then dates.

### Counting and distinct values

```ts
const total = await users.countDocuments(); // the whole collection
const adults = await users.countDocuments({ age: { $gte: 18 } });
const same = await users.estimatedDocumentCount(); // always the whole collection

// Distinct values, lowest first, typed from the field.
const teams = await users.distinct("team"); // string[]
const skus = await users.distinct("orders.sku", { active: true }); // string[]
```

- Counting happens on the server. No documents are transferred.
- `countDocuments()` takes the same filter as `find()`. A collection that does
  not exist has no documents, but an invalid filter is still an error.
- `estimatedDocumentCount()` is the same as `countDocuments()` with no filter.
  It needs no scan, because the server answers from the size of the collection.
- `distinct()` returns each value once, in the sort order of
  [query semantics](../../docs/query-semantics.md#counting-and-distinct-values).
  A field that holds an array contributes its elements, and `1` and `1n` count
  as two values.
- A result larger than one message (16 MiB) fails with `ResultTooLarge`.
- A server older than 0.3.0 answers these with `UnknownCommand`.

### Projection

A projection chooses which fields come back. It works on `find()` and
`findOne()`, and the type of the result follows it.

```ts
// Keep only these fields (and _id).
const names = await users
  .find({ active: true }, { projection: { name: 1, email: 1 } })
  .toArray();
// names[0]: { _id: CustomId; name: string; email?: string }

// Leave _id out.
const ages = await users.find({}, { projection: { age: 1, _id: 0 } }).toArray();
// ages[0]: { age: number }

// Keep everything except these fields.
const safe = await users.findOne(
  { name: "Ada" },
  { projection: { passwordHash: 0 } },
);

// Nested paths, and paths through arrays of documents.
await users.find({}, { projection: { "profile.bio": 1, "orders.sku": 1 } });
```

- Use `1` or `true` to include a field and `0` or `false` to exclude one.
  Include and exclude cannot be mixed, except that `_id` may be excluded from an
  inclusion projection.
- `_id` is returned unless you set it to `0`.
- The projection applies after `sort`, `skip`, and `limit`, so you can sort or
  filter by a field you do not return.
- Write the projection inline (or `as const`) so TypeScript can see which fields
  are in the result. A projection held in a variable typed `Projection<T>` gives
  every field as optional.
- Positions such as `"orders.0"` are not supported in a projection.
- A server older than 0.3.0 would ignore a projection and return whole
  documents, so the driver throws `SinterCompatibilityError` instead of sending
  one.

The exact rules are in [query semantics](../../docs/query-semantics.md#projection).

### Filter operators

| Operator                     | Meaning                           |
| ---------------------------- | --------------------------------- |
| `$eq`, `$ne`                 | Equality and inequality           |
| `$gt`, `$gte`, `$lt`, `$lte` | Comparison                        |
| `$in`, `$nin`                | Membership, including array items |
| `$exists`                    | Field presence                    |
| `$not`                       | Negates a field operator document |
| `$size`                      | An array with exactly this length |
| `$elemMatch`                 | One array element meets all of it |
| `$and`, `$or`, `$nor`        | Logical combination of filters    |

A filter on a field that holds an array matches the array's elements:
`{ tags: "db" }` matches `{ tags: ["db", "fast"] }`, and `{ scores: { $gt: 90 } }`
matches when any element is above 90. A dotted path steps through arrays of
documents (`"items.sku"`) or picks an element by position (`"items.0"`, which
TypeScript does not check). Use `$elemMatch` when one element has to satisfy
several conditions:

```ts
await orders
  .find({
    items: { $elemMatch: { sku: "a", qty: { $gt: 1 } } },
  })
  .toArray();
```

The exact rules are in [query semantics](../../docs/query-semantics.md).

## Update

`updateOne()` changes the first matching document and `updateMany()` changes
every match. Both take a filter, an update document, and optional options:

```ts
const result = await users.updateOne(
  { email: "ada@example.com" },
  {
    $set: { "profile.bio": "Mathematician" },
    $inc: { loginCount: 1 },
    $push: { tags: "pioneer" },
  },
);

console.log(result.matchedCount, result.modifiedCount);
```

Updates may only contain operators. Use `replaceOne()` to replace a document.

| Operator    | Meaning                                              |
| ----------- | ---------------------------------------------------- |
| `$set`      | Set a field, creating intermediate documents         |
| `$unset`    | Remove a field                                       |
| `$inc`      | Add to a number or bigint, creating the field        |
| `$min`      | Lower a field to the value if the value is smaller   |
| `$max`      | Raise a field to the value if the value is larger    |
| `$push`     | Append a value to an array, creating the array       |
| `$addToSet` | Append a value only if the array does not contain it |
| `$pull`     | Remove every equal value from an array               |

Rules:

- Field paths may use dots, such as `"profile.stats.level"`. Paths walk
  documents, not arrays.
- Two operators in one update cannot target the same path or overlapping
  paths.
- `$inc` requires numbers or bigints and does not mix the two.
- `$min` and `$max` use the same type ordering as `sort`.
- `_id` cannot be modified.
- `updateOne()` modifies a document atomically. `updateMany()` is
  all-or-nothing: if one document fails, none are changed.

`UpdateFilter<TDocument>` checks field paths and value types, so `$inc` is only
offered for numeric fields and `$push` only for array fields.

### Results

```ts
interface UpdateResult {
  readonly acknowledged: true;
  readonly matchedCount: number;
  readonly modifiedCount: number;
  readonly upsertedId: CustomId | null;
}
```

`modifiedCount` only counts documents whose stored value actually changed, so
setting a field to its current value matches but does not modify.

### Upsert

Pass `{ upsert: true }` to insert a document when nothing matches:

```ts
const result = await users.updateOne(
  { email: "grace@example.com" },
  { $set: { name: "Grace" } },
  { upsert: true },
);

console.log(result.upsertedId);
```

The new document starts from the filter's top-level equality fields (and
`$eq` values), then the update is applied. An `_id` in the filter is reused;
otherwise one is generated.

## Replace One

`replaceOne()` replaces the first matching document while keeping its `_id`:

```ts
await users.replaceOne(
  { email: "ada@example.com" },
  { email: "ada@example.com", name: "Ada Lovelace" },
);
```

The replacement may repeat the existing `_id` but may not change it, and it
cannot contain operators. It also supports `{ upsert: true }` and returns an
`UpdateResult`.

## Delete

```ts
const one = await users.deleteOne({ email: "ada@example.com" });
const many = await users.deleteMany({ active: false });

console.log(one.deletedCount, many.deletedCount);
```

Both require a filter and return a `DeleteResult`. Pass an empty filter
explicitly, as in `deleteMany({})`, to delete every document.

## Indexes

An index lets the server find documents without reading the whole collection.
Every collection has a unique index on `_id`. Add others with `createIndex()`:

```ts
await users.createIndex({ field: "email", unique: true });
await users.createIndex({
  field: "profile.level",
  direction: -1,
  sparse: true,
});

const indexes = await users.indexes();
await users.dropIndex("profile.level_-1");
```

`field` is checked against your document type, so a typo or `_id` is a compile
error. The options are:

- `unique`: at most one document may have a value.
- `sparse`: documents without the field are not indexed.
- `direction`: `1` (the default) or `-1`.
- `name`: defaults to the field and direction, such as `email_1`.

Creating an identical index again succeeds and reports `created: false`.

A compound index covers several fields in order. Queries that fix the leading
fields by equality use it:

```ts
await orders.createIndex({
  keys: [
    ["customerId", 1],
    ["status", 1],
  ],
  unique: false,
});

const open = await orders.find({ customerId, status: "open" }).toArray();
```

`indexes()` returns `keys` for every index, and `field` and `direction` for its
first field. A server older than 0.3.0 refuses compound indexes, and the driver
throws `SinterCompatibilityError` instead of sending one.

The server chooses an index when a query allows it, and the result is always
the same as scanning the collection. See what it would do with `explain()`:

```ts
const plan = await users.find({ email: "ada@example.com" }).explain();

console.log(plan.stage); // "IXSCAN"
console.log(plan.index); // "email_1"
```

A write that breaks a unique index fails with a `DuplicateKey` server error and
changes nothing. `validateIndexes()` rebuilds every index and reports any
difference. See [Indexes](../../docs/indexes.md) for what an index can serve,
the rules for unique and missing values, and recovery.

## Listing Namespaces

```ts
const databases = await client.listDatabases();
const collections = await client.db().listCollections();
```

Both return names in sorted order.

## CustomId

A `CustomId` is a 16-byte SinterDB document identifier:

```ts
import { CustomId } from "sinterdb";

const generated = CustomId.generate();
const hexadecimal = generated.toHexString();
const parsed = CustomId.fromHexString(hexadecimal);

console.log(parsed.equals(generated)); // true
console.log(generated.timestamp);
```

The first six bytes contain the creation timestamp. The remaining ten bytes
are cryptographically random.

## Events

`SinterClient` emits typed lifecycle events:

```ts
client.on("connecting", () => {
  console.log("Connecting to SinterDB...");
});

client.on("connected", () => {
  console.log("Connected to SinterDB.");
});

client.on("closed", () => {
  console.log("Connection closed.");
});

client.on("error", (error) => {
  console.error(error);
});
```

## Error Handling

All public driver errors extend `SinterError`:

```ts
import {
  SinterConnectionError,
  SinterError,
  SinterErrorCode,
  SinterServerError,
} from "sinterdb";

try {
  await client.connect();
} catch (error: unknown) {
  if (error instanceof SinterConnectionError) {
    console.error("Could not connect to SinterDB.", error);
  } else if (
    error instanceof SinterError &&
    error.code === SinterErrorCode.IncompatibleProtocol
  ) {
    console.error("The protocol versions are incompatible.");
  } else if (error instanceof SinterServerError) {
    console.error(error.wireCode, error.serverErrorName);
  } else {
    throw error;
  }
}
```

Every error has a stable `code`. Branch on it rather than on the message:

| Code                        | Class                          | Meaning                                                                           |
| --------------------------- | ------------------------------ | --------------------------------------------------------------------------------- |
| `INVALID_CONNECTION_STRING` | `SinterConnectionStringError`  | The connection string is malformed                                                |
| `INVALID_CLIENT_OPTIONS`    | `SinterClientOptionsError`     | A client option, or a database or collection name, is invalid                     |
| `INVALID_DOCUMENT`          | `SinterDocumentError`          | A request holds a value the driver cannot encode; nothing was sent                |
| `CLIENT_NOT_CONNECTED`      | `SinterClientStateError`       | A command was sent before `connect()` completed                                   |
| `CLIENT_CLOSED`             | `SinterClientStateError`       | The client was closed                                                             |
| `CONNECTION_FAILED`         | `SinterConnectionError`        | The connection could not be made or was lost                                      |
| `CONNECTION_TIMEOUT`        | `SinterConnectionTimeoutError` | Connecting took longer than `connectTimeoutMS`                                    |
| `SOCKET_TIMEOUT`            | `SinterSocketTimeoutError`     | The connection was idle for longer than `socketTimeoutMS`                         |
| `REQUEST_TIMEOUT`           | `SinterRequestTimeoutError`    | No response within `requestTimeoutMS`; the request may still have run             |
| `INCOMPATIBLE_PROTOCOL`     | `SinterCompatibilityError`     | The server speaks a different protocol version                                    |
| `PROTOCOL_VIOLATION`        | `SinterProtocolError`          | The server sent something the driver cannot interpret                             |
| `SERVER_ERROR`              | `SinterServerError`            | The server rejected the request (`SinterInsertManyError` is a more specific kind) |

Server rejections of write commands carry a wire code and name:

| Name                       | Cause                                                |
| -------------------------- | ---------------------------------------------------- |
| `DuplicateKey`             | A duplicate `_id`, or a value a unique index rejects |
| `InvalidUpdate`            | A malformed, conflicting, or type-mismatched update  |
| `ImmutableId`              | An update or replacement tried to change `_id`       |
| `DocumentValidationFailed` | An invalid document, replacement, or filter          |
| `InvalidIndex`             | A malformed index definition                         |
| `IndexNotFound`            | Dropping an index or collection that does not exist  |
| `IndexConflict`            | An index that clashes with an existing one           |

## Current Scope

Version `0.2.0` provides:

- `SinterClient`
- `sinterdb://` connection-string parsing
- Protocol handshake and capability negotiation
- Connection, request, and socket timeouts
- Typed lifecycle events
- `CustomId` generation and serialization
- Typed `SinterDatabase` and `SinterCollection<TDocument>` handles
- `insertOne()`
- Ordered `insertMany()`
- `findOne()` and `find()` with typed filters
- Equality, comparison, membership, existence, logical, and nested-field operators
- `FindCursor` with `for await...of`, `next()`, `hasNext()`, `toArray()`, and `close()`
- `sort`, `skip`, `limit`, and `batchSize` options
- `listDatabases()` and `listCollections()`
- `updateOne()` and `updateMany()` with `$set`, `$unset`, `$inc`, `$min`, `$max`, `$push`, `$addToSet`, and `$pull`
- `replaceOne()`, `deleteOne()`, and `deleteMany()`
- Upserts, `UpdateResult`, and `DeleteResult`
- Typed `UpdateFilter<TDocument>`
- Duplicate `_id` detection
- Immutable `_id` enforcement
- Document-size and nesting validation, with `SinterDocumentError` for a
  document the database cannot store
- Durable storage when connected to a server started with a data directory
- `createIndex()`, `dropIndex()`, `indexes()`, and `validateIndexes()`
- Unique and sparse single-field indexes with typed `IndexDefinition<TDocument>`
- `find().explain()`

`0.2.0` is a developer preview. See the
[compatibility promise](../../docs/compatibility.md) for what stays stable
between releases. The next milestone is `0.3.0`, Query Engine and Driver Contract.
