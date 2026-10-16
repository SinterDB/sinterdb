# Aggregation

`aggregate()` runs a pipeline: a list of stages that documents flow through, one
after another. Use it when `find()` is not enough, such as counting the matches
of a query, or sorting and paging the result of a `$project`.

```ts
const top = await users
  .aggregate<{ name: string; age: number }>([
    { $match: { active: true } },
    { $sort: [["age", -1]] },
    { $limit: 10 },
    { $project: { _id: 0, name: 1, age: 1 } },
  ])
  .toArray();

const [{ total }] = await users
  .aggregate<{ total: number }>([
    { $match: { age: { $gte: 18 } } },
    { $count: "total" },
  ])
  .toArray();
```

`aggregate()` returns a cursor that reads like the cursor of `find()`: nothing
is sent until the first read, documents arrive in batches (`batchSize`), and
`toArray()` and `for await` close it for you.

The result type is not worked out from the pipeline. Pass it as the type
argument, as above. Without one, the cursor holds plain `Document` values.

## Stages

Each stage is an object with exactly one key, which names the stage.

| Stage      | Argument                  | What it does                                   |
| ---------- | ------------------------- | ---------------------------------------------- |
| `$match`   | a filter                  | Keeps the documents that match.                |
| `$project` | a projection              | Reshapes each document.                        |
| `$sort`    | `[path, direction]` pairs | Orders the documents.                          |
| `$skip`    | a non-negative integer    | Drops that many documents.                     |
| `$limit`   | a positive integer        | Keeps at most that many documents.             |
| `$count`   | a field name              | Replaces the documents with one count document |
| `$group`   | `_id` and accumulators    | Replaces the documents with one per group      |

- **`$match`** takes the same filters as `find()`, and the rules in
  [query semantics](./query-semantics.md) apply. A `$match` at the start of the
  pipeline can use an index, exactly as `find()` does. Later in the pipeline it
  filters what the earlier stages produced.
- **`$project`** takes the same projections as `find()`. After a `$project`,
  later stages see only the fields it kept.
- **`$sort`** is an array of `[path, direction]` pairs, like the `sort` option
  of `find()`, and not an object like `{ age: -1 }`: the order of an object's
  keys is not preserved, so it could not say which field comes first. Documents
  that are equal on every sort field keep the order they arrived in.
- **`$skip`** and **`$limit`** work on the documents that reach them, so the
  order of the stages matters: `$skip` then `$limit` pages the results, and
  `$limit` then `$skip` skips part of a short list.
- **`$count`** takes the name of the field to put the number in. It must not be
  empty, start with `$`, or contain `.`. The stage produces one document, such
  as `{ total: 3 }`, or no document at all when nothing reached it. Check the
  length of the result rather than assuming a document is there.

- **`$group`** is described [below](#grouping).

## Grouping

`$group` puts documents into groups by a key and computes a value for each
group. The key is `_id`, and every other field is an accumulator:

```ts
const teams = await users
  .aggregate<{ _id: string; members: number; payroll: number }>([
    {
      $group: {
        _id: "$team",
        members: { $count: {} },
        payroll: { $sum: "$salary" },
      },
    },
    { $sort: [["payroll", -1]] },
  ])
  .toArray();
```

**Field references.** A string that starts with `$` names a field of the
incoming document: `"$age"`, or `"$address.city"` for a nested one. A path steps
into documents only, not into arrays. Any other value is a literal, so
`{ $sum: 1 }` adds one for every document. A literal string that starts with `$`
cannot be written.

**The key.** `_id` is a field reference, a literal, or a document of up to eight
field references or literals for a compound key, such as
`{ team: "$team", level: "$level" }`. `_id: null` puts every document in one
group. A document without the field is in the group with key `null`, which is
also the group of documents that hold `null`. Two keys are the same group when
filters would call them equal, so `1` and `1n` are different groups, and `NaN`
is one group. The key is the `_id` of the output document.

**Accumulators.** Each is an object with one key:

| Accumulator         | Result                                                        |
| ------------------- | ------------------------------------------------------------- |
| `{ $count: {} }`    | The number of documents in the group.                         |
| `{ $sum: value }`   | The total of the numbers, or `0` when there are none.         |
| `{ $avg: value }`   | The mean of the numbers, or `null` when there are none.       |
| `{ $min: value }`   | The smallest value in sort order, or `null` when none exists. |
| `{ $max: value }`   | The largest value in sort order, or `null` when none exists.  |
| `{ $first: value }` | The value in the first document of the group, or `null`.      |
| `{ $last: value }`  | The value in the last document of the group, or `null`.       |

- `$sum` and `$avg` ignore values that are not numbers. A `$sum` adds numbers or
  `bigint` values, and fails with `DocumentValidationFailed` when a group holds
  both, or when a bigint total leaves the signed 64-bit range. `$avg` fails on
  a `bigint`, because averaging would lose precision. Sum them and divide in your
  code.
- `$min` and `$max` compare as `sort` does, so a string is larger than a number
  and `null` is smaller than both. They skip documents that lack the field, but
  not a stored `null`. On a tie the earlier document's value stays.
- `$first` and `$last` depend on the order the documents arrive in, so put a
  `$sort` before the `$group` when you need a particular one. A missing field
  gives `null`.

**Order and memory.** Groups come out in the order their first document arrived.
Use a `$sort` after the `$group` to order them. A `$group` reads every document
before it yields the first group, and keeps one entry per group, so memory grows
with the number of groups and not the number of documents. At most 100,000
groups may exist at once. Beyond that the pipeline fails with
`DocumentValidationFailed`. Put a `$match` first, which can use an index, to
reduce the work.

Output documents hold `_id` and the accumulator fields. Output field names must
not be empty, start with `$`, contain `.`, or be `__proto__`.

## Rules

- A pipeline has at most 32 stages, and is checked in full before any document
  is read. An unknown stage, a stage with more than one key, or a bad argument
  fails with `DocumentValidationFailed`. That includes a pipeline for a
  collection that does not exist.
- An empty pipeline returns every document, in insertion order.
- A collection that does not exist has no documents, so its pipeline returns
  nothing.
- Documents come back in insertion order until a `$sort` changes it.
- Results are read as the cursor advances, and are not a snapshot. See
  [Known limitations](./limitations.md).
- Documents that no stage has reshaped keep their `_id`. After a `$project`
  that excludes it, or after a `$count`, there is none.

## Sorting a few results

A `$sort` directly followed by a `$limit`, with at most a `$skip` between them,
keeps only as many documents as the stages after it can use while it sorts. A
query for the ten oldest users therefore holds ten documents in memory at a
time, not the whole collection, and returns the same documents in the same order
as sorting everything.

Any other `$sort` holds every document that reaches it in memory. Put a `$match`
and a `$limit` around it when the collection is large.

## What is not there yet

Only these seven stages exist. `$lookup`, `$unwind`, `$addFields` and the other
stages are rejected with `DocumentValidationFailed`. Field references work only
inside `$group`, and `$push` and `$addToSet` do not exist. See
[Known limitations](./limitations.md).

A server older than 0.3.0 does not understand `aggregate`, and the driver throws
`SinterCompatibilityError` instead of sending one.
