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
    };

/** Options for {@link SinterCollection.aggregate}. */
export interface AggregateOptions {
  /**
   * How many documents the cursor fetches from the server per round trip.
   */
  readonly batchSize?: number;
}
