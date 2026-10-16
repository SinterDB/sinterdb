// The public API of the `sinterdb` package.
//
// Everything exported here is covered by docs/compatibility.md and tracked in
// etc/sinterdb.api.md. Export names explicitly: a new `export *` would make
// every export of that module public by accident.

export { CustomId } from "sinterdb-protocol";
export type { Document } from "sinterdb-protocol";

export {
  DEFAULT_CONNECT_TIMEOUT_MS,
  DEFAULT_REQUEST_TIMEOUT_MS,
  DEFAULT_SOCKET_TIMEOUT_MS,
  SinterClient,
  SinterClientState,
} from "./client.js";
export type {
  SinterClientEvents,
  SinterClientOptions,
  SinterPingResult,
  SinterServerInfo,
} from "./client.js";

export type {
  AggregateOptions,
  AggregationStage,
  GroupAccumulator,
  GroupSpecification,
  GroupValue,
} from "./aggregation.js";

export { SinterCollection } from "./collection.js";
export type {
  DistinctValue,
  EqualityFilter,
  FindOneOptions,
  FindOptions,
  InsertManyResult,
  InsertOneResult,
  OptionalId,
  WithId,
} from "./collection.js";
export type {
  ProjectedDocument,
  Projection,
  ProjectionFlag,
} from "./projection.js";

export { DEFAULT_SINTERDB_PORT } from "./connection-string.js";
export type { ParsedSinterConnectionString } from "./connection-string.js";

export { AggregateCursor, FindCursor } from "./cursor.js";
export type { CursorExecutor, FindQueryOptions } from "./cursor.js";

export { SinterDatabase } from "./database.js";

export {
  SinterClientOptionsError,
  SinterClientStateError,
  SinterCompatibilityError,
  SinterConnectionError,
  SinterConnectionStringError,
  SinterConnectionTimeoutError,
  SinterDocumentError,
  SinterError,
  SinterErrorCode,
  SinterInsertManyError,
  SinterProtocolError,
  SinterRequestTimeoutError,
  SinterServerError,
  SinterSocketTimeoutError,
} from "./errors.js";
export type { SinterServerErrorOptions } from "./errors.js";

export type {
  ArrayOperators,
  AtomicValue,
  ComparableValue,
  ComparisonOperators,
  ElementMatch,
  ElementOf,
  FieldPaths,
  Filter,
  FilterOperators,
  FilterPaths,
  FilterPathValue,
  MaxPathDepth,
  PathChild,
  Sort,
  SortDirection,
} from "./filter.js";

export type {
  CreateIndexResult,
  ExplainResult,
  IndexablePath,
  IndexBoundInfo,
  IndexDefinition,
  IndexDefinitionOptions,
  IndexInfo,
  IndexKeyInfo,
  IndexIssue,
  IndexValidationResult,
} from "./indexes.js";

export { SinterNamespaceError } from "./namespace.js";

export type {
  ArrayPaths,
  ComparablePaths,
  DeleteResult,
  NumericPaths,
  PathsMatching,
  UpdateFilter,
  UpdateOptions,
  UpdatePaths,
  UpdateResult,
} from "./update.js";
