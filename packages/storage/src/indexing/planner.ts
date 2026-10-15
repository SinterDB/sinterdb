import { CustomId, type Document, type DocumentValue } from "sinterdb-protocol";

import { isOperatorDocument } from "../filter.js";
import { CompoundIndex } from "./compound-index.js";
import { FieldIndex, type IndexBound } from "./field-index.js";
import type { SecondaryIndex } from "./secondary-index.js";
import {
  canonicalKey,
  compareSameClass,
  valueClassOf,
  type ValueClass,
} from "./values.js";

export type IndexAccess =
  | { readonly kind: "equal"; readonly values: readonly DocumentValue[] }
  | { readonly kind: "prefix"; readonly values: readonly DocumentValue[] }
  | {
      readonly kind: "range";
      readonly valueClass: ValueClass;
      readonly lower?: IndexBound;
      readonly upper?: IndexBound;
    };

export type QueryPlan =
  | { readonly stage: "COLLSCAN"; readonly estimated: number }
  | {
      readonly stage: "IDLOOKUP";
      readonly keys: readonly string[];
      readonly estimated: number;
    }
  | {
      readonly stage: "IXSCAN";
      readonly index: FieldIndex | CompoundIndex;
      readonly access: IndexAccess;
      readonly viaMembership: boolean;
      readonly estimated: number;
    };

type Constraint =
  | { readonly kind: "equal"; readonly value: DocumentValue }
  | { readonly kind: "in"; readonly values: readonly DocumentValue[] }
  | {
      readonly kind: "lower" | "upper";
      readonly value: DocumentValue;
      readonly inclusive: boolean;
    };

/**
 * Chooses between a collection scan and an index lookup. An index only ever
 * narrows the candidates: the caller still applies the whole filter to every
 * candidate, so the result is always the same as a scan.
 */
export function planQuery(
  filter: Document,
  indexes: readonly SecondaryIndex[],
  totalDocuments: number,
): QueryPlan {
  const scan: QueryPlan = { stage: "COLLSCAN", estimated: totalDocuments };

  if (totalDocuments === 0) {
    return scan;
  }

  const constraints = new Map<string, Constraint[]>();

  collect(filter, constraints);

  const idPlan = planId(constraints.get("_id"));

  if (idPlan !== undefined) {
    return idPlan;
  }

  let best: QueryPlan = scan;

  for (const index of indexes) {
    let candidates: QueryPlan[];

    if (index instanceof CompoundIndex) {
      candidates = planCompound(index, constraints);
    } else if (index instanceof FieldIndex) {
      const fieldConstraints = constraints.get(
        (index.spec.keys[0] as { field: string }).field,
      );

      candidates =
        fieldConstraints === undefined
          ? []
          : planIndex(index, fieldConstraints);
    } else {
      candidates = [];
    }

    for (const candidate of candidates) {
      if (
        candidate.estimated < best.estimated ||
        (candidate.estimated === best.estimated &&
          best.stage !== "COLLSCAN" &&
          candidate.stage === "IXSCAN" &&
          candidate.access.kind === "equal" &&
          (best as { access: IndexAccess }).access.kind === "range")
      ) {
        best = candidate;
      }
    }
  }

  return best;
}

export function candidateKeys(plan: QueryPlan): Set<string> {
  if (plan.stage === "IDLOOKUP") {
    return new Set(plan.keys);
  }

  if (plan.stage !== "IXSCAN") {
    throw new Error("A collection scan has no candidate keys.");
  }

  if (plan.access.kind === "prefix") {
    return (plan.index as CompoundIndex).lookupPrefix(plan.access.values);
  }

  if (plan.access.kind === "range") {
    return (plan.index as FieldIndex).lookupRange(
      plan.access.valueClass,
      plan.access.lower,
      plan.access.upper,
    );
  }

  const result = new Set<string>();

  for (const value of plan.access.values) {
    for (const key of (plan.index as FieldIndex).lookupEqual(value) ?? []) {
      result.add(key);
    }
  }

  return result;
}

function collect(filter: Document, out: Map<string, Constraint[]>): void {
  for (const field of Object.keys(filter)) {
    const value = filter[field] as DocumentValue;

    if (field === "$and") {
      if (Array.isArray(value)) {
        for (const clause of value) {
          if (isDocument(clause)) {
            collect(clause, out);
          }
        }
      }

      continue;
    }

    if (field.startsWith("$")) {
      continue;
    }

    const list = out.get(field) ?? [];

    out.set(field, list);

    if (!isOperatorDocument(value)) {
      list.push({ kind: "equal", value });

      continue;
    }

    for (const operator of Object.keys(value)) {
      const operand = value[operator] as DocumentValue;

      switch (operator) {
        case "$eq":
          list.push({ kind: "equal", value: operand });
          break;

        case "$in":
          if (Array.isArray(operand)) {
            list.push({ kind: "in", values: operand });
          }

          break;

        case "$gt":
        case "$gte":
          list.push({
            kind: "lower",
            value: operand,
            inclusive: operator === "$gte",
          });
          break;

        case "$lt":
        case "$lte":
          list.push({
            kind: "upper",
            value: operand,
            inclusive: operator === "$lte",
          });
          break;

        default:
          break;
      }
    }
  }
}

function planId(constraints: Constraint[] | undefined): QueryPlan | undefined {
  if (constraints === undefined) {
    return undefined;
  }

  let best: string[] | undefined;

  for (const constraint of constraints) {
    let keys: string[] | undefined;

    if (constraint.kind === "equal") {
      keys =
        constraint.value instanceof CustomId
          ? [constraint.value.toHexString()]
          : [];
    } else if (constraint.kind === "in") {
      keys = [
        ...new Set(
          constraint.values
            .filter((value): value is CustomId => value instanceof CustomId)
            .map((value) => value.toHexString()),
        ),
      ];
    }

    if (
      keys !== undefined &&
      (best === undefined || keys.length < best.length)
    ) {
      best = keys;
    }
  }

  return best === undefined
    ? undefined
    : { stage: "IDLOOKUP", keys: best, estimated: best.length };
}

/**
 * A compound index answers a query that fixes its first fields by equality:
 * the first field, the first two, and so on. Any field after a gap is left to
 * the filter, which still runs on every candidate.
 */
function planCompound(
  index: CompoundIndex,
  constraints: Map<string, Constraint[]>,
): QueryPlan[] {
  if (index.hasArrayValues) {
    return [];
  }

  const values: DocumentValue[] = [];

  for (const key of index.spec.keys) {
    const equal = constraints
      .get(key.field)
      ?.find((constraint) => constraint.kind === "equal");

    if (equal === undefined || equal.kind !== "equal") {
      break;
    }

    values.push(equal.value);
  }

  if (values.length === 0) {
    return [];
  }

  return [
    {
      stage: "IXSCAN",
      index,
      access: { kind: "prefix", values },
      viaMembership: false,
      estimated: index.estimatePrefix(values),
    },
  ];
}

function planIndex(index: FieldIndex, constraints: Constraint[]): QueryPlan[] {
  const plans: QueryPlan[] = [];

  // A query matches an array by its elements, and an index holds the array as
  // one entry, so the index cannot be trusted once any document has an array.
  if (index.hasArrayValues) {
    return plans;
  }

  for (const constraint of constraints) {
    if (constraint.kind === "equal") {
      plans.push({
        stage: "IXSCAN",
        index,
        access: { kind: "equal", values: [constraint.value] },
        viaMembership: false,
        estimated: index.estimateEqual(constraint.value),
      });
    } else if (constraint.kind === "in") {
      const distinct = new Map<string, DocumentValue>();

      for (const value of constraint.values) {
        distinct.set(canonicalKey(value), value);
      }

      const values = [...distinct.values()];

      plans.push({
        stage: "IXSCAN",
        index,
        access: { kind: "equal", values },
        viaMembership: true,
        estimated: values.reduce<number>(
          (total, value) => total + index.estimateEqual(value),
          0,
        ),
      });
    }
  }

  const range = planRange(index, constraints);

  if (range !== undefined) {
    plans.push(range);
  }

  return plans;
}

function planRange(
  index: FieldIndex,
  constraints: Constraint[],
): QueryPlan | undefined {
  let valueClass: ValueClass | undefined;
  let lower: IndexBound | undefined;
  let upper: IndexBound | undefined;

  for (const constraint of constraints) {
    if (constraint.kind !== "lower" && constraint.kind !== "upper") {
      continue;
    }

    const operandClass = valueClassOf(constraint.value);

    if (operandClass === undefined) {
      return undefined;
    }

    if (valueClass !== undefined && valueClass !== operandClass) {
      return undefined;
    }

    valueClass = operandClass;

    const bound: IndexBound = {
      value: constraint.value,
      inclusive: constraint.inclusive,
    };

    if (constraint.kind === "lower") {
      lower = tighter(lower, bound, "lower");
    } else {
      upper = tighter(upper, bound, "upper");
    }
  }

  if (valueClass === undefined) {
    return undefined;
  }

  return {
    stage: "IXSCAN",
    index,
    access: {
      kind: "range",
      valueClass,
      ...(lower === undefined ? {} : { lower }),
      ...(upper === undefined ? {} : { upper }),
    },
    viaMembership: false,
    estimated: index.estimateRange(valueClass, lower, upper),
  };
}

function tighter(
  current: IndexBound | undefined,
  next: IndexBound,
  side: "lower" | "upper",
): IndexBound {
  if (current === undefined) {
    return next;
  }

  const comparison = compareSameClass(next.value, current.value);

  if (comparison === 0) {
    return next.inclusive ? current : next;
  }

  const nextIsTighter = side === "lower" ? comparison > 0 : comparison < 0;

  return nextIsTighter ? next : current;
}

function isDocument(value: DocumentValue): value is Document {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof Uint8Array) &&
    !(value instanceof CustomId)
  );
}
