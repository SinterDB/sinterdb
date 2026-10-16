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

Only these six stages exist. `$group`, `$lookup`, `$unwind`, `$addFields` and the
other stages are rejected with `DocumentValidationFailed`, and there are no
expressions such as `"$age"` or `$sum`. See [Known limitations](./limitations.md).

A server older than 0.3.0 does not understand `aggregate`, and the driver throws
`SinterCompatibilityError` instead of sending one.
