import type { Document } from "sinterdb-protocol";

import type { IndexConflict } from "./field-index.js";
import type { IndexSpec } from "./spec.js";

/** A description of an index's contents, for consistency checks. */
export interface IndexContents {
  values: [string, string[]][];
  missing: string[];
  orderedProblems: string[];
}

/** What every index besides `_id` can do, whatever fields it covers. */
export interface SecondaryIndex {
  readonly spec: IndexSpec;
  /**
   * Whether any indexed document holds an array in an indexed field, or has an
   * array on the way to one. Such an index cannot answer queries.
   */
  readonly hasArrayValues: boolean;
  readonly documentCount: number;
  add(docKey: string, document: Document, bulk?: boolean): void;
  finishBulk(): void;
  remove(docKey: string, document: Document): void;
  conflictFor(docKey: string, document: Document): IndexConflict | undefined;
  contents(): IndexContents;
  orderedKeyCount(): number;
}
