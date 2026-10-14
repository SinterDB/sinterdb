# Query semantics

This page defines how SinterDB compares values. It applies to filters,
sorting, and indexes, which always agree with each other. A specification test
(`packages/storage/src/query-semantics.test.ts`) runs the examples on this page
against the real code, so the page cannot drift from the behavior.

## Value kinds

Every value has one kind:

| Kind       | JavaScript values                                   |
| ---------- | --------------------------------------------------- |
| `null`     | `null`                                              |
| `number`   | `number` (including `NaN` and `Infinity`), `bigint` |
| `string`   | `string`                                            |
| `binary`   | `Uint8Array`                                        |
| `id`       | `CustomId`                                          |
| `boolean`  | `boolean`                                           |
| `date`     | `Date`                                              |
| `array`    | `Array`                                             |
| `document` | a plain object                                      |

A field that is not in the document is _missing_. Missing is not a kind, and it
is not the same as `null`.

## Equality

`{ field: value }` and `$eq` match when the stored value and the operand have
the same canonical encoding, the exact bytes SinterDB stores. This means:

- A field matches only a value of the same kind. `1` does not match `"1"`.
- The `number` kind has two encodings. `1` (a JavaScript number) and `1n` (a
  `bigint`) are different values and never equal each other.
- `NaN` equals `NaN`.
- `0` and `-0` are different values. (They are equal under range operators and
  sorting. Avoid storing `-0`.)
- Documents are equal when they hold the same fields with equal values, in any
  key order. Arrays are equal when they hold equal elements in the same order.
- `null` matches only a stored `null`, never a missing field. Use
  `{ $exists: false }` for a missing field.

## Range operators

`$gt`, `$gte`, `$lt`, and `$lte` compare a field with an operand of one of
these kinds: string, number, bigint, date, binary, or `CustomId`. An operand of
any other kind, `NaN`, or an infinite number is rejected with `InvalidFilter`.

A range operator only matches a stored value of the same type as the operand:

- Numbers match numbers, and bigints match bigints. A number never matches a
  bigint operand, or the reverse.
- A stored `NaN` or infinite number never matches a range operator.
- A missing field, a field of another kind, and a document never match. An
  array matches when one of its elements does (see [Arrays](#arrays)).
- `0` and `-0` are equal.

Within a type, values order as follows:

| Type       | Order                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| string     | By Unicode code point, which is also the order of the UTF-8 bytes.     |
| number     | By numeric value.                                                      |
| bigint     | By numeric value.                                                      |
| date       | By time. An invalid date is not comparable.                            |
| binary     | Byte by byte. When one is a prefix of the other, the shorter is first. |
| `CustomId` | By its bytes, the same as binary.                                      |

Strings are compared exactly as stored. There is no case folding, no locale,
and no Unicode normalization: `"B"` sorts before `"a"`, and a composed `"é"`
differs from `"e"` followed by a combining accent.

## Arrays

A filter on a field that holds an array looks at the array's elements as well
as the array itself:

- **Equality.** `{ tags: "x" }` matches `{ tags: ["x", "y"] }`, because one
  element equals `"x"`. `{ tags: ["x", "y"] }` matches that exact array (same
  elements, same order), and also an array that holds `["x", "y"]` as one of
  its elements.
- **Ranges.** `{ scores: { $gt: 90 } }` matches when any element is greater
  than 90.
- **`$in`.** Matches when the array itself or any element equals a listed
  value.
- **`$ne` and `$nin`.** These are the exact opposites of `$eq` and `$in`. So
  `{ tags: { $ne: "x" } }` does not match `{ tags: ["x", "y"] }`.
- **Several conditions.** Each condition is tested on its own, so
  `{ scores: { $gt: 90, $lt: 95 } }` matches `[80, 99]`: one element is above
  90 and another is below 95. To require one element to satisfy all of them,
  use `$elemMatch`.
- **`$elemMatch`.** Matches an array when one element satisfies every
  condition. Give it operators to test elements as values
  (`{ scores: { $elemMatch: { $gt: 90, $lt: 95 } } }`), or a filter to test
  elements that are documents
  (`{ items: { $elemMatch: { sku: "a", qty: { $gt: 1 } } } }`).
- **`$size`.** `{ tags: { $size: 2 } }` matches an array of exactly two
  elements. The size must be a non-negative integer. A value that is not an
  array never matches.

Elements are searched one level deep. `{ a: 1 }` matches `{ a: [1, 2] }`, but
not `{ a: [[1, 2]] }`.

A dotted path steps through arrays too:

- `"items.sku"` reads `sku` from every element of `items` that is a document,
  and matches when any of them satisfies the condition.
- A number selects an element by position, so `"items.0"` is the first element
  and `"items.0.sku"` is the first element's `sku`. A position past the end of
  the array does not match.
- `$exists` on such a path is true when at least one element has the field.

Sorting is different: it treats an array as one value, and a path that runs
through an array as missing (see [Sort order](#sort-order)).

## Other operators

- `$ne` matches a missing field. It is the exact opposite of `$eq`.
- `$in` matches when the field (or an element of it) equals any listed value. `$in: []` matches
  nothing. `$nin` is the exact opposite of `$in`, so `$nin: []` matches every
  document, including those missing the field.
- `$exists` takes a boolean. A field holding `null` exists.
- `$not` takes an operator document and matches when the field does not satisfy
  it. A missing field and a field of another kind both satisfy a `$not` around
  a range operator, because the range operator did not match them.
- `$and`, `$or`, and `$nor` take a non-empty array of filters.
- An empty filter `{}` matches every document.
- A dotted path such as `"a.b"` reads field `b` of the document held in `a`
  (or of every document in an array held in `a`). A path through any other
  value does not match.

## Sort order

Sorting compares every pair of values, even of different kinds. Values order by
kind first, then by value within a kind. This order, lowest first, is the sort
order for ascending (`1`) sorting:

| Rank | Kind       |
| ---- | ---------- |
| 1    | `missing`  |
| 2    | `null`     |
| 3    | `number`   |
| 4    | `string`   |
| 5    | `binary`   |
| 6    | `id`       |
| 7    | `boolean`  |
| 8    | `date`     |
| 9    | `array`    |
| 10   | `document` |

Descending (`-1`) sorting is the exact reverse, so a missing field comes last.

Within a kind:

- `number` includes bigints. They compare by numeric value, so `1n` sorts
  between `0.5` and `1.5`. `NaN` sorts before every other number, and equals
  itself. `0` and `-0` are equal.
- Strings, binary values, `CustomId` values, and dates order as under range
  operators.
- `false` sorts before `true`.
- Arrays compare equal to every other array, and documents compare equal to
  every other document. Sorting by an array or document field leaves those
  documents in their existing order.
- A sort path that runs through an array (`"items.price"`) counts as missing.

Values that compare equal keep their existing order, so a sort is stable. A
sort with several fields compares the first field, then the second for ties,
and so on.

## Examples

Each row is a filter, a document, and whether the filter matches it.

| Filter                                   | Document                  | Matches |
| ---------------------------------------- | ------------------------- | ------- |
| `{"a":1}`                                | `{"a":1}`                 | yes     |
| `{"a":1}`                                | `{"a":2}`                 | no      |
| `{"a":1}`                                | `{"a":"1"}`               | no      |
| `{"a":null}`                             | `{"a":null}`              | yes     |
| `{"a":null}`                             | `{}`                      | no      |
| `{"a":{"$exists":false}}`                | `{"a":null}`              | no      |
| `{"a":{"$exists":true}}`                 | `{"a":null}`              | yes     |
| `{"a":{"$ne":1}}`                        | `{}`                      | yes     |
| `{"a":{"$ne":1}}`                        | `{"a":"1"}`               | yes     |
| `{"a":{"$gt":1}}`                        | `{"a":2}`                 | yes     |
| `{"a":{"$gt":1}}`                        | `{"a":"2"}`               | no      |
| `{"a":{"$gt":1}}`                        | `{"a":[5]}`               | yes     |
| `{"a":{"$lt":"b"}}`                      | `{"a":"B"}`               | yes     |
| `{"a":{"$lt":"b"}}`                      | `{"a":"a"}`               | yes     |
| `{"a":{"x":1,"y":2}}`                    | `{"a":{"y":2,"x":1}}`     | yes     |
| `{"a":{"x":1}}`                          | `{"a":{"x":1,"y":2}}`     | no      |
| `{"a":[1,2]}`                            | `{"a":[1,2]}`             | yes     |
| `{"a":[1,2]}`                            | `{"a":[2,1]}`             | no      |
| `{"a.b":1}`                              | `{"a":{"b":1}}`           | yes     |
| `{"a.b":1}`                              | `{"a":5}`                 | no      |
| `{"a":{"$in":[1,2]}}`                    | `{"a":2}`                 | yes     |
| `{"a":{"$in":[]}}`                       | `{"a":1}`                 | no      |
| `{"a":{"$nin":[]}}`                      | `{}`                      | yes     |
| `{"a":{"$nin":[1]}}`                     | `{}`                      | yes     |
| `{"a":{"$not":{"$gt":1}}}`               | `{}`                      | yes     |
| `{"a":{"$not":{"$gt":1}}}`               | `{"a":"s"}`               | yes     |
| `{"a":{"$not":{"$gt":1}}}`               | `{"a":2}`                 | no      |
| `{"$or":[{"a":1},{"b":1}]}`              | `{"b":1}`                 | yes     |
| `{"$nor":[{"a":1}]}`                     | `{"a":1}`                 | no      |
| `{}`                                     | `{"a":1}`                 | yes     |
| `{"a":"x"}`                              | `{"a":["x","y"]}`         | yes     |
| `{"a":"z"}`                              | `{"a":["x","y"]}`         | no      |
| `{"a":["x"]}`                            | `{"a":[["x"],"y"]}`       | yes     |
| `{"a":[]}`                               | `{"a":[]}`                | yes     |
| `{"a":{"$gt":1}}`                        | `{"a":[0,1]}`             | no      |
| `{"a":{"$gt":1,"$lt":5}}`                | `{"a":[0,10]}`            | yes     |
| `{"a":{"$elemMatch":{"$gt":1,"$lt":5}}}` | `{"a":[0,10]}`            | no      |
| `{"a":{"$elemMatch":{"$gt":1,"$lt":5}}}` | `{"a":[0,3]}`             | yes     |
| `{"a":{"$elemMatch":{"b":1,"c":2}}}`     | `{"a":[{"b":1},{"c":2}]}` | no      |
| `{"a":{"$elemMatch":{"b":1,"c":2}}}`     | `{"a":[{"b":1,"c":2}]}`   | yes     |
| `{"a":{"$elemMatch":{"b":{"$gt":1}}}}`   | `{"a":[{"b":2}]}`         | yes     |
| `{"a":{"$elemMatch":{"$gt":1}}}`         | `{"a":5}`                 | no      |
| `{"a.b":1}`                              | `{"a":[{"b":1},{"b":2}]}` | yes     |
| `{"a.b":3}`                              | `{"a":[{"b":1},{"b":2}]}` | no      |
| `{"a.1":"y"}`                            | `{"a":["x","y"]}`         | yes     |
| `{"a.2":"y"}`                            | `{"a":["x","y"]}`         | no      |
| `{"a.1.b":2}`                            | `{"a":[{"b":1},{"b":2}]}` | yes     |
| `{"a.b":{"$exists":true}}`               | `{"a":[{"c":1}]}`         | no      |
| `{"a.b":{"$exists":true}}`               | `{"a":[{"c":1},{"b":1}]}` | yes     |
| `{"a":{"$ne":"x"}}`                      | `{"a":["x","y"]}`         | no      |
| `{"a":{"$ne":"z"}}`                      | `{"a":["x","y"]}`         | yes     |
| `{"a":{"$nin":["x"]}}`                   | `{"a":["x","y"]}`         | no      |
| `{"a":{"$in":["y"]}}`                    | `{"a":["x","y"]}`         | yes     |
| `{"a":{"$size":2}}`                      | `{"a":["x","y"]}`         | yes     |
| `{"a":{"$size":1}}`                      | `{"a":["x","y"]}`         | no      |
| `{"a":{"$size":0}}`                      | `{"a":[]}`                | yes     |
| `{"a":{"$size":1}}`                      | `{"a":"x"}`               | no      |
| `{"a":{"$exists":true}}`                 | `{"a":[]}`                | yes     |
| `{"a":{"$not":{"$gt":1}}}`               | `{"a":[5]}`               | no      |
| `{"a":{"$lt":1}}`                        | `{"a":[]}`                | no      |
