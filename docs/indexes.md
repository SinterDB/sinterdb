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

| Option      | Meaning                                                                |
| ----------- | ---------------------------------------------------------------------- |
| `field`     | The field to index. TypeScript checks it against your document type.   |
| `direction` | `1` or `-1`. Both directions serve the same lookups today.             |
| `keys`      | Several `[field, direction]` pairs for a compound index. See below.    |
| `unique`    | At most one document may have a given value, or combination of values. |
| `sparse`    | Documents without the field are not indexed.                           |
| `name`      | Up to 127 characters. `_id_` is reserved.                              |

Give either `field` or `keys`, never both.

Rules:

- Creating an identical index twice succeeds and reports `created: false`.
- A collection can have one index per list of fields and at most 32 indexes
  besides `_id`. A different definition for fields that already have an index,
  in the same order, fails with `IndexConflict`. Drop the old index first.
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
| Equality, `$in`, and a range on a compound      | Yes: see [Compound indexes](#compound-indexes)               |
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

## Compound indexes

A compound index covers several fields, in order. Use it when queries fix one
field and then narrow by another.

```ts
await orders.createIndex({
  keys: [
    ["customerId", 1],
    ["status", 1],
  ],
});

// Both of these can use the index:
await orders.find({ customerId: id }).toArray();
await orders.find({ customerId: id, status: "open" }).toArray();

// This cannot, because the first field is not fixed:
await orders.find({ status: "open" }).toArray();
```

- **A query uses the index by its leading fields.** The query fixes the first
  field by equality or `$in`, and can continue with the second, the third, and
  so on. The first field it leaves out can carry a range (`$gt`, `$gte`, `$lt`,
  `$lte`) that the index uses too. Anything after that is checked on each
  candidate. With an index on `customerId` and `total`, a query for one
  customer and a `total` above some value uses both fields.
- **A range alone works on the first field.** `{ customerId: { $gt: a } }`
  reads the index in a range, just as a single-field index does.
- **`$in` expands into one lookup per combination**, up to 64 combinations. A
  query that would need more falls back to the fields before it, or to a scan.
  When a field has both an equality and a `$in`, the equality is used.
- **The order of the fields matters.** `["a", "b"]` and `["b", "a"]` are two
  different indexes, and both can exist. Two indexes over the same fields in
  the same order cannot, whatever their directions.
- **Up to 8 fields**, each at most once.
- **Missing fields count as a value.** A document without one of the fields is
  indexed with that field missing, and a query for `null` does not find it.
  In a unique compound index, two documents that both lack the same fields and
  share the rest conflict.
- **`sparse` leaves out only documents with none of the fields.** A document
  with at least one of them is indexed.
- **`unique` applies to the combination.** Many documents may share the first
  field as long as the whole combination differs. The error names every field.
- **Arrays turn it off**, as for any index: once a document holds an array in
  one of the fields, queries scan the collection instead.
- **`explain()` shows the prefix.** `fields` lists every field and
  `prefixLength` says how many the query fixed.
- **Not used for sorting yet.** The planner does not read a compound index in
  order, so it does not replace a sort. Results are sorted after they are found.
- `field` and `direction` in `indexes()` and `explain()` describe the first
  field, so older drivers keep working. Read `keys` for the whole index.

## Explaining a query

```ts
const plan = await users.find({ email: "ada@example.com" }).explain();
```

`explain()` reports how the server would run the query without running it.

| Field                 | Meaning                                               |
| --------------------- | ----------------------------------------------------- |
| `stage`               | `COLLSCAN`, `IDLOOKUP`, or `IXSCAN`                   |
| `index`, `field`      | The index used, and its first field                   |
| `fields`              | Every field of a compound index, in order             |
| `prefixLength`        | How many leading fields of a compound index are fixed |
| `access`              | `equality`, `in`, or `range`                          |
| `lower`, `upper`      | The range bounds, each with `value` and `inclusive`   |
| `estimatedCandidates` | How many documents the server expects to examine      |
| `documents`           | How many documents the collection holds               |

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

- There are no text, partial, or expiring indexes yet. A compound index is not
  yet read in order to serve a sort.
- Arrays are indexed as whole values. An index does not match on an individual
  array element.
- Indexes live in memory next to the documents, and the whole dataset must fit.
- A sorted list backs range lookups, so adding a new distinct value to a very
  large index costs time proportional to the number of distinct values. Bulk
  builds, including at startup, sort once and are fast.
- Building an index blocks the server while it runs.
- Sorting does not use an index.
