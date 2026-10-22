import type { CustomId } from "sinterdb-protocol";

import type { WithId } from "./collection.js";
import type { AtomicValue, FilterPaths } from "./filter.js";

/** `1` or `true` keeps a field; `0` or `false` removes it. */
export type ProjectionFlag = 0 | 1 | boolean;

/**
 * Which fields a query returns, as field paths mapped to a flag.
 *
 * - `{ name: 1, "address.city": 1 }` returns only those fields (and `_id`).
 * - `{ passwordHash: 0 }` returns everything except those fields.
 * - `_id` is returned unless it is set to `0`, and it is the one field that may
 *   differ from the rest: `{ name: 1, _id: 0 }` is valid.
 * - Inclusion and exclusion cannot be mixed for any other field.
 *
 * Pass the projection inline, or declare it `as const`, so the result type can
 * be worked out from it.
 */
export type Projection<TDocument extends object> = {
  readonly [Path in FilterPaths<TDocument> | "_id"]?: ProjectionFlag;
};

type Flagged<TProjection, TFlag> = {
  [Key in keyof TProjection & string]-?: [
    NonNullable<TProjection[Key]>,
  ] extends [TFlag]
    ? Key
    : never;
}[keyof TProjection & string];

type IncludedPaths<TProjection> = Exclude<
  Flagged<TProjection, 1 | true>,
  "_id"
>;
type ExcludedPaths<TProjection> = Exclude<
  Flagged<TProjection, 0 | false>,
  "_id"
>;

/** Paths whose flag is not a literal, so the result cannot be known. */
type UnknownPaths<TProjection> = Exclude<
  keyof TProjection & string,
  Flagged<TProjection, 1 | true> | Flagged<TProjection, 0 | false>
>;

type HeadOf<TPath extends string> = TPath extends `${infer THead}.${string}`
  ? THead
  : TPath;

type TailOf<
  TPath extends string,
  THead extends string,
> = TPath extends `${THead}.${infer TTail}` ? TTail : never;

type Simplify<TValue> = { [Key in keyof TValue]: TValue[Key] } & {};

/** Whether a value is always an object or an array of them. */
type AlwaysNested<TValue> = [TValue] extends [object | readonly unknown[]]
  ? [TValue] extends [AtomicValue]
    ? false
    : true
  : false;

type Keep<
  TValue,
  TPaths extends string,
> = TValue extends readonly (infer TElement)[]
  ? Keep<Extract<TElement, object>, TPaths>[]
  : TValue extends AtomicValue | Date | Uint8Array | CustomId
    ? never
    : TValue extends object
      ? Simplify<
          {
            [
              Key in keyof TValue as Key extends string
                ? Key extends TPaths
                  ? Key
                  : never
                : never
            ]: TValue[Key];
          } & {
            [
              Key in keyof TValue as Key extends string
                ? Key extends HeadOf<TPaths>
                  ? Key extends TPaths
                    ? never
                    : AlwaysNested<TValue[Key]> extends true
                      ? Key
                      : never
                  : never
                : never
            ]: Keep<TValue[Key], TailOf<TPaths, Key & string>>;
          } & {
            [
              Key in keyof TValue as Key extends string
                ? Key extends HeadOf<TPaths>
                  ? Key extends TPaths
                    ? never
                    : AlwaysNested<TValue[Key]> extends true
                      ? never
                      : Key
                  : never
                : never
            ]?: Keep<TValue[Key], TailOf<TPaths, Key & string>>;
          }
        >
      : never;

type Drop<
  TValue,
  TPaths extends string,
> = TValue extends readonly (infer TElement)[]
  ? Drop<TElement, TPaths>[]
  : TValue extends AtomicValue | Date | Uint8Array | CustomId
    ? TValue
    : TValue extends object
      ? Simplify<{
          [
            Key in keyof TValue as Key extends string
              ? Key extends TPaths
                ? never
                : Key
              : Key
          ]: Key extends HeadOf<TPaths>
            ? Drop<TValue[Key], TailOf<TPaths, Key & string>>
            : TValue[Key];
        }>
      : TValue;

type IdPart<TProjection> = TProjection extends {
  readonly _id: infer TFlag;
}
  ? [NonNullable<TFlag>] extends [0 | false]
    ? unknown
    : { readonly _id: CustomId }
  : { readonly _id: CustomId };

/**
 * The type of the documents a query returns for a projection.
 *
 * Without a projection it is `WithId<TDocument>`. When the projection's flags
 * are not literals, every field becomes optional because the result cannot be
 * known.
 */
export type ProjectedDocument<TDocument extends object, TProjection> = [
  TProjection,
] extends [undefined]
  ? WithId<TDocument>
  : [UnknownPaths<TProjection>] extends [never]
    ? [IncludedPaths<TProjection>] extends [never]
      ? [Flagged<TProjection, 1 | true>] extends [never]
        ? [ExcludedPaths<TProjection>] extends [never]
          ? [Flagged<TProjection, 0 | false>] extends [never]
            ? WithId<TDocument>
            : Simplify<Omit<TDocument, "_id">>
          : Simplify<
              Drop<Omit<TDocument, "_id">, ExcludedPaths<TProjection>> &
                IdPart<TProjection>
            >
        : {
            /** The document's `_id`. */
            readonly _id: CustomId;
          }
      : Simplify<
          Keep<Omit<TDocument, "_id">, IncludedPaths<TProjection>> &
            IdPart<TProjection>
        >
    : Partial<WithId<TDocument>>;
