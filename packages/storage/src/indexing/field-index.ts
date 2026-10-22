import type { Document, DocumentValue } from "sinterdb-protocol";

import { pathTouchesArray, resolveField } from "../filter.js";
import type { IndexContents, SecondaryIndex } from "./secondary-index.js";
import type { IndexKey, IndexSpec } from "./spec.js";
import {
  canonicalKey,
  compareSameClass,
  describeValue,
  valueClassOf,
  type ValueClass,
} from "./values.js";

export interface IndexBound {
  readonly value: DocumentValue;
  readonly inclusive: boolean;
}

interface OrderedEntry {
  readonly value: DocumentValue;
  readonly key: string;
}

export interface IndexConflict {
  readonly index: string;
  readonly field: string;
  readonly description: string;
}

export class FieldIndex implements SecondaryIndex {
  private readonly segments: readonly string[];
  private readonly byValue = new Map<string, Set<string>>();
  private readonly missing = new Set<string>();
  private readonly ordered = new Map<ValueClass, OrderedEntry[]>();
  private readonly unsorted = new Set<ValueClass>();
  private readonly arrayDocuments = new Set<string>();
  private indexedDocuments = 0;

  public constructor(public readonly spec: IndexSpec) {
    this.segments = (spec.keys[0] as IndexKey).field.split(".");
  }

  /**
   * Whether any indexed document holds an array in the indexed field, or has
   * an array on the way to it. A query matches such a document by its
   * elements, which the index does not hold, so it cannot answer queries
   * about this field.
   */
  public get hasArrayValues(): boolean {
    return this.arrayDocuments.size > 0;
  }

  public get documentCount(): number {
    return this.indexedDocuments;
  }

  public get distinctValues(): number {
    return this.byValue.size;
  }

  public add(docKey: string, document: Document, bulk = false): void {
    if (pathTouchesArray(document, this.segments)) {
      this.arrayDocuments.add(docKey);
    }

    const field = resolveField(document, this.segments);

    if (!field.found) {
      if (!this.spec.sparse) {
        this.missing.add(docKey);
        this.indexedDocuments += 1;
      }

      return;
    }

    const key = canonicalKey(field.value);
    let keys = this.byValue.get(key);

    if (keys === undefined) {
      keys = new Set();
      this.byValue.set(key, keys);
      this.insertOrdered(field.value, key, bulk);
    }

    keys.add(docKey);

    this.indexedDocuments += 1;
  }

  public finishBulk(): void {
    for (const valueClass of this.unsorted) {
      (this.ordered.get(valueClass) as OrderedEntry[]).sort((left, right) =>
        compareSameClass(left.value, right.value),
      );
    }

    this.unsorted.clear();
  }

  public remove(docKey: string, document: Document): void {
    this.arrayDocuments.delete(docKey);

    const field = resolveField(document, this.segments);

    if (!field.found) {
      if (!this.spec.sparse && this.missing.delete(docKey)) {
        this.indexedDocuments -= 1;
      }

      return;
    }

    const key = canonicalKey(field.value);
    const keys = this.byValue.get(key);

    if (keys === undefined || !keys.delete(docKey)) {
      return;
    }

    if (keys.size === 0) {
      this.byValue.delete(key);
      this.removeOrdered(field.value, key);
    }

    this.indexedDocuments -= 1;
  }

  /**
   * Describes the conflict that adding this document would cause, ignoring the
   * document itself.
   */
  public conflictFor(
    docKey: string,
    document: Document,
  ): IndexConflict | undefined {
    if (!this.spec.unique) {
      return undefined;
    }

    const field = resolveField(document, this.segments);

    if (!field.found) {
      if (this.spec.sparse) {
        return undefined;
      }

      const others = [...this.missing].filter((other) => other !== docKey);

      return others.length === 0
        ? undefined
        : this.conflict("a document without the field already exists");
    }

    const keys = this.byValue.get(canonicalKey(field.value));

    if (keys === undefined) {
      return undefined;
    }

    for (const other of keys) {
      if (other !== docKey) {
        return this.conflict(`value ${describeValue(field.value)}`);
      }
    }

    return undefined;
  }

  public lookupEqual(value: DocumentValue): ReadonlySet<string> | undefined {
    return this.byValue.get(canonicalKey(value));
  }

  public estimateEqual(value: DocumentValue): number {
    return this.byValue.get(canonicalKey(value))?.size ?? 0;
  }

  public rangeEntries(
    valueClass: ValueClass,
    lower: IndexBound | undefined,
    upper: IndexBound | undefined,
  ): { start: number; end: number } {
    const entries = this.ordered.get(valueClass) ?? [];
    const start =
      lower === undefined
        ? 0
        : lower.inclusive
          ? this.lowerBound(entries, lower.value)
          : this.upperBound(entries, lower.value);
    const end =
      upper === undefined
        ? entries.length
        : upper.inclusive
          ? this.upperBound(entries, upper.value)
          : this.lowerBound(entries, upper.value);

    return { start, end: Math.max(start, end) };
  }

  public estimateRange(
    valueClass: ValueClass,
    lower: IndexBound | undefined,
    upper: IndexBound | undefined,
  ): number {
    const { start, end } = this.rangeEntries(valueClass, lower, upper);
    const average =
      this.byValue.size === 0 ? 0 : this.indexedDocuments / this.byValue.size;

    return Math.ceil((end - start) * average);
  }

  public lookupRange(
    valueClass: ValueClass,
    lower: IndexBound | undefined,
    upper: IndexBound | undefined,
  ): Set<string> {
    const entries = this.ordered.get(valueClass) ?? [];
    const { start, end } = this.rangeEntries(valueClass, lower, upper);
    const result = new Set<string>();

    for (let index = start; index < end; index += 1) {
      const keys = this.byValue.get((entries[index] as OrderedEntry).key);

      for (const docKey of keys ?? []) {
        result.add(docKey);
      }
    }

    return result;
  }

  /** A canonical description of the index contents, for consistency checks. */
  public contents(): IndexContents {
    const values = [...this.byValue]
      .map(([key, docKeys]) => [key, [...docKeys].sort()] as [string, string[]])
      .sort((left, right) =>
        left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0,
      );
    const problems: string[] = [];
    const comparableKeys = new Set<string>();

    for (const [valueClass, entries] of this.ordered) {
      for (let position = 0; position < entries.length; position += 1) {
        const entry = entries[position] as OrderedEntry;

        comparableKeys.add(entry.key);

        if (!this.byValue.has(entry.key)) {
          problems.push(`ordered ${valueClass} entry has no documents`);
        }

        const previous = entries[position - 1];

        if (
          previous !== undefined &&
          compareSameClass(previous.value, entry.value) > 0
        ) {
          problems.push(`ordered ${valueClass} entries are out of order`);
        }
      }
    }

    for (const [key] of this.byValue) {
      const first = [...(this.byValue.get(key) ?? [])][0];

      if (first === undefined) {
        problems.push("an index entry has no documents");
      }
    }

    return {
      values,
      missing: [...this.missing].sort(),
      orderedProblems: problems,
    };
  }

  public orderedKeyCount(): number {
    let total = 0;

    for (const entries of this.ordered.values()) {
      total += entries.length;
    }

    return total;
  }

  private conflict(description: string): IndexConflict {
    return {
      index: this.spec.name,
      field: (this.spec.keys[0] as IndexKey).field,
      description,
    };
  }

  private insertOrdered(
    value: DocumentValue,
    key: string,
    bulk: boolean,
  ): void {
    const valueClass = valueClassOf(value);

    if (valueClass === undefined) {
      return;
    }

    let entries = this.ordered.get(valueClass);

    if (entries === undefined) {
      entries = [];
      this.ordered.set(valueClass, entries);
    }

    if (bulk) {
      entries.push({ value, key });
      this.unsorted.add(valueClass);

      return;
    }

    entries.splice(this.lowerBound(entries, value), 0, { value, key });
  }

  private removeOrdered(value: DocumentValue, key: string): void {
    const valueClass = valueClassOf(value);

    if (valueClass === undefined) {
      return;
    }

    const entries = this.ordered.get(valueClass);

    if (entries === undefined) {
      return;
    }

    for (
      let position = this.lowerBound(entries, value);
      position < entries.length &&
      compareSameClass((entries[position] as OrderedEntry).value, value) === 0;
      position += 1
    ) {
      if ((entries[position] as OrderedEntry).key === key) {
        entries.splice(position, 1);

        return;
      }
    }
  }

  private lowerBound(entries: OrderedEntry[], value: DocumentValue): number {
    let low = 0;
    let high = entries.length;

    while (low < high) {
      const middle = (low + high) >>> 1;

      if (
        compareSameClass((entries[middle] as OrderedEntry).value, value) < 0
      ) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    return low;
  }

  private upperBound(entries: OrderedEntry[], value: DocumentValue): number {
    let low = 0;
    let high = entries.length;

    while (low < high) {
      const middle = (low + high) >>> 1;

      if (
        compareSameClass((entries[middle] as OrderedEntry).value, value) <= 0
      ) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    return low;
  }
}
