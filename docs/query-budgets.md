# Query budgets

A query budget limits what one request may cost the server. It protects a
server from a query that reads far more than you meant, such as a filter on a
field with no index, or a typo that matches everything. There are two limits,
and both are optional:

| Option       | Limits                                        |
| ------------ | --------------------------------------------- |
| `maxTimeMS`  | How long the server may spend on the request. |
| `maxScanned` | How many documents the server may examine.    |

Both are positive integers, and both work on `find()`, `findOne()`,
`aggregate()`, `countDocuments()` and `distinct()`:

```ts
const recent = await events
  .find({ kind: "login" }, { maxTimeMS: 2000, maxScanned: 100_000 })
  .toArray();

const total = await events.countDocuments(
  { kind: "login" },
  { maxScanned: 50_000 },
);
const kinds = await events.distinct("kind", {}, { maxTimeMS: 1000 });
```

A request that passes a limit stops and fails with a `SinterServerError`. Its
`serverErrorName` is `OperationTimeLimitExceeded` (wire code 7000) for
`maxTimeMS` and `ScanLimitExceeded` (wire code 7001) for `maxScanned`. Nothing
is written by these commands, so there is nothing to undo. Catch the error to
tell a too-expensive query from a broken one:

```ts
try {
  await events.find({ note: "x" }, { maxScanned: 10_000 }).toArray();
} catch (error) {
  if (
    error instanceof SinterServerError &&
    error.serverErrorName === "ScanLimitExceeded"
  ) {
    // Add an index, or narrow the filter.
  }
}
```

## What counts as scanned

`maxScanned` counts the documents the server reads to answer the request, not
the documents it returns. A filter that matches 5 documents out of 10,000 with
no index scans 10,000. With an index that selects 5 candidates it scans 5, so
a budget is a good way to find the queries that need an index. `explain()` shows
whether a query uses one.

- A `limit` stops the scan once enough documents are found, so the documents
  after it are not counted.
- A `sort` reads every candidate document before it returns the first, so all
  of them are counted, and a `limit` does not lower the number.
- In `aggregate()`, only the documents the pipeline reads from the collection
  are counted: those chosen by a leading `$match`, or all of them. What later
  stages do with them is not.
- `countDocuments()` with no filter is answered from the size of the collection
  and examines nothing, so it never fails.
- `findOne()` by `_id` reads one document directly and is not counted.

## What `maxTimeMS` measures

The clock starts when the server starts the request. The server looks at it
while it examines documents, once for the first and then once every 64, so a
request can run a little past its limit before it stops. Two things are not
interrupted: a request that examines no documents, and the work done after the
last document has been read, such as ordering a large result or finishing a
`$group`. Use `maxScanned` together with `maxTimeMS` to bound those.

`maxTimeMS` is not the client's `requestTimeoutMS`. That one makes the driver
stop waiting (`SinterRequestTimeoutError`), and the request may still run on the
server. Keep `requestTimeoutMS` larger than `maxTimeMS`, so the server's answer
arrives before the client gives up.

## Cursors

The limits apply to each round trip, not to the whole cursor. A cursor sends
them with the first request and again with every `getMore`, and each batch gets
a fresh budget. A `find()` over a million documents with `maxScanned: 1000` and
a `batchSize` of 100 therefore succeeds, one small batch at a time, and only
fails if one batch needs more than 1000 documents. To bound the whole query, use
`limit`, or `countDocuments()` with a budget first.

When a batch fails, the server closes that cursor. The driver cursor throws the
error from `next()`, `hasNext()`, `toArray()` or `for await`, and you start a
new one to try again.

## Old servers

A server older than 0.3.0 does not know these options and would ignore them,
which would leave the query unbounded. The driver therefore refuses to send a
limit to a server that does not advertise the `query-budgets` capability, and
throws `SinterCompatibilityError`. Requests without limits work against any
server.
