# Indexes and Query Planning

An index lets the server find documents without reading the whole collection.
Every collection always has a unique index on `_id`. You can add more on other
fields, and the server decides for each query whether to use one.

```ts
import { SinterClient } from "sinterdb";

interface User {
  _id: CustomId;
  email: string;
  age: number;
  profile?: { level: number };
}

const users = client.db().collection<User>("users");

await users.createIndex({ field: "email", unique: true });
await users.createIndex({ field: "age" });

const adults = await users.find({ age: { $gte: 18 } }).toArray();
const plan = await users.find({ age: { $gte: 18 } }).explain();
```

## Creating and removing indexes

```ts
await users.createIndex({
  field: "profile.level", // a dotted path reaches into nested documents
  direction: -1, // defaults to 1
  unique: false, // defaults to false
  sparse: true, // defaults to false
  name: "by_level", // defaults to the field and direction, such as "email_1"
});

const indexes = await users.indexes();
await users.dropIndex("by_level");
```

| Option      | Meaning                                                              |
| ----------- | -------------------------------------------------------------------- |
| `field`     | The field to index. TypeScript checks it against your document type. |
| `direction` | `1` or `-1`. Both directions serve the same lookups today.           |
| `unique`    | At most one document may have a given value.                         |
| `sparse`    | Documents without the field are not indexed.                         |
| `name`      | Up to 127 characters. `_id_` is reserved.                            |

Rules:

- Creating an identical index twice succeeds and reports `created: false`.
- A collection can have one index per field and at most 32 indexes besides
  `_id`. A different definition for a field that already has an index fails
  with `IndexConflict`. Drop the old index first.
- `_id` cannot be indexed, changed, or dropped.
- `createIndex` creates the collection if it does not exist.
- Building an index scans the collection on the server's only thread, so
  creating one on a very large collection pauses other requests while it runs.

## What an index can serve

An index narrows the documents the server examines. The server then applies the
whole filter to each candidate, so an index can never change what a query
returns, including the order, which is always insertion order.

| Query shape                                     | Index used                                                   |
| ----------------------------------------------- | ------------------------------------------------------------ |
| `{ field: value }` or `{ field: { $eq } }`      | Yes: exact lookup                                            |
| `$gt`, `$gte`, `$lt`, `$lte`                    | Yes: range scan, with both bounds combined                   |
| `{ field: { $in: [...] } }`                     | Yes, unless an indexed document holds an array in that field |
| `{ _id: id }` and `{ _id: { $in: [...] } }`     | Yes: direct lookup                                           |
| Several conditions joined by `$and`             | Yes: the most selective single index                         |
| `$or`, `$nor`, `$ne`, `$nin`, `$exists`, `$not` | No: a scan, with the filter still applied                    |
| `sort`, `skip`, `limit`                         | Applied after the index narrows the candidates               |

How matching works (the full comparison rules are in
[Query semantics](./query-semantics.md)):

- **Equality is exact.** Values are compared by their stored form, so `1` and
  `1n` are different, `0` and `-0` are different, and an array or document only
  equals one with identical contents in the same order.
- **Ranges compare values of the same kind.** `{ $gt: 5 }` matches numbers,
  `{ $gt: "a" }` matches strings. A range never matches a value of another kind,
  and mixing kinds in one range uses a scan.
- **Arrays turn an index off.** A filter matches an array by its elements, and
  an index holds each document's array as one entry. So once any indexed
  document has an array in the field, or an array on the way to it (as in
  `items.sku` when `items` is an array), queries on that field scan the
  collection instead. Deleting or changing those documents turns the index
  back on. An index on an array field is not useful today.
- **One index per query.** The server picks the candidate with the fewest
  expected documents and uses it only if that is fewer than the collection
  holds. An index on a field where every document has the same value is not
  used.
- **Not used for sorting.** Results are sorted after they are found.

## Explaining a query

```ts
const plan = await users.find({ email: "ada@example.com" }).explain();
```

`explain()` reports how the server would run the query without running it.

| Field                 | Meaning                                             |
| --------------------- | --------------------------------------------------- |
| `stage`               | `COLLSCAN`, `IDLOOKUP`, or `IXSCAN`                 |
| `index`, `field`      | The index used, when there is one                   |
| `access`              | `equality`, `in`, or `range`                        |
| `lower`, `upper`      | The range bounds, each with `value` and `inclusive` |
| `estimatedCandidates` | How many documents the server expects to examine    |
| `documents`           | How many documents the collection holds             |

```json
{
  "stage": "IXSCAN",
  "index": "email_1",
  "field": "email",
  "access": "equality",
  "estimatedCandidates": 1,
  "documents": 20
}
```

The shape of the plan is experimental and will grow as the planner does.
Treat `stage` and `index` as the dependable parts and the estimates as hints.

## Unique indexes

A unique index rejects a write that would give two documents the same value.

- A write that would break the constraint fails with `DuplicateKey` and changes
  nothing. That covers `insertOne`, `insertMany`, `replaceOne`, `updateOne`,
  `updateMany`, and upserts.
- `insertMany` keeps the documents accepted before the failing one, as it does
  for duplicate `_id` values, and reports `failedIndex` and how many went in.
- A multi-document write is checked as a whole. Adding 1 to every value in a
  unique field succeeds if the result has no duplicates, even though the first
  document briefly shares a value with the second.
- Building a unique index fails with `DuplicateKey` if existing documents
  already violate it, and no index is created.
- Two clients racing to write the same value cannot both succeed. Exactly one
  does.

Documents without the field:

| Index               | Documents that lack the field                         |
| ------------------- | ----------------------------------------------------- |
| unique              | At most one. A missing field counts as its own value. |
| unique and `sparse` | Any number. They are not indexed.                     |

An explicit `null` is an ordinary value and is different from a missing field,
so one document may have `null` and another may lack the field. This differs
from MongoDB, where the two collide.

## Checking an index

```ts
const report = await users.validateIndexes();
// { valid: true, indexes: 2, documents: 1500, issues: [] }
```

`validateIndexes()` rebuilds every index from the documents and compares it with
the live one. It reports missing entries, stale entries, wrong document lists,
ordering problems, and duplicate values in unique indexes. It scans the whole
collection, so use it for diagnostics rather than on every request.

## Durability and recovery

Index definitions are durable. Index contents are not stored: they are rebuilt
from the documents.

- `createIndex` and `dropIndex` are written to the log before they take effect,
  like any other write. An index that fails to build is never logged.
- Snapshots store the index definitions of each collection.
- On start, after the documents are recovered, every index is rebuilt. The
  `server.started` log line reports `rebuiltIndexes`. Startup takes longer in
  proportion to the number and size of the indexes.
- If a unique index recorded in the log cannot be rebuilt from the recovered
  documents, startup stops with an error naming the collection instead of
  starting with a broken constraint.

See [Durable Storage](./storage.md).

## Limits

- Indexes cover one field. There are no compound, text, partial, or expiring
  indexes yet.
- Arrays are indexed as whole values. An index does not match on an individual
  array element.
- Indexes live in memory next to the documents, and the whole dataset must fit.
- A sorted list backs range lookups, so adding a new distinct value to a very
  large index costs time proportional to the number of distinct values. Bulk
  builds, including at startup, sort once and are fast.
- Building an index blocks the server while it runs.
- Sorting does not use an index.
