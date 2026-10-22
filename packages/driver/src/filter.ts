import type { CustomId } from "sinterdb-protocol";

/** Values that can be compared with `$gt`, `$gte`, `$lt` and `$lte`. */
export type ComparableValue =
  string | number | bigint | Date | Uint8Array | CustomId;

/**
 * Values that can be matched by equality: comparable values, booleans and
 * `null`.
 */
export type AtomicValue = ComparableValue | boolean | null;

/**
 * The element type of an array type, or the type itself when it is not an
 * array.
 */
export type ElementOf<TValue> = TValue extends readonly (infer TElement)[]
  ? TElement
  : TValue;

/**
 * The range operators `$gt`, `$gte`, `$lt` and `$lte`. They are available
 * only when the value type includes a comparable type.
 */
export type ComparisonOperators<TValue> = [
  Extract<ElementOf<TValue>, ComparableValue>,
] extends [never]
  ? unknown
  : {
      /** Greater than. For an array field, any element may be greater. */
      readonly $gt?: Extract<ElementOf<TValue>, ComparableValue>;
      /** Greater than or equal to. */
      readonly $gte?: Extract<ElementOf<TValue>, ComparableValue>;
      /** Less than. */
      readonly $lt?: Extract<ElementOf<TValue>, ComparableValue>;
      /** Less than or equal to. */
      readonly $lte?: Extract<ElementOf<TValue>, ComparableValue>;
    };

/**
 * What a filter can say about the elements of an array: `$size` and
 * `$elemMatch`. They are available only when the value type is an array.
 */
export type ArrayOperators<TValue> = [
  Extract<TValue, readonly unknown[]>,
] extends [never]
  ? unknown
  : {
      /** The array has exactly this many elements. */
      readonly $size?: number;
      /**
       * One element satisfies every condition. Give operators for an array of
       * plain values, or a filter for an array of documents.
       */
      readonly $elemMatch?: ElementMatch<
        ElementOf<Extract<TValue, readonly unknown[]>>
      >;
    };

/** What `$elemMatch` accepts for an array whose elements have this type. */
export type ElementMatch<TElement> = [Extract<TElement, AtomicValue>] extends [
  never,
]
  ? TElement extends object
    ? Filter<TElement>
    : never
  : FilterOperators<TElement>;

/**
 * The operators that can be applied to a single field: `$eq`, `$ne`, `$in`,
 * `$nin`, `$exists`, `$not`, plus the range operators for comparable values and
 * `$size` and `$elemMatch` for arrays.
 */
export type FilterOperators<TValue> = {
  /** Equal to the value. For an array field, matches when any element equals it. */
  readonly $eq?: TValue | ElementOf<TValue>;
  /** Not equal to the value. For an array field, no element may equal it. */
  readonly $ne?: TValue | ElementOf<TValue>;
  /** Equal to any listed value. For an array field, matches when any element equals one. */
  readonly $in?: readonly (TValue | ElementOf<TValue>)[];
  /** Equal to none of the listed values. For an array field, no element may equal one. */
  readonly $nin?: readonly (TValue | ElementOf<TValue>)[];
  /** Whether the field is present. */
  readonly $exists?: boolean;
  /** Matches when the nested operators do not. */
  readonly $not?: FilterOperators<TValue>;
} & ComparisonOperators<TValue> &
  ArrayOperators<TValue>;

/**
 * How many levels of nesting the compiler follows when it builds field paths.
 * Deeper paths still work at runtime but are not suggested or type-checked.
 */
export type MaxPathDepth = 5;

/**
 * What a dotted path steps into: the value itself, or the elements of an
 * array. `items.sku` is a valid path when `items` is an array of documents.
 */
export type PathChild<TValue> = NonNullable<ElementOf<NonNullable<TValue>>>;

/**
 * Every dotted field path of a document type, such as `profile.name`, or
 * `items.sku` for an array of documents. Atomic values and arrays of atomic
 * values end a path.
 */
export type FilterPaths<
  TDocument,
  TDepth extends readonly unknown[] = [],
> = TDepth["length"] extends MaxPathDepth
  ? never
  : TDocument extends object
    ? {
        [Key in keyof TDocument & string]:
          | Key
          | (PathChild<TDocument[Key]> extends readonly unknown[] | AtomicValue
              ? never
              : PathChild<TDocument[Key]> extends object
                ? `${Key}.${FilterPaths<PathChild<TDocument[Key]>, [...TDepth, unknown]>}`
                : never);
      }[keyof TDocument & string]
    : never;

/**
 * Every dotted field path that names a single field: like {@link FilterPaths},
 * but a path never runs through an array. Sorting, updates, and indexes use
 * these paths, because they treat a path through an array as missing or do not
 * support it.
 */
export type FieldPaths<
  TDocument,
  TDepth extends readonly unknown[] = [],
> = TDepth["length"] extends MaxPathDepth
  ? never
  : TDocument extends object
    ? {
        [Key in keyof TDocument & string]:
          | Key
          | (NonNullable<TDocument[Key]> extends
              readonly unknown[] | AtomicValue
              ? never
              : NonNullable<TDocument[Key]> extends object
                ? `${Key}.${FieldPaths<NonNullable<TDocument[Key]>, [...TDepth, unknown]>}`
                : never);
      }[keyof TDocument & string]
    : never;

/**
 * The type of the value at a dotted field path. A path through an array reads
 * the type of the elements.
 */
export type FilterPathValue<
  TDocument,
  TPath extends string,
> = TPath extends keyof TDocument
  ? TDocument[TPath]
  : TPath extends `${infer THead}.${infer TRest}`
    ? THead extends keyof TDocument
      ? FilterPathValue<PathChild<TDocument[THead]>, TRest>
      : never
    : never;

/**
 * A query filter: field paths mapped to a value or to operators, combined
 * with `$and`, `$or` and `$nor`. An empty filter matches every document.
 */
export type Filter<TDocument extends object> = {
  readonly [Path in FilterPaths<TDocument>]?:
    | FilterPathValue<TDocument, Path>
    | ElementOf<FilterPathValue<TDocument, Path>>
    | FilterOperators<FilterPathValue<TDocument, Path>>;
} & {
  /** Matches the document `_id`. */
  readonly _id?: CustomId | FilterOperators<CustomId>;
  /** Matches when every filter matches. */
  readonly $and?: readonly Filter<TDocument>[];
  /** Matches when at least one filter matches. */
  readonly $or?: readonly Filter<TDocument>[];
  /** Matches when no filter matches. */
  readonly $nor?: readonly Filter<TDocument>[];
};

/** `1` for ascending or `-1` for descending. */
export type SortDirection = 1 | -1;

/**
 * A sort order: `[path, direction]` pairs, where earlier pairs take priority.
 */
export type Sort<TDocument extends object> = readonly (readonly [
  path: FieldPaths<TDocument> | "_id",
  direction: SortDirection,
])[];
