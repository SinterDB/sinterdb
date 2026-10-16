import type { Document, DocumentValue } from "sinterdb-protocol";

import { StorageError, StorageErrorCode } from "./errors.js";
import { compileFilter } from "./filter.js";
import { compileProjection } from "./projection.js";
import { compileSort, compileTopN, type SortSpecification } from "./sort.js";

/** Most stages one pipeline may have. */
export const MAX_PIPELINE_STAGES = 32;

const STAGE_NAMES = new Set([
  "$match",
  "$project",
  "$sort",
  "$skip",
  "$limit",
  "$count",
]);

type Stage = (input: Iterable<Document>) => Iterable<Document>;

export interface CompiledPipeline {
  /**
   * The filter of a leading `$match`. The collection uses it to choose an
   * index, so the pipeline starts from the matching documents only.
   */
  readonly filter: Document | undefined;
  /**
   * How the pipeline will run, one entry per stage: a `$sort` that keeps only
   * the first documents says how many, as in `$sort (first 5)`.
   */
  readonly plan: readonly string[];
  /** Runs the remaining stages over the documents that match the filter. */
  readonly run: (source: Iterable<Document>) => IterableIterator<Document>;
}

/**
 * Compiles an aggregation pipeline: an array of stages, each a document with
 * one `$` key. Every stage is checked here, so a bad pipeline fails before any
 * document is read.
 *
 * - `$match: filter` keeps documents that match. A leading `$match` can use an
 *   index.
 * - `$project: projection` reshapes documents as a find projection does.
 * - `$sort: [[path, direction], ...]` orders documents. It is an array of
 *   pairs, not a document, because a document's key order is not kept.
 * - `$skip: n` and `$limit: n` drop and cap documents.
 * - `$count: name` replaces the documents with one `{ [name]: n }`, or with
 *   nothing when there were no documents.
 *
 * A `$sort` followed by `$limit` (with at most a `$skip` between) keeps only
 * the documents it needs while sorting.
 */
export function compilePipeline(
  pipeline: readonly Document[],
): CompiledPipeline {
  if (!Array.isArray(pipeline)) {
    throw invalidPipeline("A pipeline must be an array of stages.");
  }

  if (pipeline.length > MAX_PIPELINE_STAGES) {
    throw invalidPipeline(
      `A pipeline can have at most ${MAX_PIPELINE_STAGES} stages.`,
    );
  }

  const parsed = pipeline.map((stage, position) => parseStage(stage, position));
  let filter: Document | undefined;
  let rest = parsed;

  if (parsed[0]?.name === "$match") {
    if (!isDocument(parsed[0].argument)) {
      throw invalidPipeline("Stage 0 ($match) needs a filter document.");
    }

    filter = parsed[0].argument;
    rest = parsed.slice(1);
  }

  const stages: Stage[] = [];
  const plan: string[] = [];

  if (filter !== undefined) {
    compileFilter(filter);
    plan.push("$match");
  }

  for (let position = 0; position < rest.length; position += 1) {
    const stage = rest[position] as ParsedStage;

    if (stage.name === "$sort") {
      const wanted = documentsNeeded(rest, position + 1);

      const sort = compileSortStage(stage.argument, wanted);

      stages.push(sort.stage);
      plan.push(sort.description);
    } else {
      stages.push(compileStage(stage));
      plan.push(stage.name);
    }
  }

  return {
    filter,
    plan,
    run(source) {
      let current: Iterable<Document> = source;

      for (const stage of stages) {
        current = stage(current);
      }

      return iterate(current);
    },
  };
}

interface ParsedStage {
  readonly name: string;
  readonly argument: DocumentValue;
  readonly position: number;
}

function parseStage(stage: unknown, position: number): ParsedStage {
  if (
    typeof stage !== "object" ||
    stage === null ||
    Array.isArray(stage) ||
    !isPlainPrototype(stage)
  ) {
    throw invalidPipeline(`Stage ${position} must be a document.`);
  }

  const names = Object.keys(stage);

  if (names.length !== 1) {
    throw invalidPipeline(
      `Stage ${position} must have exactly one stage name, but has ${names.length}.`,
    );
  }

  const name = names[0] as string;

  if (!STAGE_NAMES.has(name)) {
    throw invalidPipeline(
      `Stage ${position} is ${JSON.stringify(name)}, which is not a supported aggregation stage. Supported stages are ${[...STAGE_NAMES].join(", ")}.`,
    );
  }

  return {
    name,
    argument: (stage as Document)[name] as DocumentValue,
    position,
  };
}

function compileStage(stage: ParsedStage): Stage {
  switch (stage.name) {
    case "$match": {
      if (!isDocument(stage.argument)) {
        throw invalidPipeline(
          `Stage ${stage.position} ($match) needs a filter document.`,
        );
      }

      const matches = compileFilter(stage.argument);

      return function* (input) {
        for (const document of input) {
          if (matches(document)) {
            yield document;
          }
        }
      };
    }

    case "$project": {
      if (!isDocument(stage.argument)) {
        throw invalidPipeline(
          `Stage ${stage.position} ($project) needs a projection document.`,
        );
      }

      const project = compileProjection(stage.argument);

      return function* (input) {
        for (const document of input) {
          yield project(document);
        }
      };
    }

    case "$skip": {
      const count = integerArgument(stage, 0);

      return function* (input) {
        let skipped = 0;

        for (const document of input) {
          if (skipped < count) {
            skipped += 1;
            continue;
          }

          yield document;
        }
      };
    }

    case "$limit": {
      const count = integerArgument(stage, 1);

      return function* (input) {
        let yielded = 0;

        for (const document of input) {
          yield document;
          yielded += 1;

          if (yielded >= count) {
            return;
          }
        }
      };
    }

    default: {
      const name = countName(stage);

      return function* (input) {
        let total = 0;

        for (const _document of input) {
          total += 1;
        }

        if (total > 0) {
          yield { [name]: total };
        }
      };
    }
  }
}

function compileSortStage(
  argument: DocumentValue,
  wanted: number,
): { stage: Stage; description: string } {
  const specification = argument as unknown as SortSpecification;

  if (Number.isFinite(wanted)) {
    const top = compileTopN(specification, wanted);

    return {
      stage: (input) => top(input),
      description: `$sort (first ${wanted})`,
    };
  }

  const sort = compileSort(specification);

  return { stage: (input) => sort([...input]), description: "$sort" };
}

/**
 * How many documents the stages after a sort can use: all of them (infinity)
 * unless a `$limit` follows, possibly after a `$skip`.
 */
function documentsNeeded(stages: readonly ParsedStage[], from: number): number {
  let skipped = 0;

  for (let position = from; position < stages.length; position += 1) {
    const stage = stages[position] as ParsedStage;

    if (stage.name === "$skip") {
      skipped += integerArgument(stage, 0);
    } else if (stage.name === "$limit") {
      return skipped + integerArgument(stage, 1);
    } else {
      break;
    }
  }

  return Number.POSITIVE_INFINITY;
}

function integerArgument(stage: ParsedStage, minimum: number): number {
  const value = stage.argument;

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum
  ) {
    throw invalidPipeline(
      `Stage ${stage.position} (${stage.name}) needs ${
        minimum === 0 ? "a non-negative" : "a positive"
      } safe integer.`,
    );
  }

  return value;
}

function countName(stage: ParsedStage): string {
  const value = stage.argument;

  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.startsWith("$") ||
    value.includes(".") ||
    value === "__proto__"
  ) {
    throw invalidPipeline(
      `Stage ${stage.position} ($count) needs a field name that is not empty, does not start with "$", and has no ".".`,
    );
  }

  return value;
}

function* iterate(input: Iterable<Document>): IterableIterator<Document> {
  yield* input;
}

function isDocument(value: DocumentValue): value is Document {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    isPlainPrototype(value)
  );
}

function isPlainPrototype(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function invalidPipeline(message: string): StorageError {
  return new StorageError(StorageErrorCode.InvalidPipeline, message);
}
