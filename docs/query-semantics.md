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
- A missing field, a field of another kind, and an array or document never
  match.
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

A stored array is one value. Equality matches the whole array, and range
operators never match it. The one exception is `$in` (and so `$nin`), which
also match when any element of a stored array equals a listed value. Dotted
paths do not look inside arrays.

## Other operators

- `$ne` matches a missing field. It is the exact opposite of `$eq`.
- `$in` matches when the field equals any listed value. `$in: []` matches
  nothing. `$nin` is the exact opposite of `$in`, so `$nin: []` matches every
  document, including those missing the field.
- `$exists` takes a boolean. A field holding `null` exists.
- `$not` takes an operator document and matches when the field does not satisfy
  it. A missing field and a field of another kind both satisfy a `$not` around
  a range operator, because the range operator did not match them.
- `$and`, `$or`, and `$nor` take a non-empty array of filters.
- An empty filter `{}` matches every document.
- A dotted path such as `"a.b"` reads field `b` of the document held in `a`. A
  path through a value that is not a document does not match.

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

Values that compare equal keep their existing order, so a sort is stable. A
sort with several fields compares the first field, then the second for ties,
and so on.

## Examples

Each row is a filter, a document, and whether the filter matches it.

| Filter                      | Document              | Matches |
| --------------------------- | --------------------- | ------- |
| `{"a":1}`                   | `{"a":1}`             | yes     |
| `{"a":1}`                   | `{"a":2}`             | no      |
| `{"a":1}`                   | `{"a":"1"}`           | no      |
| `{"a":null}`                | `{"a":null}`          | yes     |
| `{"a":null}`                | `{}`                  | no      |
| `{"a":{"$exists":false}}`   | `{"a":null}`          | no      |
| `{"a":{"$exists":true}}`    | `{"a":null}`          | yes     |
| `{"a":{"$ne":1}}`           | `{}`                  | yes     |
| `{"a":{"$ne":1}}`           | `{"a":"1"}`           | yes     |
| `{"a":{"$gt":1}}`           | `{"a":2}`             | yes     |
| `{"a":{"$gt":1}}`           | `{"a":"2"}`           | no      |
| `{"a":{"$gt":1}}`           | `{"a":[5]}`           | no      |
| `{"a":{"$lt":"b"}}`         | `{"a":"B"}`           | yes     |
| `{"a":{"$lt":"b"}}`         | `{"a":"a"}`           | yes     |
| `{"a":{"x":1,"y":2}}`       | `{"a":{"y":2,"x":1}}` | yes     |
| `{"a":{"x":1}}`             | `{"a":{"x":1,"y":2}}` | no      |
| `{"a":[1,2]}`               | `{"a":[1,2]}`         | yes     |
| `{"a":[1,2]}`               | `{"a":[2,1]}`         | no      |
| `{"a.b":1}`                 | `{"a":{"b":1}}`       | yes     |
| `{"a.b":1}`                 | `{"a":5}`             | no      |
| `{"a":{"$in":[1,2]}}`       | `{"a":2}`             | yes     |
| `{"a":{"$in":[]}}`          | `{"a":1}`             | no      |
| `{"a":{"$nin":[]}}`         | `{}`                  | yes     |
| `{"a":{"$nin":[1]}}`        | `{}`                  | yes     |
| `{"a":{"$not":{"$gt":1}}}`  | `{}`                  | yes     |
| `{"a":{"$not":{"$gt":1}}}`  | `{"a":"s"}`           | yes     |
| `{"a":{"$not":{"$gt":1}}}`  | `{"a":2}`             | no      |
| `{"$or":[{"a":1},{"b":1}]}` | `{"b":1}`             | yes     |
| `{"$nor":[{"a":1}]}`        | `{"a":1}`             | no      |
| `{}`                        | `{"a":1}`             | yes     |
