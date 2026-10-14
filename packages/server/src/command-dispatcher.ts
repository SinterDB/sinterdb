import {
  compileFilter,
  compileUpdate,
  normalizeIndexSpec,
  StorageError,
  StorageErrorCode,
  StorageInsertManyError,
  type CreateIndexInput,
  type SortSpecification,
  type StorageFindOptions,
  type StorageUpdateResult,
} from "@sinterdb-internal/storage";
import {
  PROTOCOL_VERSION,
  ProtocolCapability,
  WireErrorCode,
  type CommandEnvelope,
  type Document,
  type DocumentValue,
  type WireErrorCodeValue,
} from "sinterdb-protocol";

import {
  CatalogError,
  CatalogErrorCode,
  type InMemoryCatalog,
} from "./catalog.js";
import {
  CursorManager,
  CursorNotFoundError,
  type CursorBatch,
} from "./cursor-manager.js";

export const ServerCommand = {
  ServerInfo: "serverInfo",
  ListDatabases: "listDatabases",
  CreateCollection: "createCollection",
  ListCollections: "listCollections",
  InsertOne: "insertOne",
  InsertMany: "insertMany",
  DeleteOne: "deleteOne",
  DeleteMany: "deleteMany",
  ReplaceOne: "replaceOne",
  UpdateOne: "updateOne",
  UpdateMany: "updateMany",
  FindOne: "findOne",
  Find: "find",
  GetMore: "getMore",
  CloseCursor: "closeCursor",
  CreateIndex: "createIndex",
  DropIndex: "dropIndex",
  ListIndexes: "listIndexes",
  Explain: "explain",
  ValidateIndexes: "validateIndexes",
} as const;

export type ServerCommand = (typeof ServerCommand)[keyof typeof ServerCommand];

export const SERVER_PRODUCT = "sinterdb-server";
export const SERVER_PRODUCT_VERSION = "0.2.0";

export class CommandExecutionError extends Error {
  public readonly code: WireErrorCodeValue;
  public readonly retryable: boolean;
  public readonly details: Document | undefined;

  public constructor(
    code: WireErrorCodeValue,
    name:
      | "CursorNotFound"
      | "DocumentValidationFailed"
      | "DuplicateKey"
      | "ImmutableId"
      | "InternalError"
      | "InvalidRequest"
      | "InvalidUpdate"
      | "InvalidIndex"
      | "IndexNotFound"
      | "IndexConflict"
      | "NamespaceConflict"
      | "UnknownCommand",
    message: string,
    options: {
      retryable?: boolean;
      details?: Document;
    } = {},
  ) {
    super(message);

    this.name = name;
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
  }
}

export class CommandDispatcher {
  public constructor(private readonly catalog: InMemoryCatalog) {}

  public dispatch(
    command: CommandEnvelope,
    cursors: CursorManager = new CursorManager(),
  ): DocumentValue {
    switch (command.command) {
      case ServerCommand.ServerInfo:
        return this.serverInfo();

      case ServerCommand.ListDatabases:
        return this.listDatabases();

      case ServerCommand.CreateCollection:
        return this.createCollection(command);

      case ServerCommand.ListCollections:
        return this.listCollections(command);

      case ServerCommand.InsertOne:
        return this.insertOne(command);

      case ServerCommand.InsertMany:
        return this.insertMany(command);

      case ServerCommand.FindOne:
        return this.findOne(command);

      case ServerCommand.DeleteOne:
        return this.deleteDocuments(command, false);

      case ServerCommand.DeleteMany:
        return this.deleteDocuments(command, true);

      case ServerCommand.ReplaceOne:
        return this.replaceOne(command);

      case ServerCommand.UpdateOne:
        return this.updateDocuments(command, false);

      case ServerCommand.UpdateMany:
        return this.updateDocuments(command, true);

      case ServerCommand.Find:
        return this.find(command, cursors);

      case ServerCommand.GetMore:
        return this.getMore(command, cursors);

      case ServerCommand.CloseCursor:
        return this.closeCursor(command, cursors);

      case ServerCommand.CreateIndex:
        return this.createIndex(command);

      case ServerCommand.DropIndex:
        return this.dropIndex(command);

      case ServerCommand.ListIndexes:
        return this.listIndexes(command);

      case ServerCommand.Explain:
        return this.explain(command);

      case ServerCommand.ValidateIndexes:
        return this.validateIndexes(command);

      default:
        throw new CommandExecutionError(
          WireErrorCode.UnknownCommand,
          "UnknownCommand",
          `Unknown command ${JSON.stringify(command.command)}.`,
          {
            details: {
              command: command.command,
            },
          },
        );
    }
  }

  private serverInfo(): Document {
    return {
      product: SERVER_PRODUCT,
      productVersion: SERVER_PRODUCT_VERSION,
      protocolVersion: PROTOCOL_VERSION,
      capabilities: [
        ProtocolCapability.TypedDocuments,
        ProtocolCapability.Streaming,
        ProtocolCapability.Projection,
      ],
    };
  }

  private listDatabases(): Document {
    return {
      databases: this.catalog.listDatabases(),
    };
  }

  private createCollection(command: CommandEnvelope): Document {
    const databaseName = requireDatabase(command);
    const collectionName = requireStringParameter(command.parameters, "name");

    try {
      const created = this.catalog.createCollection(
        databaseName,
        collectionName,
      );

      return {
        ...created,
        created: true,
      };
    } catch (error: unknown) {
      throw translateCatalogError(error);
    }
  }

  private listCollections(command: CommandEnvelope): Document {
    const databaseName = requireDatabase(command);

    try {
      return {
        database: databaseName,
        collections: this.catalog.listCollections(databaseName),
      };
    } catch (error: unknown) {
      throw translateCatalogError(error);
    }
  }

  private deleteDocuments(command: CommandEnvelope, many: boolean): Document {
    const databaseName = requireDatabase(command);
    const collectionName = requireStringParameter(
      command.parameters,
      "collection",
    );
    const filter = requireDocumentParameter(command.parameters, "filter");

    try {
      const collection = this.catalog.getCollection(
        databaseName,
        collectionName,
      );

      if (collection === undefined) {
        compileFilter(filter);

        return { acknowledged: true, deletedCount: 0 };
      }

      const result = many
        ? collection.deleteMany(filter)
        : collection.deleteOne(filter);

      return { acknowledged: true, deletedCount: result.deletedCount };
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        throw translateCatalogError(error);
      }

      throw translateStorageError(error);
    }
  }

  private replaceOne(command: CommandEnvelope): Document {
    const databaseName = requireDatabase(command);
    const collectionName = requireStringParameter(
      command.parameters,
      "collection",
    );
    const filter = requireDocumentParameter(command.parameters, "filter");
    const replacement = requireDocumentParameter(
      command.parameters,
      "replacement",
    );
    const upsert = optionalBooleanParameter(command.parameters, "upsert");

    try {
      const collection = upsert
        ? this.catalog.getOrCreateCollection(databaseName, collectionName)
        : this.catalog.getCollection(databaseName, collectionName);

      if (collection === undefined) {
        compileFilter(filter);

        return toWriteResult({ matchedCount: 0, modifiedCount: 0 });
      }

      return toWriteResult(
        collection.replaceOne(filter, replacement, { upsert }),
      );
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        throw translateCatalogError(error);
      }

      throw translateStorageError(error);
    }
  }

  private updateDocuments(command: CommandEnvelope, many: boolean): Document {
    const databaseName = requireDatabase(command);
    const collectionName = requireStringParameter(
      command.parameters,
      "collection",
    );
    const filter = requireDocumentParameter(command.parameters, "filter");
    const update = requireDocumentParameter(command.parameters, "update");
    const upsert = optionalBooleanParameter(command.parameters, "upsert");
    try {
      const collection = upsert
        ? this.catalog.getOrCreateCollection(databaseName, collectionName)
        : this.catalog.getCollection(databaseName, collectionName);

      if (collection === undefined) {
        compileFilter(filter);
        compileUpdate(update);

        return toWriteResult({ matchedCount: 0, modifiedCount: 0 });
      }

      return toWriteResult(
        many
          ? collection.updateMany(filter, update, { upsert })
          : collection.updateOne(filter, update, { upsert }),
      );
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        throw translateCatalogError(error);
      }

      throw translateStorageError(error);
    }
  }

  private createIndex(command: CommandEnvelope): Document {
    const databaseName = requireDatabase(command);
    const collectionName = requireStringParameter(
      command.parameters,
      "collection",
    );
    const input = parseIndexInput(
      requireDocumentParameter(command.parameters, "index"),
    );

    try {
      // Validate the definition first so a bad one does not create the
      // collection as a side effect.
      normalizeIndexSpec(input);

      const result = this.catalog
        .getOrCreateCollection(databaseName, collectionName)
        .createIndex(input);

      return {
        acknowledged: true,
        name: result.name,
        created: result.created,
      };
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        throw translateCatalogError(error);
      }

      throw translateStorageError(error);
    }
  }

  private dropIndex(command: CommandEnvelope): Document {
    const databaseName = requireDatabase(command);
    const collectionName = requireStringParameter(
      command.parameters,
      "collection",
    );
    const name = requireStringParameter(command.parameters, "name");

    try {
      const collection = this.catalog.getCollection(
        databaseName,
        collectionName,
      );

      if (collection === undefined) {
        throw new StorageError(
          StorageErrorCode.IndexNotFound,
          `There is no index named ${JSON.stringify(name)}.`,
        );
      }

      collection.dropIndex(name);

      return { acknowledged: true };
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        throw translateCatalogError(error);
      }

      throw translateStorageError(error);
    }
  }

  private listIndexes(command: CommandEnvelope): Document {
    const databaseName = requireDatabase(command);
    const collectionName = requireStringParameter(
      command.parameters,
      "collection",
    );

    try {
      const collection = this.catalog.getCollection(
        databaseName,
        collectionName,
      );

      return {
        indexes: (collection?.listIndexes() ?? []).map((index) => ({
          name: index.name,
          field: index.field,
          direction: index.direction,
          unique: index.unique,
          sparse: index.sparse,
        })),
      };
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        throw translateCatalogError(error);
      }

      throw translateStorageError(error);
    }
  }

  private explain(command: CommandEnvelope): Document {
    const databaseName = requireDatabase(command);
    const collectionName = requireStringParameter(
      command.parameters,
      "collection",
    );
    const filter = requireDocumentParameter(command.parameters, "filter");

    try {
      const collection = this.catalog.getCollection(
        databaseName,
        collectionName,
      );

      if (collection === undefined) {
        compileFilter(filter);

        return { stage: "COLLSCAN", estimatedCandidates: 0, documents: 0 };
      }

      return collection.explain(filter) as unknown as Document;
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        throw translateCatalogError(error);
      }

      throw translateStorageError(error);
    }
  }

  private validateIndexes(command: CommandEnvelope): Document {
    const databaseName = requireDatabase(command);
    const collectionName = requireStringParameter(
      command.parameters,
      "collection",
    );

    try {
      const collection = this.catalog.getCollection(
        databaseName,
        collectionName,
      );

      if (collection === undefined) {
        return { valid: true, indexes: 0, documents: 0, issues: [] };
      }

      const report = collection.validateIndexes();

      return {
        valid: report.valid,
        indexes: report.indexes,
        documents: report.documents,
        issues: report.issues.map((issue) => ({
          index: issue.index,
          problem: issue.problem,
          detail: issue.detail,
        })),
      };
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        throw translateCatalogError(error);
      }

      throw translateStorageError(error);
    }
  }

  private insertOne(command: CommandEnvelope): Document {
    const databaseName = requireDatabase(command);
    const collectionName = requireStringParameter(
      command.parameters,
      "collection",
    );
    const document = requireDocumentParameter(command.parameters, "document");

    try {
      const collection = this.catalog.getOrCreateCollection(
        databaseName,
        collectionName,
      );
      const result = collection.insertOne(document);

      return {
        acknowledged: true,
        insertedId: result.insertedId,
      };
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        throw translateCatalogError(error);
      }

      throw translateStorageError(error);
    }
  }

  private insertMany(command: CommandEnvelope): Document {
    const databaseName = requireDatabase(command);
    const collectionName = requireStringParameter(
      command.parameters,
      "collection",
    );
    const documents = requireDocumentArrayParameter(
      command.parameters,
      "documents",
    );

    try {
      const collection = this.catalog.getOrCreateCollection(
        databaseName,
        collectionName,
      );
      const result = collection.insertMany(documents);

      return {
        acknowledged: true,
        insertedCount: result.insertedIds.length,
        insertedIds: [...result.insertedIds],
      };
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        throw translateCatalogError(error);
      }

      throw translateStorageError(error);
    }
  }

  private findOne(command: CommandEnvelope): Document {
    const databaseName = requireDatabase(command);
    const collectionName = requireStringParameter(
      command.parameters,
      "collection",
    );
    const filter = requireDocumentParameter(command.parameters, "filter");
    const projection = optionalDocumentParameter(
      command.parameters,
      "projection",
    );

    try {
      const collection = this.catalog.getCollection(
        databaseName,
        collectionName,
      );

      if (collection === undefined) {
        return {
          document: null,
        };
      }

      return {
        document:
          collection.findOne(
            filter,
            projection === undefined ? {} : { projection },
          ) ?? null,
      };
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        throw translateCatalogError(error);
      }

      throw translateStorageError(error);
    }
  }

  private find(command: CommandEnvelope, cursors: CursorManager): Document {
    const databaseName = requireDatabase(command);
    const collectionName = requireStringParameter(
      command.parameters,
      "collection",
    );
    const filter = requireDocumentParameter(command.parameters, "filter");
    const batchSize = optionalBatchSize(command.parameters);
    const findOptions = parseFindOptions(command.parameters);

    try {
      const collection = this.catalog.getCollection(
        databaseName,
        collectionName,
      );

      if (collection === undefined) {
        return { cursorId: null, documents: [] };
      }

      return toBatchDocument(
        cursors.open(collection.find(filter, findOptions), batchSize),
      );
    } catch (error: unknown) {
      if (error instanceof CatalogError) {
        throw translateCatalogError(error);
      }

      throw translateStorageError(error);
    }
  }

  private getMore(command: CommandEnvelope, cursors: CursorManager): Document {
    const cursorId = requireCursorId(command.parameters);
    const batchSize = optionalBatchSize(command.parameters);

    try {
      return toBatchDocument(cursors.getMore(cursorId, batchSize));
    } catch (error: unknown) {
      if (error instanceof CursorNotFoundError) {
        throw new CommandExecutionError(
          WireErrorCode.CursorNotFound,
          "CursorNotFound",
          error.message,
          { details: { cursorId: error.cursorId } },
        );
      }

      throw translateStorageError(error);
    }
  }

  private closeCursor(
    command: CommandEnvelope,
    cursors: CursorManager,
  ): Document {
    const cursorId = requireCursorId(command.parameters);

    return { closed: cursors.close(cursorId) };
  }
}

const MAX_CURSOR_BATCH_SIZE = 10_000;

function toBatchDocument(batch: CursorBatch): Document {
  return {
    cursorId: batch.cursorId,
    documents: [...batch.documents],
  };
}

function requireCursorId(parameters: Document): number {
  const value = parameters["cursorId"];

  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new CommandExecutionError(
      WireErrorCode.InvalidRequest,
      "InvalidRequest",
      'Command parameter "cursorId" must be a positive integer.',
      { details: { field: "cursorId" } },
    );
  }

  return value;
}

function requireDatabase(command: CommandEnvelope): string {
  if (command.database === undefined) {
    throw new CommandExecutionError(
      WireErrorCode.InvalidRequest,
      "InvalidRequest",
      `Command ${JSON.stringify(command.command)} requires a database.`,
      {
        details: {
          command: command.command,
          field: "database",
        },
      },
    );
  }

  return command.database;
}

function requireStringParameter(parameters: Document, name: string): string {
  const value = parameters[name];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new CommandExecutionError(
      WireErrorCode.InvalidRequest,
      "InvalidRequest",
      `Command parameter ${JSON.stringify(name)} must be a non-empty string.`,
      {
        details: {
          field: name,
        },
      },
    );
  }

  return value;
}

function requireDocumentParameter(
  parameters: Document,
  name: string,
): Document {
  const value = parameters[name];

  if (!isPlainDocument(value)) {
    throw new CommandExecutionError(
      WireErrorCode.InvalidRequest,
      "InvalidRequest",
      `Command parameter ${JSON.stringify(name)} must be a document.`,
      {
        details: {
          field: name,
        },
      },
    );
  }

  return value;
}

function requireDocumentArrayParameter(
  parameters: Document,
  name: string,
): Document[] {
  const value = parameters[name];

  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every(isPlainDocument)
  ) {
    throw new CommandExecutionError(
      WireErrorCode.InvalidRequest,
      "InvalidRequest",
      `Command parameter ${JSON.stringify(name)} must be a non-empty array of documents.`,
      {
        details: {
          field: name,
        },
      },
    );
  }

  return value;
}

function isPlainDocument(value: unknown): value is Document {
  if (typeof value !== "object" || value == null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function translateCatalogError(error: unknown): CommandExecutionError {
  if (!(error instanceof CatalogError)) {
    throw error;
  }

  if (error.code === CatalogErrorCode.NamespaceConflict) {
    return new CommandExecutionError(
      WireErrorCode.NamespaceConflict,
      "NamespaceConflict",
      error.message,
    );
  }

  return new CommandExecutionError(
    WireErrorCode.InvalidRequest,
    "InvalidRequest",
    error.message,
    {
      details: {
        catalogErrorCode: error.code,
      },
    },
  );
}

function translateStorageError(error: unknown): CommandExecutionError {
  if (!(error instanceof StorageError)) {
    throw error;
  }

  const batchDetails: Document =
    error instanceof StorageInsertManyError
      ? {
          failedIndex: error.failedIndex,
          insertedCount: error.insertedIds.length,
          insertedIds: [...error.insertedIds],
        }
      : {};

  if (error.code === StorageErrorCode.DuplicateId) {
    return new CommandExecutionError(
      WireErrorCode.DuplicateKey,
      "DuplicateKey",
      error.message,
      {
        details: {
          field: "_id",
          storageErrorCode: error.code,
          ...batchDetails,
        },
      },
    );
  }

  if (error.code === StorageErrorCode.DuplicateKey) {
    return new CommandExecutionError(
      WireErrorCode.DuplicateKey,
      "DuplicateKey",
      error.message,
      {
        details: {
          storageErrorCode: error.code,
          ...batchDetails,
        },
      },
    );
  }

  if (error.code === StorageErrorCode.InvalidIndex) {
    return new CommandExecutionError(
      WireErrorCode.InvalidIndex,
      "InvalidIndex",
      error.message,
      { details: { storageErrorCode: error.code } },
    );
  }

  if (error.code === StorageErrorCode.IndexNotFound) {
    return new CommandExecutionError(
      WireErrorCode.IndexNotFound,
      "IndexNotFound",
      error.message,
      { details: { storageErrorCode: error.code } },
    );
  }

  if (error.code === StorageErrorCode.IndexConflict) {
    return new CommandExecutionError(
      WireErrorCode.IndexConflict,
      "IndexConflict",
      error.message,
      { details: { storageErrorCode: error.code } },
    );
  }

  if (error.code === StorageErrorCode.InvalidUpdate) {
    return new CommandExecutionError(
      WireErrorCode.InvalidUpdate,
      "InvalidUpdate",
      error.message,
      { details: { storageErrorCode: error.code } },
    );
  }

  if (error.code === StorageErrorCode.ImmutableId) {
    return new CommandExecutionError(
      WireErrorCode.ImmutableId,
      "ImmutableId",
      error.message,
      { details: { field: "_id", storageErrorCode: error.code } },
    );
  }

  if (
    error.code === StorageErrorCode.DiskFull ||
    error.code === StorageErrorCode.PermissionDenied
  ) {
    return new CommandExecutionError(
      WireErrorCode.InternalError,
      "InternalError",
      error.code === StorageErrorCode.DiskFull
        ? "The server's disk is full, so the operation was not applied. Free space on the server and try again."
        : "The server is not allowed to write to its data directory, so the operation was not applied.",
      { details: { storageErrorCode: error.code } },
    );
  }

  if (
    error.code === StorageErrorCode.Io ||
    error.code === StorageErrorCode.Closed ||
    error.code === StorageErrorCode.Corruption ||
    error.code === StorageErrorCode.Locked ||
    error.code === StorageErrorCode.UnsupportedFormat
  ) {
    return new CommandExecutionError(
      WireErrorCode.InternalError,
      "InternalError",
      "The server could not persist the operation. Its outcome is unknown.",
      { details: { storageErrorCode: error.code } },
    );
  }

  return new CommandExecutionError(
    WireErrorCode.DocumentValidationFailed,
    "DocumentValidationFailed",
    error.message,
    {
      details: {
        storageErrorCode: error.code,
        ...batchDetails,
      },
    },
  );
}

const INDEX_OPTIONS = new Set([
  "field",
  "direction",
  "unique",
  "sparse",
  "name",
]);

function parseIndexInput(index: Document): CreateIndexInput {
  for (const key of Object.keys(index)) {
    if (!INDEX_OPTIONS.has(key)) {
      throw new CommandExecutionError(
        WireErrorCode.InvalidRequest,
        "InvalidRequest",
        `Unknown index option ${JSON.stringify(key)}`,
        { details: { field: "index", option: key } },
      );
    }
  }

  return index as unknown as CreateIndexInput;
}

function toWriteResult(result: StorageUpdateResult): Document {
  return {
    acknowledged: true,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedId: result.upsertedId ?? null,
  };
}

function optionalBooleanParameter(parameters: Document, name: string): boolean {
  const value = parameters[name];

  if (value === undefined) {
    return false;
  }

  if (typeof value !== "boolean") {
    throw new CommandExecutionError(
      WireErrorCode.InvalidRequest,
      "InvalidRequest",
      `Command parameter ${JSON.stringify(name)} must be a boolean.`,
      { details: { field: name } },
    );
  }

  return value;
}

function parseFindOptions(parameters: Document): StorageFindOptions {
  const sort = parameters["sort"];
  const skip = optionalIntegerParameter(parameters, "skip", 0);
  const limit = optionalIntegerParameter(parameters, "limit", 1);
  const projection = optionalDocumentParameter(parameters, "projection");

  if (sort !== undefined && !Array.isArray(sort)) {
    throw new CommandExecutionError(
      WireErrorCode.InvalidRequest,
      "InvalidRequest",
      'Command parameter "sort" must be an array of [path, direction] pairs.',
      { details: { field: "sort" } },
    );
  }

  return {
    ...(sort === undefined
      ? {}
      : { sort: sort as unknown as SortSpecification }),
    ...(skip === undefined ? {} : { skip }),
    ...(limit === undefined ? {} : { limit }),
    ...(projection === undefined ? {} : { projection }),
  };
}

function optionalDocumentParameter(
  parameters: Document,
  name: string,
): Document | undefined {
  const value = parameters[name];

  if (value === undefined) {
    return undefined;
  }

  if (!isPlainDocument(value)) {
    throw new CommandExecutionError(
      WireErrorCode.InvalidRequest,
      "InvalidRequest",
      `Command parameter ${JSON.stringify(name)} must be a document.`,
      { details: { field: name } },
    );
  }

  return value;
}

function optionalIntegerParameter(
  parameters: Document,
  name: string,
  minimum: number,
): number | undefined {
  const value = parameters[name];

  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum
  ) {
    throw new CommandExecutionError(
      WireErrorCode.InvalidRequest,
      "InvalidRequest",
      `Command parameter ${JSON.stringify(name)} must be an integer of at least ${minimum}.`,
      { details: { field: name } },
    );
  }

  return value;
}

function optionalBatchSize(parameters: Document): number | undefined {
  const value = parameters["batchSize"];

  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > MAX_CURSOR_BATCH_SIZE
  ) {
    throw new CommandExecutionError(
      WireErrorCode.InvalidRequest,
      "InvalidRequest",
      `Command parameter "batchSize" must be an integer between 1 and ${MAX_CURSOR_BATCH_SIZE}.`,
      { details: { field: "batchSize" } },
    );
  }

  return value;
}
