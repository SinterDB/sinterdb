export { CompoundIndex } from "./compound-index.js";
export { FieldIndex } from "./field-index.js";
export { IndexSet } from "./index-set.js";
export { candidateKeys, planQuery } from "./planner.js";
export {
  ID_INDEX_NAME,
  MAX_INDEXES_PER_COLLECTION,
  MAX_INDEX_KEYS,
  MAX_INDEX_NAME_LENGTH,
  idIndexSpec,
  normalizeIndexSpec,
  sameDefinition,
} from "./spec.js";

export type { IndexBound, IndexConflict } from "./field-index.js";
export type { DocumentChange, IndexIssue } from "./index-set.js";
export type { IndexAccess, QueryPlan } from "./planner.js";
export type { SecondaryIndex } from "./secondary-index.js";
export type { CreateIndexInput, IndexKey, IndexSpec } from "./spec.js";
