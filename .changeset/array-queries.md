---
"sinterdb": minor
"@sinterdb-internal/storage": minor
---

Array queries.

- Add `$elemMatch` and `$size`, and let dotted paths step through arrays of documents (`"items.sku"`) or pick an element by position (`"items.0"`).
- Behavior change: `{ tags: "x" }` now matches `{ tags: ["x", "y"] }`.
- Behavior change: `{ scores: { $gt: 90 } }` now matches when any element is above 90.
- Behavior change: `{ tags: { $ne: "x" } }` and `$nin` now exclude documents whose array contains the value. Before, they wrongly included them.
- An index is not used once any indexed document has an array in the indexed field, or on the path to it. Queries on that field scan the collection instead, which costs speed but not correctness.
