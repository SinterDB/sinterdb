import { CustomId, type Document, type DocumentValue } from "sinterdb-protocol";

import { StorageError, StorageErrorCode } from "./errors.js";
import { resolveField } from "./filter.js";
import { canonicalKey } from "./indexing/values.js";
import { compareOptionalValues } from "./sort.js";

/** Most distinct groups one `$group` stage may hold at a time. */
export const MAX_GROUPS = 100_000;

/** Most fields a compound `_id` may have. */
export const MAX_GROUP_KEY_FIELDS = 8;

const MIN_INT64 = -(2n ** 63n);
const MAX_INT64 = 2n ** 63n - 1n;

type Expression =
  | { readonly kind: "path"; readonly segments: readonly string[] }
  | { readonly kind: "literal"; readonly value: DocumentValue };

interface Accumulator {
  add(document: Document): void;
  result(): DocumentValue;
}

type AccumulatorFactory = () => Accumulator;

interface Group {
  readonly key: DocumentValue;
  readonly accumulators: readonly Accumulator[];
}

/**
 * Compiles the argument of a `$group` stage into a stage function. The
 * argument is `{ _id: key, name: { $accumulator: expression }, ... }`.
 *
 * An expression is a field reference (`"$age"`, `"$address.city"`) or a literal
 * value. The stage reads every input document before it yields the first
 * group, and holds one entry per distinct group, at most {@link MAX_GROUPS}.
 */
export function compileGroup(
  argument: DocumentValue,
  position: number,
): (input: Iterable<Document>) => Iterable<Document> {
  const where = `Stage ${position} ($group)`;

  if (!isDocument(argument)) {
    throw invalidPipeline(`${where} needs a document.`);
  }

  if (!Object.hasOwn(argument, "_id")) {
    throw invalidPipeline(`${where} needs an "_id" key.`);
  }

  const readKey = compileKey(argument["_id"] as DocumentValue, where);
  const names: string[] = [];
  const factories: AccumulatorFactory[] = [];

  for (const name of Object.keys(argument)) {
    if (name === "_id") {
      continue;
    }

    validateName(name, `${where} output field`);
    names.push(name);
    factories.push(
      compileAccumulator(name, argument[name] as DocumentValue, where),
    );
  }

  return function* (input) {
    const groups = new Map<string, Group>();

    for (const document of input) {
      const key = readKey(document);
      const identity = canonicalKey(key);
      let group = groups.get(identity);

      if (group === undefined) {
        if (groups.size >= MAX_GROUPS) {
          throw invalidPipeline(
            `${where} would hold more than ${MAX_GROUPS} groups.`,
          );
        }

        group = {
          key,
          accumulators: factories.map((create) => create()),
        };
        groups.set(identity, group);
      }

      for (const accumulator of group.accumulators) {
        accumulator.add(document);
      }
    }

    for (const group of groups.values()) {
      const output: Document = { _id: group.key };

      group.accumulators.forEach((accumulator, index) => {
        output[names[index] as string] = accumulator.result();
      });

      yield output;
    }
  };
}

function compileKey(
  value: DocumentValue,
  where: string,
): (document: Document) => DocumentValue {
  if (!isDocument(value)) {
    const expression = parseExpression(value, `${where} "_id"`);

    return (document) => evaluate(expression, document) ?? null;
  }

  const names = Object.keys(value);

  if (names.length === 0 || names.length > MAX_GROUP_KEY_FIELDS) {
    throw invalidPipeline(
      `${where} "_id" document needs 1 to ${MAX_GROUP_KEY_FIELDS} fields.`,
    );
  }

  const parts = names.map((name) => {
    validateName(name, `${where} "_id" field`);

    return {
      name,
      expression: parseExpression(
        value[name] as DocumentValue,
        `${where} "_id.${name}"`,
      ),
    };
  });

  return (document) => {
    const key: Document = {};

    for (const part of parts) {
      key[part.name] = evaluate(part.expression, document) ?? null;
    }

    return key;
  };
}

function compileAccumulator(
  name: string,
  spec: DocumentValue,
  where: string,
): AccumulatorFactory {
  const label = `${where} field ${JSON.stringify(name)}`;

  if (!isDocument(spec)) {
    throw invalidPipeline(
      `${label} needs an accumulator such as { $sum: "$field" }.`,
    );
  }

  const keys = Object.keys(spec);

  if (keys.length !== 1) {
    throw invalidPipeline(
      `${label} needs exactly one accumulator, but has ${keys.length}.`,
    );
  }

  const accumulator = keys[0] as string;
  const operand = spec[accumulator] as DocumentValue;

  if (accumulator === "$count") {
    if (!isDocument(operand) || Object.keys(operand).length !== 0) {
      throw invalidPipeline(`${label} ($count) takes an empty document.`);
    }

    return () => {
      let total = 0;

      return {
        add() {
          total += 1;
        },
        result: () => total,
      };
    };
  }

  if (!ACCUMULATORS.has(accumulator)) {
    throw invalidPipeline(
      `${label} uses ${JSON.stringify(accumulator)}, which is not a supported accumulator. Supported accumulators are $count, ${[...ACCUMULATORS].join(", ")}.`,
    );
  }

  const expression = parseExpression(operand, `${label} (${accumulator})`);

  switch (accumulator) {
    case "$sum":
      return () => sumAccumulator(expression);
    case "$avg":
      return () => averageAccumulator(expression);
    case "$min":
      return () => extremeAccumulator(expression, -1);
    case "$max":
      return () => extremeAccumulator(expression, 1);
    case "$first":
      return () => firstAccumulator(expression);
    default:
      return () => lastAccumulator(expression);
  }
}

const ACCUMULATORS = new Set([
  "$sum",
  "$avg",
  "$min",
  "$max",
  "$first",
  "$last",
]);

function sumAccumulator(expression: Expression): Accumulator {
  let numberTotal = 0;
  let bigintTotal = 0n;
  let kind: "none" | "number" | "bigint" = "none";

  return {
    add(document) {
      const value = evaluate(expression, document);

      if (typeof value === "number") {
        if (kind === "bigint") {
          throw mixedNumbers();
        }

        kind = "number";
        numberTotal += value;
      } else if (typeof value === "bigint") {
        if (kind === "number") {
          throw mixedNumbers();
        }

        kind = "bigint";
        bigintTotal += value;

        if (bigintTotal < MIN_INT64 || bigintTotal > MAX_INT64) {
          throw invalidPipeline(
            "A $sum of bigint values left the signed 64-bit range.",
          );
        }
      }
    },
    result: () => (kind === "bigint" ? bigintTotal : numberTotal),
  };
}

function averageAccumulator(expression: Expression): Accumulator {
  let total = 0;
  let count = 0;

  return {
    add(document) {
      const value = evaluate(expression, document);

      if (typeof value === "number") {
        total += value;
        count += 1;
      } else if (typeof value === "bigint") {
        throw invalidPipeline(
          "$avg does not accept bigint values. Use $sum and divide in your code.",
        );
      }
    },
    result: () => (count === 0 ? null : total / count),
  };
}

function extremeAccumulator(
  expression: Expression,
  direction: -1 | 1,
): Accumulator {
  let best: DocumentValue | undefined;

  return {
    add(document) {
      const value = evaluate(expression, document);

      if (value === undefined) {
        return;
      }

      if (
        best === undefined ||
        compareOptionalValues(value, best) * direction > 0
      ) {
        best = value;
      }
    },
    result: () => best ?? null,
  };
}

function firstAccumulator(expression: Expression): Accumulator {
  let value: DocumentValue | undefined;
  let seen = false;

  return {
    add(document) {
      if (!seen) {
        seen = true;
        value = evaluate(expression, document);
      }
    },
    result: () => value ?? null,
  };
}

function lastAccumulator(expression: Expression): Accumulator {
  let value: DocumentValue | undefined;

  return {
    add(document) {
      value = evaluate(expression, document);
    },
    result: () => value ?? null,
  };
}

function parseExpression(value: unknown, where: string): Expression {
  if (typeof value === "string" && value.startsWith("$")) {
    const segments = value.slice(1).split(".");

    if (
      segments.some(
        (segment) => segment.length === 0 || segment.startsWith("$"),
      )
    ) {
      throw invalidPipeline(
        `${where} has the field reference ${JSON.stringify(value)}, which is not a valid path. Use "$name" or "$outer.inner".`,
      );
    }

    return { kind: "path", segments };
  }

  if (
    Array.isArray(value) ||
    (typeof value === "object" &&
      value !== null &&
      !(value instanceof Date) &&
      !(value instanceof Uint8Array) &&
      !(value instanceof CustomId))
  ) {
    throw invalidPipeline(
      `${where} needs a field reference or a single value, not an array or a document.`,
    );
  }

  return { kind: "literal", value: value as DocumentValue };
}

function evaluate(
  expression: Expression,
  document: Document,
): DocumentValue | undefined {
  if (expression.kind === "literal") {
    return expression.value;
  }

  const resolved = resolveField(document, expression.segments);

  return resolved.found ? resolved.value : undefined;
}

function validateName(name: string, where: string): void {
  if (
    name.length === 0 ||
    name.startsWith("$") ||
    name.includes(".") ||
    name === "__proto__"
  ) {
    throw invalidPipeline(
      `${where} ${JSON.stringify(name)} must not be empty, start with "$", contain ".", or be "__proto__".`,
    );
  }
}

function mixedNumbers(): StorageError {
  return invalidPipeline(
    "A $sum cannot add numbers and bigint values together.",
  );
}

function isDocument(value: unknown): value is Document {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value) as unknown;

  return prototype === Object.prototype || prototype === null;
}

function invalidPipeline(message: string): StorageError {
  return new StorageError(StorageErrorCode.InvalidPipeline, message);
}
