import type { CustomId } from "sinterdb-protocol";

import type {
  ComparableValue,
  ElementOf,
  FieldPaths,
  FilterPathValue,
} from "./filter.js";

/**
 * The field paths an update can change: every path except `_id`, which is
 * immutable.
 */
export type UpdatePaths<TDocument extends object> = Exclude<
  FieldPaths<TDocument>,
  "_id" | `_id.${string}`
>;

/** The updatable paths whose value type is assignable to `TKind`. */
export type PathsMatching<TDocument extends object, TKind> = {
  [Path in UpdatePaths<TDocument>]: [
    NonNullable<FilterPathValue<TDocument, Path>>,
  ] extends [TKind]
    ? Path
    : never;
}[UpdatePaths<TDocument>];

/** Updatable paths that hold a number or bigint, the targets of `$inc`. */
export type NumericPaths<TDocument extends object> = PathsMatching<
  TDocument,
  number | bigint
>;

/**
 * Updatable paths that hold a comparable value, the targets of `$min` and
 * `$max`.
 */
export type ComparablePaths<TDocument extends object> = PathsMatching<
  TDocument,
  ComparableValue | boolean
>;

/**
 * Updatable paths that hold an array, the targets of `$push`, `$addToSet` and
 * `$pull`.
 */
export type ArrayPaths<TDocument extends object> = PathsMatching<
  TDocument,
  readonly unknown[]
>;

/** Options for updates and replacements. */
export interface UpdateOptions {
  /**
   * Insert a new document when nothing matches the filter.
   */
  readonly upsert?: boolean;
}

/**
 * An update document built from operators: `$set`, `$unset`, `$inc`, `$min`,
 * `$max`, `$push`, `$addToSet` and `$pull`. Each operator accepts only paths
 * of a matching type.
 */
export type UpdateFilter<TDocument extends object> = {
  /** Sets fields to values, creating them when missing. */
  readonly $set?: {
    readonly [Path in UpdatePaths<TDocument>]?: FilterPathValue<
      TDocument,
      Path
    >;
  };
  /** Removes fields. */
  readonly $unset?: {
    readonly [Path in UpdatePaths<TDocument>]?: true | 1;
  };
  /** Adds a number to numeric fields. A missing field is set to the number. */
  readonly $inc?: {
    readonly [Path in NumericPaths<TDocument>]?: NonNullable<
      FilterPathValue<TDocument, Path>
    >;
  };
  /** Lowers a field to the given value when the value is smaller. A missing field is set to the value. */
  readonly $min?: {
    readonly [Path in ComparablePaths<TDocument>]?: NonNullable<
      FilterPathValue<TDocument, Path>
    >;
  };
  /** Raises a field to the given value when the value is larger. A missing field is set to the value. */
  readonly $max?: {
    readonly [Path in ComparablePaths<TDocument>]?: NonNullable<
      FilterPathValue<TDocument, Path>
    >;
  };
  /** Appends a value to an array, creating the array when the field is missing. */
  readonly $push?: {
    readonly [Path in ArrayPaths<TDocument>]?: ElementOf<
      NonNullable<FilterPathValue<TDocument, Path>>
    >;
  };
  /** Appends a value to an array unless an equal element is already present. A missing field becomes a new array. */
  readonly $addToSet?: {
    readonly [Path in ArrayPaths<TDocument>]?: ElementOf<
      NonNullable<FilterPathValue<TDocument, Path>>
    >;
  };
  /** Removes every matching element from an array. */
  readonly $pull?: {
    readonly [Path in ArrayPaths<TDocument>]?: ElementOf<
      NonNullable<FilterPathValue<TDocument, Path>>
    >;
  };
};

/** The result of an update or replace. */
export interface UpdateResult {
  /** Always `true`; a failed update throws instead. */
  readonly acknowledged: true;
  /** How many documents matched the filter. */
  readonly matchedCount: number;
  /**
   * How many documents actually changed. A document whose stored bytes are
   * identical after the update is not counted.
   */
  readonly modifiedCount: number;
  /**
   * The `_id` of the inserted document when an upsert inserted one, otherwise
   * `null`. In that case `matchedCount` is 0.
   */
  readonly upsertedId: CustomId | null;
}

/** The result of a delete. */
export interface DeleteResult {
  /** Always `true`; a failed delete throws instead. */
  readonly acknowledged: true;
  /** How many documents were deleted. */
  readonly deletedCount: number;
}
