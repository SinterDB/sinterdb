import type { Document, DocumentValue } from "sinterdb-protocol";

import { SinterProtocolError } from "./errors.js";
import type { FieldPaths } from "./filter.js";

/**
 * Field paths that can be indexed: every known path except `_id`, which
 * always has its own unique index.
 */
export type IndexablePath<TDocument extends object> = Exclude<
  FieldPaths<TDocument>,
  "_id" | `_id.${string}`
>;

/** How to build an index, passed to {@link SinterCollection.createIndex}. */
export interface IndexDefinition<TDocument extends object = Document> {
  /** The field to index. Dotted paths reach into nested documents. */
  readonly field: IndexablePath<TDocument>;
  /** Defaults to 1. Both directions serve the same lookups today. */
  readonly direction?: 1 | -1;
  /** At most one document may hold a given value, or lack the field. */
  readonly unique?: boolean;
  /** Documents without the field are left out, so they never conflict. */
  readonly sparse?: boolean;
  /** Defaults to the field and direction, such as `email_1`. */
  readonly name?: string;
}

/** The result of {@link SinterCollection.createIndex}. */
export interface CreateIndexResult {
  /** Always `true`; a failed request throws instead. */
  readonly acknowledged: true;
  /** The name of the index, whether new or existing. */
  readonly name: string;
  /** False when an identical index already existed. */
  readonly created: boolean;
}

/**
 * A description of an index, as returned by {@link SinterCollection.indexes}.
 */
export interface IndexInfo {
  /** The index name. */
  readonly name: string;
  /** The indexed field path. */
  readonly field: string;
  /** `1` for ascending or `-1` for descending. */
  readonly direction: 1 | -1;
  /** Whether the index rejects duplicate values. */
  readonly unique: boolean;
  /** Whether documents without the field are left out of the index. */
  readonly sparse: boolean;
}

/**
 * One end of an index range in an {@link ExplainResult}.
 *
 * @beta
 */
export interface IndexBoundInfo {
  /** The bound value. */
  readonly value: DocumentValue;
  /** Whether documents equal to the bound are included. */
  readonly inclusive: boolean;
}

/**
 * The query plan the server reports for a find. The shape is experimental and
 * may change in any release; see docs/compatibility.md.
 *
 * @beta
 */
export interface ExplainResult {
  /**
   * The strategy: `COLLSCAN` reads every document, `IDLOOKUP` reads by `_id`,
   * and `IXSCAN` scans an index.
   */
  readonly stage: "COLLSCAN" | "IDLOOKUP" | "IXSCAN";
  /** The index used, for `IXSCAN`. */
  readonly index?: string;
  /** The field the index covers, for `IXSCAN`. */
  readonly field?: string;
  /**
   * How the index is read: by equality, by a list of values, or by a range.
   */
  readonly access?: "equality" | "in" | "range";
  /** The lower end of a range scan. */
  readonly lower?: IndexBoundInfo;
  /** The upper end of a range scan. */
  readonly upper?: IndexBoundInfo;
  /** How many documents the server expects to examine. */
  readonly estimatedCandidates: number;
  /** How many documents the collection holds. */
  readonly documents: number;
}

/** One difference found by {@link SinterCollection.validateIndexes}. */
export interface IndexIssue {
  /** The name of the affected index. */
  readonly index: string;
  /** A short identifier for the kind of difference. */
  readonly problem: string;
  /** A human-readable description of the difference. */
  readonly detail: string;
}

/** The result of {@link SinterCollection.validateIndexes}. */
export interface IndexValidationResult {
  /** Whether every index matches the documents. */
  readonly valid: boolean;
  /** How many indexes were checked. */
  readonly indexes: number;
  /** How many documents were checked. */
  readonly documents: number;
  /** Every difference found; empty when `valid` is `true`. */
  readonly issues: readonly IndexIssue[];
}

export function parseCreateIndexResult(
  value: DocumentValue,
): CreateIndexResult {
  const record = asRecord(value, "createIndex");

  if (
    record["acknowledged"] !== true ||
    typeof record["name"] !== "string" ||
    typeof record["created"] !== "boolean"
  ) {
    throw invalid("createIndex");
  }

  return Object.freeze({
    acknowledged: true,
    name: record["name"],
    created: record["created"],
  });
}

export function parseIndexList(value: DocumentValue): IndexInfo[] {
  const record = asRecord(value, "listIndexes");
  const indexes = record["indexes"];

  if (!Array.isArray(indexes)) {
    throw invalid("listIndexes");
  }

  return indexes.map((entry) => {
    const index = asRecord(entry, "listIndexes");
    const direction = index["direction"];

    if (
      typeof index["name"] !== "string" ||
      typeof index["field"] !== "string" ||
      (direction !== 1 && direction !== -1) ||
      typeof index["unique"] !== "boolean" ||
      typeof index["sparse"] !== "boolean"
    ) {
      throw invalid("listIndexes");
    }

    return Object.freeze({
      name: index["name"],
      field: index["field"],
      direction,
      unique: index["unique"],
      sparse: index["sparse"],
    });
  });
}

export function parseExplainResult(value: DocumentValue): ExplainResult {
  const record = asRecord(value, "explain");
  const stage = record["stage"];

  if (
    (stage !== "COLLSCAN" && stage !== "IDLOOKUP" && stage !== "IXSCAN") ||
    !isCount(record["estimatedCandidates"]) ||
    !isCount(record["documents"])
  ) {
    throw invalid("explain");
  }

  const access = record["access"];

  if (
    access !== undefined &&
    access !== "equality" &&
    access !== "in" &&
    access !== "range"
  ) {
    throw invalid("explain");
  }

  for (const key of ["index", "field"] as const) {
    if (record[key] !== undefined && typeof record[key] !== "string") {
      throw invalid("explain");
    }
  }

  return Object.freeze({
    stage,
    ...(record["index"] === undefined
      ? {}
      : { index: record["index"] as string }),
    ...(record["field"] === undefined
      ? {}
      : { field: record["field"] as string }),
    ...(access === undefined ? {} : { access }),
    ...(record["lower"] === undefined
      ? {}
      : { lower: parseBound(record["lower"]) }),
    ...(record["upper"] === undefined
      ? {}
      : { upper: parseBound(record["upper"]) }),
    estimatedCandidates: record["estimatedCandidates"],
    documents: record["documents"],
  });
}

export function parseIndexValidation(
  value: DocumentValue,
): IndexValidationResult {
  const record = asRecord(value, "validateIndexes");
  const issues = record["issues"];

  if (
    typeof record["valid"] !== "boolean" ||
    !isCount(record["indexes"]) ||
    !isCount(record["documents"]) ||
    !Array.isArray(issues)
  ) {
    throw invalid("validateIndexes");
  }

  return Object.freeze({
    valid: record["valid"],
    indexes: record["indexes"],
    documents: record["documents"],
    issues: issues.map((entry) => {
      const issue = asRecord(entry, "validateIndexes");

      if (
        typeof issue["index"] !== "string" ||
        typeof issue["problem"] !== "string" ||
        typeof issue["detail"] !== "string"
      ) {
        throw invalid("validateIndexes");
      }

      return Object.freeze({
        index: issue["index"],
        problem: issue["problem"],
        detail: issue["detail"],
      });
    }),
  });
}

function parseBound(value: DocumentValue): IndexBoundInfo {
  const record = asRecord(value, "explain");

  if (
    typeof record["inclusive"] !== "boolean" ||
    record["value"] === undefined
  ) {
    throw invalid("explain");
  }

  return { value: record["value"], inclusive: record["inclusive"] };
}

function asRecord(
  value: unknown,
  command: string,
): Record<string, DocumentValue> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    value instanceof Date ||
    value instanceof Uint8Array
  ) {
    throw invalid(command);
  }

  return value as Record<string, DocumentValue>;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function invalid(command: string): SinterProtocolError {
  return new SinterProtocolError(
    `The server returned an invalid ${command} result.`,
  );
}
