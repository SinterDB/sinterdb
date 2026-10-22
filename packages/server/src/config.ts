import type { WriteConcern } from "@sinterdb-internal/storage";

export const DEFAULT_SERVER_HOST = "127.0.0.1";
export const DEFAULT_SERVER_PORT = 4721;
export const DEFAULT_WRITE_CONCERN: WriteConcern = "flushed";
export const DEFAULT_CHECKPOINT_KEEP = 2;

export interface ServerConfig {
  host: string;
  port: number;
  /**
   * Directory for durable storage. When it is not set the server keeps all
   * data in memory and loses it on shutdown.
   */
  dataDirectory?: string;
  writeConcern: WriteConcern;
  /**
   * Bytes of log written between automatic checkpoints. The storage engine's
   * default applies when it is not set.
   */
  checkpointThresholdBytes?: number;
  /** Seconds between time-based checkpoints. Off when it is not set. */
  checkpointIntervalSeconds?: number;
  /** Snapshots to keep after checkpoint, at least 2. */
  checkpointKeep: number;
  /**
   * Take over a data directory lock left by a process on another host or
   * container. Off by default.
   */
  reclaimLock: boolean;
  /**
   * Emit a `command` event on the server for every command it runs. Off by
   * default, so a server pays nothing for events nobody asked for.
   */
  logOperations: boolean;
}

export interface ServerConfigInput {
  host?: string;
  port?: number | string;
  dataDirectory?: string;
  writeConcern?: string;
  /**
   * Deprecated name for `writeConcern` that accepts `fsync` and `buffered`.
   *
   * @deprecated use `writeConcern`.
   */
  durability?: string;
  checkpointThresholdBytes?: number | string;
  checkpointIntervalSeconds?: number | string;
  checkpointKeep?: number | string;
  reclaimLock?: boolean | string;
  logOperations?: boolean | string;
}

/**
 * The environment variables the server reads. docs/configuration.md documents
 * each of them, and a test fails when the two lists differ.
 */
export const SERVER_ENVIRONMENT_VARIABLES = [
  "SINTERDB_HOST",
  "SINTERDB_PORT",
  "SINTERDB_DATA_DIR",
  "SINTERDB_WRITE_CONCERN",
  "SINTERDB_DURABILITY",
  "SINTERDB_CHECKPOINT_BYTES",
  "SINTERDB_CHECKPOINT_INTERVAL",
  "SINTERDB_CHECKPOINT_KEEP",
  "SINTERDB_RECLAIM_LOCK",
  "SINTERDB_LOG_OPERATIONS",
] as const;

export type ServerEnvironment = Readonly<{
  [Name in (typeof SERVER_ENVIRONMENT_VARIABLES)[number]]?: string;
}>;

export type ServerConfigurationOption =
  | "host"
  | "port"
  | "dataDirectory"
  | "writeConcern"
  | "durability"
  | "checkpointThresholdBytes"
  | "checkpointIntervalSeconds"
  | "checkpointKeep"
  | "reclaimLock"
  | "logOperations";

export class ServerConfigurationError extends Error {
  public readonly option: ServerConfigurationOption;

  public constructor(option: ServerConfigurationOption, message: string) {
    super(message);

    this.name = "ServerConfigurationError";
    this.option = option;
  }
}

export function resolveServerConfig(
  input: ServerConfigInput = {},
  environment: ServerEnvironment = process.env,
): ServerConfig {
  const host = resolveHost(input.host ?? environment.SINTERDB_HOST);
  const port = resolvePort(input.port ?? environment.SINTERDB_PORT);
  const dataDirectory = resolveDataDirectory(
    input.dataDirectory ?? environment.SINTERDB_DATA_DIR,
  );
  const writeConcern = resolveWriteConcern(input, environment);

  if (writeConcern.requested && dataDirectory === undefined) {
    throw new ServerConfigurationError(
      "writeConcern",
      "A write concern only applies when a data directory is configured.",
    );
  }

  const checkpointThresholdBytes = resolveCheckpointThreshold(
    input.checkpointThresholdBytes ?? environment.SINTERDB_CHECKPOINT_BYTES,
  );

  if (checkpointThresholdBytes !== undefined && dataDirectory === undefined) {
    throw new ServerConfigurationError(
      "checkpointThresholdBytes",
      "A checkpoint threshold only applies when a data directory is configured.",
    );
  }

  const checkpointIntervalSeconds = resolveCheckpointInterval(
    input.checkpointIntervalSeconds ?? environment.SINTERDB_CHECKPOINT_INTERVAL,
  );

  if (checkpointIntervalSeconds !== undefined && dataDirectory === undefined) {
    throw new ServerConfigurationError(
      "checkpointIntervalSeconds",
      "A checkpoint interval only applies when a data directory is configured.",
    );
  }

  const requestKeep =
    input.checkpointKeep ?? environment.SINTERDB_CHECKPOINT_KEEP;
  const checkpointKeep = resolveCheckpointKeep(requestKeep);

  if (requestKeep !== undefined && dataDirectory === undefined) {
    throw new ServerConfigurationError(
      "checkpointKeep",
      "The number of snapshots to keep only applies when a data directory is configured.",
    );
  }

  const reclaimLock = resolveReclaimLock(
    input.reclaimLock ?? environment.SINTERDB_RECLAIM_LOCK,
  );

  if (reclaimLock && dataDirectory === undefined) {
    throw new ServerConfigurationError(
      "reclaimLock",
      "Reclaiming a lock only applies when a data directory is configured.",
    );
  }

  const logOperations = resolveBooleanOption(
    "logOperations",
    "Log operations",
    input.logOperations ?? environment.SINTERDB_LOG_OPERATIONS,
  );

  return {
    host,
    port,
    ...(dataDirectory === undefined ? {} : { dataDirectory }),
    writeConcern: writeConcern.value,
    ...(checkpointThresholdBytes === undefined
      ? {}
      : { checkpointThresholdBytes }),
    ...(checkpointIntervalSeconds === undefined
      ? {}
      : { checkpointIntervalSeconds }),
    checkpointKeep,
    reclaimLock,
    logOperations,
  };
}

function resolveHost(value: string | undefined): string {
  if (value === undefined) {
    return DEFAULT_SERVER_HOST;
  }

  const host = value.trim();

  if (host.length === 0) {
    throw new ServerConfigurationError("host", "Server host cannot be empty.");
  }

  return host;
}

function resolvePort(value: number | string | undefined): number {
  if (value === undefined) {
    return DEFAULT_SERVER_PORT;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    throw invalidPort(value);
  }

  const port = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw invalidPort(value);
  }

  return port;
}

function resolveDataDirectory(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const directory = value.trim();

  if (directory.length === 0) {
    throw new ServerConfigurationError(
      "dataDirectory",
      "Server data directory cannot be empty.",
    );
  }

  return directory;
}

const DEPRECATED_DURABILITY_NAMES: Readonly<Record<string, WriteConcern>> = {
  buffered: "journaled",
  fsync: "flushed",
};

function resolveWriteConcern(
  input: ServerConfigInput,
  environment: ServerEnvironment,
): { value: WriteConcern; requested: boolean } {
  const preferred = input.writeConcern ?? environment.SINTERDB_WRITE_CONCERN;
  const deprecated = input.durability ?? environment.SINTERDB_DURABILITY;

  if (preferred !== undefined && deprecated !== undefined) {
    throw new ServerConfigurationError(
      "writeConcern",
      "Set the write concern or the deprecated durability mode, not both.",
    );
  }

  if (preferred !== undefined) {
    const mode = preferred.trim();

    if (mode !== "memory" && mode !== "journaled" && mode !== "flushed") {
      throw new ServerConfigurationError(
        "writeConcern",
        `Server write concern must be "memory", "journaled" or "flushed"; received ${JSON.stringify(preferred)}.`,
      );
    }

    return { value: mode, requested: true };
  }

  if (deprecated !== undefined) {
    const mapped = DEPRECATED_DURABILITY_NAMES[deprecated.trim()];

    if (mapped === undefined) {
      throw new ServerConfigurationError(
        "durability",
        `Server durability must be "buffered" or "fsync"; received ${JSON.stringify(deprecated)}. Use a write concern instead.`,
      );
    }

    return { value: mapped, requested: true };
  }

  return { value: DEFAULT_WRITE_CONCERN, requested: false };
}

function resolveCheckpointThreshold(
  value: number | string | undefined,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const bytes =
    typeof value === "number"
      ? value
      : value.trim().length === 0
        ? Number.NaN
        : Number(value);

  if (!Number.isSafeInteger(bytes) || bytes < 1) {
    throw new ServerConfigurationError(
      "checkpointThresholdBytes",
      `Checkpoint threshold must be a positive integer number of bytes; received ${JSON.stringify(value)}.`,
    );
  }

  return bytes;
}

function resolveCheckpointInterval(
  value: number | string | undefined,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const seconds = toNumber(value);

  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 2_000_000) {
    throw new ServerConfigurationError(
      "checkpointIntervalSeconds",
      `Checkpoint interval must be a whole number of seconds from 1 to 2000000; received: ${JSON.stringify(value)}.`,
    );
  }

  return seconds;
}

function resolveCheckpointKeep(value: number | string | undefined): number {
  if (value === undefined) {
    return DEFAULT_CHECKPOINT_KEEP;
  }

  const keep = toNumber(value);

  if (!Number.isSafeInteger(keep) || keep < 2 || keep > 100) {
    throw new ServerConfigurationError(
      "checkpointKeep",
      `The number of snapshots to keep must be a whole number from 2 to 100; received ${JSON.stringify(value)}.`,
    );
  }

  return keep;
}

function toNumber(value: number | string): number {
  return typeof value === "number"
    ? value
    : value.trim().length === 0
      ? Number.NaN
      : Number(value);
}

function resolveReclaimLock(value: boolean | string | undefined): boolean {
  return resolveBooleanOption("reclaimLock", "Reclaim lock", value);
}

function resolveBooleanOption(
  option: ServerConfigurationOption,
  label: string,
  value: boolean | string | undefined,
): boolean {
  if (value === undefined) {
    return false;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const text = value.trim();

  if (text !== "true" && text !== "false") {
    throw new ServerConfigurationError(
      option,
      `${label} must be "true" or "false"; received ${JSON.stringify(value)}.`,
    );
  }

  return text === "true";
}

function invalidPort(value: number | string): ServerConfigurationError {
  return new ServerConfigurationError(
    "port",
    `Server port must be an integer between 0 and 65535; received ${JSON.stringify(value)}.`,
  );
}
