import type { Document, DocumentValue } from "sinterdb-protocol";

import { pathTouchesArray, resolveField } from "../filter.js";
import { compareOptionalValues } from "../sort.js";
import type { IndexBound, IndexConflict } from "./field-index.js";
import type { IndexContents, SecondaryIndex } from "./secondary-index.js";
import type { IndexSpec } from "./spec.js";
import {
  canonicalKey,
  compareSameClass,
  describeValue,
  valueClassOf,
  type ValueClass,
} from "./values.js";

/** One value per indexed field; `undefined` is a field the document lacks. */
type Tuple = readonly (DocumentValue | undefined)[];

/** Up to this many value combinations are counted exactly when planning. */
const EXACT_ESTIMATE_LIMIT = 64;

/** A range on the field right after the fixed leading fields. */
export interface CompoundRange {
  readonly valueClass: ValueClass;
  readonly lower?: IndexBound;
  readonly upper?: IndexBound;
}

interface OrderedEntry {
  readonly tuple: Tuple;
  readonly key: string;
}

/**
 * An index over several fields. Documents are grouped by the combination of
 * their values, and the combinations are kept in order (each field in its own
 * direction, a missing field first) so a query that fixes the first few fields
 * can find its documents without reading the others.
 *
 * Like a single-field index it holds each document once, so it is set aside
 * when any document holds an array in one of the fields.
 */
export class CompoundIndex implements SecondaryIndex {
  private readonly paths: readonly (readonly string[])[];
  private readonly byTuple = new Map<string, Set<string>>();
  private readonly ordered: OrderedEntry[] = [];
  private unsorted = false;
  private readonly arrayDocuments = new Set<string>();
  private indexedDocuments = 0;

  public constructor(public readonly spec: IndexSpec) {
    this.paths = spec.keys.map((key) => key.field.split("."));
  }

  public get hasArrayValues(): boolean {
    return this.arrayDocuments.size > 0;
  }

  public get documentCount(): number {
    return this.indexedDocuments;
  }

  public add(docKey: string, document: Document, bulk = false): void {
    if (this.paths.some((path) => pathTouchesArray(document, path))) {
      this.arrayDocuments.add(docKey);
    }

    const tuple = this.tupleOf(document);

    if (this.spec.sparse && tuple.every((value) => value === undefined)) {
      return;
    }

    const key = tupleKey(tuple);
    let keys = this.byTuple.get(key);

    if (keys === undefined) {
      keys = new Set();
      this.byTuple.set(key, keys);

      if (bulk) {
        this.ordered.push({ tuple, key });
        this.unsorted = true;
      } else {
        this.ordered.splice(this.lowerBound(tuple), 0, { tuple, key });
      }
    }

    keys.add(docKey);
    this.indexedDocuments += 1;
  }

  public finishBulk(): void {
    if (this.unsorted) {
      this.ordered.sort((left, right) => this.compare(left.tuple, right.tuple));
      this.unsorted = false;
    }
  }

  public remove(docKey: string, document: Document): void {
    this.arrayDocuments.delete(docKey);

    const tuple = this.tupleOf(document);

    if (this.spec.sparse && tuple.every((value) => value === undefined)) {
      return;
    }

    const key = tupleKey(tuple);
    const keys = this.byTuple.get(key);

    if (keys === undefined || !keys.delete(docKey)) {
      return;
    }

    if (keys.size === 0) {
      this.byTuple.delete(key);
      this.removeOrdered(tuple, key);
    }

    this.indexedDocuments -= 1;
  }

  public conflictFor(
    docKey: string,
    document: Document,
  ): IndexConflict | undefined {
    if (!this.spec.unique) {
      return undefined;
    }

    const tuple = this.tupleOf(document);

    if (this.spec.sparse && tuple.every((value) => value === undefined)) {
      return undefined;
    }

    const keys = this.byTuple.get(tupleKey(tuple));

    if (keys === undefined) {
      return undefined;
    }

    for (const other of keys) {
      if (other !== docKey) {
        return {
          index: this.spec.name,
          field: this.spec.keys.map((key) => key.field).join(", "),
          description: `values ${this.describe(tuple)}`,
        };
      }
    }

    return undefined;
  }

  /**
   * The documents whose first fields equal `values`, which may be fewer values
   * than the index has fields.
   */
  public lookupPrefix(values: readonly DocumentValue[]): Set<string> {
    const result = new Set<string>();

    if (values.length === this.spec.keys.length) {
      for (const docKey of this.byTuple.get(tupleKey(values)) ?? []) {
        result.add(docKey);
      }

      return result;
    }

    const { start, end } = this.prefixRange(values);

    for (let position = start; position < end; position += 1) {
      const entry = this.ordered[position] as OrderedEntry;

      if (!matchesPrefix(entry.tuple, values)) {
        continue;
      }

      for (const docKey of this.byTuple.get(entry.key) ?? []) {
        result.add(docKey);
      }
    }

    return result;
  }

  public estimatePrefix(values: readonly DocumentValue[]): number {
    if (values.length === this.spec.keys.length) {
      return this.byTuple.get(tupleKey(values))?.size ?? 0;
    }

    const { start, end } = this.prefixRange(values);

    if (end - start <= EXACT_ESTIMATE_LIMIT) {
      let total = 0;

      for (let position = start; position < end; position += 1) {
        const entry = this.ordered[position] as OrderedEntry;

        if (matchesPrefix(entry.tuple, values)) {
          total += this.byTuple.get(entry.key)?.size ?? 0;
        }
      }

      return total;
    }

    const average =
      this.byTuple.size === 0 ? 0 : this.indexedDocuments / this.byTuple.size;

    return Math.ceil((end - start) * average);
  }

  /**
   * The documents whose first fields equal `prefix` and whose next field falls
   * in `range`. The prefix may be empty, which is a range on the first field.
   */
  public lookupRange(
    prefix: readonly DocumentValue[],
    range: CompoundRange,
  ): Set<string> {
    const result = new Set<string>();
    const { start, end } = this.rangeWindow(prefix, range);

    for (let position = start; position < end; position += 1) {
      const entry = this.ordered[position] as OrderedEntry;

      if (!inRange(entry.tuple, prefix, range)) {
        continue;
      }

      for (const docKey of this.byTuple.get(entry.key) ?? []) {
        result.add(docKey);
      }
    }

    return result;
  }

  public estimateRange(
    prefix: readonly DocumentValue[],
    range: CompoundRange,
  ): number {
    const { start, end } = this.rangeWindow(prefix, range);

    if (end - start <= EXACT_ESTIMATE_LIMIT) {
      let total = 0;

      for (let position = start; position < end; position += 1) {
        const entry = this.ordered[position] as OrderedEntry;

        if (inRange(entry.tuple, prefix, range)) {
          total += this.byTuple.get(entry.key)?.size ?? 0;
        }
      }

      return total;
    }

    const average =
      this.byTuple.size === 0 ? 0 : this.indexedDocuments / this.byTuple.size;

    return Math.ceil((end - start) * average);
  }

  public contents(): IndexContents {
    const values = [...this.byTuple]
      .map(([key, docKeys]) => [key, [...docKeys].sort()] as [string, string[]])
      .sort((left, right) =>
        left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0,
      );
    const problems: string[] = [];

    for (let position = 0; position < this.ordered.length; position += 1) {
      const entry = this.ordered[position] as OrderedEntry;

      if (!this.byTuple.has(entry.key)) {
        problems.push("an ordered entry has no documents");
      }

      const previous = this.ordered[position - 1];

      if (
        previous !== undefined &&
        this.compare(previous.tuple, entry.tuple) > 0
      ) {
        problems.push("ordered entries are out of order");
      }
    }

    if (this.ordered.length !== this.byTuple.size) {
      problems.push(
        `there are ${this.ordered.length} ordered entries for ${this.byTuple.size} value combinations`,
      );
    }

    return { values, missing: [], orderedProblems: problems };
  }

  public orderedKeyCount(): number {
    return this.ordered.length;
  }

  private tupleOf(document: Document): Tuple {
    return this.paths.map((path) => {
      const field = resolveField(document, path);

      return field.found ? field.value : undefined;
    });
  }

  private describe(tuple: Tuple): string {
    const parts = this.spec.keys.map((key, position) => {
      const value = tuple[position];

      return `${key.field}: ${value === undefined ? "(missing)" : describeValue(value)}`;
    });

    return `(${parts.join(", ")})`;
  }

  /** Orders tuples field by field, each in its own direction. */
  private compare(left: Tuple, right: Tuple): number {
    for (let position = 0; position < this.spec.keys.length; position += 1) {
      const comparison = compareOptionalValues(left[position], right[position]);

      if (comparison !== 0) {
        return comparison * (this.spec.keys[position]?.direction ?? 1);
      }
    }

    return 0;
  }

  /** Compares only the first fields, for finding where a prefix starts. */
  private comparePrefix(
    tuple: Tuple,
    values: readonly DocumentValue[],
  ): number {
    for (let position = 0; position < values.length; position += 1) {
      const comparison = compareOptionalValues(
        tuple[position],
        values[position],
      );

      if (comparison !== 0) {
        return comparison * (this.spec.keys[position]?.direction ?? 1);
      }
    }

    return 0;
  }

  /**
   * The span of ordered entries that compare equal to the prefix. Values that
   * compare equal without being identical (`1` and `1n`) share a span, so the
   * caller still checks each entry.
   */
  private prefixRange(values: readonly DocumentValue[]): {
    start: number;
    end: number;
  } {
    let low = 0;
    let high = this.ordered.length;

    while (low < high) {
      const middle = (low + high) >>> 1;

      if (
        this.comparePrefix(
          (this.ordered[middle] as OrderedEntry).tuple,
          values,
        ) < 0
      ) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    const start = low;

    high = this.ordered.length;

    while (low < high) {
      const middle = (low + high) >>> 1;

      if (
        this.comparePrefix(
          (this.ordered[middle] as OrderedEntry).tuple,
          values,
        ) <= 0
      ) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    return { start, end: low };
  }

  /**
   * A span of ordered entries that holds every entry in the range. Inside the
   * prefix the entries are ordered by the next field, in its direction, so the
   * bounds can be found by binary search. Entries of other kinds of value can
   * sit inside the span, so the caller still checks each one.
   */
  private rangeWindow(
    prefix: readonly DocumentValue[],
    range: CompoundRange,
  ): { start: number; end: number } {
    const span = this.prefixRange(prefix);
    const direction = this.spec.keys[prefix.length]?.direction ?? 1;
    const position = prefix.length;
    const compareTo = (index: number, bound: IndexBound): number =>
      compareOptionalValues(
        (this.ordered[index] as OrderedEntry).tuple[position],
        bound.value,
      );
    const first = (
      from: number,
      to: number,
      reached: (index: number) => boolean,
    ): number => {
      let low = from;
      let high = to;

      while (low < high) {
        const middle = (low + high) >>> 1;

        if (reached(middle)) {
          high = middle;
        } else {
          low = middle + 1;
        }
      }

      return low;
    };

    let start = span.start;
    let end = span.end;

    if (direction === 1) {
      if (range.lower !== undefined) {
        const lower = range.lower;

        start = first(span.start, span.end, (i) => compareTo(i, lower) >= 0);
      }

      if (range.upper !== undefined) {
        const upper = range.upper;

        end = first(start, span.end, (i) => compareTo(i, upper) > 0);
      }
    } else {
      if (range.upper !== undefined) {
        const upper = range.upper;

        start = first(span.start, span.end, (i) => compareTo(i, upper) <= 0);
      }

      if (range.lower !== undefined) {
        const lower = range.lower;

        end = first(start, span.end, (i) => compareTo(i, lower) < 0);
      }
    }

    return { start, end };
  }

  private lowerBound(tuple: Tuple): number {
    let low = 0;
    let high = this.ordered.length;

    while (low < high) {
      const middle = (low + high) >>> 1;

      if (
        this.compare((this.ordered[middle] as OrderedEntry).tuple, tuple) < 0
      ) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    return low;
  }

  private removeOrdered(tuple: Tuple, key: string): void {
    for (
      let position = this.lowerBound(tuple);
      position < this.ordered.length &&
      this.compare((this.ordered[position] as OrderedEntry).tuple, tuple) === 0;
      position += 1
    ) {
      if ((this.ordered[position] as OrderedEntry).key === key) {
        this.ordered.splice(position, 1);

        return;
      }
    }
  }
}

/** An unambiguous string for a combination of values. */
function tupleKey(tuple: Tuple): string {
  let result = "";

  for (const value of tuple) {
    if (value === undefined) {
      result += "m";
    } else {
      const key = canonicalKey(value);

      result += `v${key.length}:${key}`;
    }
  }

  return result;
}

function matchesPrefix(
  tuple: Tuple,
  values: readonly DocumentValue[],
): boolean {
  return values.every((value, position) => {
    const found = tuple[position];

    return found !== undefined && canonicalKey(found) === canonicalKey(value);
  });
}

function inRange(
  tuple: Tuple,
  prefix: readonly DocumentValue[],
  range: CompoundRange,
): boolean {
  if (!matchesPrefix(tuple, prefix)) {
    return false;
  }

  const value = tuple[prefix.length];

  if (value === undefined || valueClassOf(value) !== range.valueClass) {
    return false;
  }

  if (range.lower !== undefined) {
    const comparison = compareSameClass(value, range.lower.value);

    if (comparison < 0 || (comparison === 0 && !range.lower.inclusive)) {
      return false;
    }
  }

  if (range.upper !== undefined) {
    const comparison = compareSameClass(value, range.upper.value);

    if (comparison > 0 || (comparison === 0 && !range.upper.inclusive)) {
      return false;
    }
  }

  return true;
}
