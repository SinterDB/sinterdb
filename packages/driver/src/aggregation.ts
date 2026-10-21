import type { CustomId } from "sinterdb-protocol";

import type { QueryBudgetOptions } from "./budget.js";
import type { Filter, Sort } from "./filter.js";
import type { Projection } from "./projection.js";

/**
 * One stage of an aggregation pipeline. Each stage is an object with a single
 * `$` key. Documents flow through the stages in order.
 *
 * - `$match` keeps the documents that match a filter, like `find`. A `$match`
 *   at the start of the pipeline can use an index.
 * - `$project` reshapes documents, like the `projection` option of `find`.
 * - `$sort` orders documents, as `[path, direction]` pairs like the `sort`
 *   option of `find`. It is an array of pairs because the order of an object's
 *   keys is not preserved.
 * - `$skip` drops that many documents.
 * - `$limit` keeps at most that many documents.
 * - `$count` replaces the documents with one document holding their number
 *   under the given name, or with nothing when there were no documents.
 * - `$group` replaces the documents with one document per distinct key, with
 *   values computed by accumulators (see {@link GroupSpecification}).
 *
 * A `$sort` directly followed by `$limit` (and at most a `$skip`) keeps only
 * the documents it needs while sorting, so it can run over a large collection
 * without holding all of it in memory.
 */
export type AggregationStage<TDocument extends object> =
  | {
      /** Keeps the documents that match this filter. */
      readonly $match: Filter<TDocument>;
    }
  | {
      /** Reshapes each document, as a `find` projection does. */
      readonly $project: Projection<TDocument>;
    }
  | {
      /** Orders the documents by these `[path, direction]` pairs. */
      readonly $sort: Sort<TDocument>;
    }
  | {
      /** Drops this many documents. */
      readonly $skip: number;
    }
  | {
      /** Keeps at most this many documents. */
      readonly $limit: number;
    }
  | {
      /** The field name that holds the number of documents that arrived. */
      readonly $count: string;
    }
  | {
      /** Groups the documents by key and computes values for each group. */
      readonly $group: GroupSpecification;
    };

/**
 * A value in a `$group` stage: a field reference or a literal. A string that
 * starts with `$` names a field of the incoming document (`"$age"`, or
 * `"$address.city"` for a nested one). A document without the field gives
 * `null` in a key. Any other value is a literal. There is no way to write a
 * literal string that starts with `$`.
 */
export type GroupValue =
  string | number | bigint | boolean | null | Date | Uint8Array | CustomId;

/**
 * What a `$group` stage computes for each group. Each is an object with one
 * key.
 *
 * - `{ $count: {} }` the number of documents in the group.
 * - `{ $sum: value }` the total of the numbers. Values that are not numbers
 *   are ignored, and the total is `0` when there are none. A group may add
 *   numbers or bigint values, not both, and a bigint total must stay within
 *   the signed 64-bit range.
 * - `{ $avg: value }` the mean of the numbers, or `null` when there are none.
 *   Values that are not numbers are ignored. It does not accept bigint values.
 * - `{ $min: value }` and `{ $max: value }` the smallest and largest value by
 *   the sort order of the query semantics, ignoring documents that lack the
 *   field. `null` when no document has it.
 * - `{ $first: value }` and `{ $last: value }` the value from the first or
 *   last document of the group in the order the documents arrived, or `null`
 *   when that document lacks the field.
 */
export type GroupAccumulator =
  | {
      /** The number of documents in the group. Always `{}`. */
      readonly $count: Readonly<Record<string, never>>;
    }
  | {
      /** The total of the numbers. */
      readonly $sum: GroupValue;
    }
  | {
      /** The mean of the numbers. */
      readonly $avg: GroupValue;
    }
  | {
      /** The smallest value. */
      readonly $min: GroupValue;
    }
  | {
      /** The largest value. */
      readonly $max: GroupValue;
    }
  | {
      /** The value from the first document. */
      readonly $first: GroupValue;
    }
  | {
      /** The value from the last document. */
      readonly $last: GroupValue;
    };

/**
 * The argument of `$group`: an `_id` that says how to group, plus any number
 * of output fields, each computed by an accumulator.
 *
 * `_id` is a field reference such as `"$team"`, a literal (`null` puts every
 * document in one group), or a document of up to 8 field references or
 * literals for a compound key. Two documents are in the same group when their
 * keys are equal as filters see equality, so `1` and `1n` are different
 * groups. Groups come out in the order their first document arrived, and at
 * most 100,000 groups may exist at once.
 */
export interface GroupSpecification {
  /** How to group: a field reference, a literal, or a compound key. */
  readonly _id: GroupValue | { readonly [name: string]: GroupValue };
  /**
   * An output field computed by an accumulator. The name must not be empty,
   * start with `$`, or contain `.`.
   */
  readonly [field: string]:
    GroupAccumulator | GroupValue | { readonly [name: string]: GroupValue };
}

/** Options for {@link SinterCollection.aggregate}. */
export interface AggregateOptions extends QueryBudgetOptions {
  /**
   * How many documents the cursor fetches from the server per round trip.
   */
  readonly batchSize?: number;
}
