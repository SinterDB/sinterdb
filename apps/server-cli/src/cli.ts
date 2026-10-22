import { parseArgs } from "node:util";

export const HELP_TEXT = `SinterDB Server

Usage:
  sinterd [options]
  sinterd backup | restore | verify-backup (see sinterd backup --help)
  sinterd inspect | repair (see sinterd inspect --help)
  sinterd config list | get | set | unset | path (see sinterd config --help)

Options:
  --host <host>       Address to listen on
  -p, --port <port>   TCP port to listen on
  --data-dir <path>   Store data durably in this directory
  --write-concern <level>
                      How writes are acknowledged: flushed (default),
                      journaled or memory
  --durability <mode> Deprecated: fsync means flushed, buffered means journaled
  --checkpoint-bytes <n>
                      Bytes of log between automatic checkpoints (default 64 MiB)
  --checkpoint-interval <seconds>
                      Also checkpoint at least this often when data changed
                      (default: only by size)
  --checkpoint-keep <n>
                      Snapshots to keep after a checkpoint, at least 2
                      (default 2)
  --reclaim-lock      Take over a data directory lock left by another host or
                      container. Only use it when no other server can be using
                      the directory
  --config <path>     Read settings from this config file (default: the
                      sinterdb/config.json in your user config directory)
  --log-operations    Log one "operation" event for every command the server
                      runs: the command, database, collection, how long it
                      took, and whether it worked
  -h, --help          Show this help message
  -v, --version       Show the server version

Without --data-dir all data is kept in memory and lost on shutdown.

Write concerns (with --data-dir):
  flushed    A write is acknowledged after it reaches stable storage. It
             survives a crash or power loss.
  journaled  A write is acknowledged after it reaches the operating system. It
             survives a server crash but can be lost on power loss.
  memory     A write is acknowledged once it is applied in memory and written
             to the log within about 100 ms. A server crash can lose the most
             recent writes.

Set NO_COLOR to turn colors off, or FORCE_COLOR to turn them on.

Environment:
  SINTERDB_HOST          Default listening address
  SINTERDB_PORT          Default listening port
  SINTERDB_DATA_DIR      Default data directory
  SINTERDB_WRITE_CONCERN Default write concern
  SINTERDB_DURABILITY    Deprecated name for SINTERDB_WRITE_CONCERN
  SINTERDB_CHECKPOINT_BYTES
                         Default bytes of log between checkpoints
  SINTERDB_CHECKPOINT_INTERVAL
                         Default seconds between time-based checkpoints
  SINTERDB_CHECKPOINT_KEEP
                         Default number of snapshots to keep
  SINTERDB_RECLAIM_LOCK  Set to true to take over a lock left by another host
  SINTERDB_LOG_OPERATIONS
                         Set to true to log every command (--log-operations)

`;

export type CliCommand =
  | {
      kind: "start";
      host?: string;
      port?: string;
      dataDir?: string;
      writeConcern?: string;
      durability?: string;
      checkpointBytes?: string;
      checkpointInterval?: string;
      checkpointKeep?: string;
      reclaimLock?: boolean;
      logOperations?: boolean;
      config?: string;
    }
  | {
      kind: "help";
    }
  | {
      kind: "version";
    };

export class CliUsageError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

export function parseCliArguments(arguments_: readonly string[]): CliCommand {
  let parsed: ReturnType<typeof parseArgs>;

  try {
    parsed = parseArgs({
      args: [...arguments_],
      strict: true,
      allowPositionals: false,
      options: {
        host: {
          type: "string",
        },
        port: {
          type: "string",
          short: "p",
        },
        "data-dir": {
          type: "string",
        },
        "write-concern": {
          type: "string",
        },
        durability: {
          type: "string",
        },
        "checkpoint-bytes": {
          type: "string",
        },
        "reclaim-lock": {
          type: "boolean",
        },
        "log-operations": {
          type: "boolean",
        },
        config: {
          type: "string",
        },
        "checkpoint-interval": {
          type: "string",
        },
        "checkpoint-keep": {
          type: "string",
        },
        help: {
          type: "boolean",
          short: "h",
        },
        version: {
          type: "boolean",
          short: "v",
        },
      },
    });
  } catch (error: unknown) {
    throw new CliUsageError(
      error instanceof Error
        ? error.message
        : "Invalid command-line arguments.",
    );
  }

  const help = readBooleanOption(parsed.values, "help");
  const version = readBooleanOption(parsed.values, "version");
  const host = readStringOption(parsed.values, "host");
  const port = readStringOption(parsed.values, "port");
  const dataDir = readStringOption(parsed.values, "data-dir");
  const writeConcern = readStringOption(parsed.values, "write-concern");
  const durability = readStringOption(parsed.values, "durability");
  const checkpointBytes = readStringOption(parsed.values, "checkpoint-bytes");
  const checkpointInterval = readStringOption(
    parsed.values,
    "checkpoint-interval",
  );
  const checkpointKeep = readStringOption(parsed.values, "checkpoint-keep");
  const reclaimLock = readBooleanOption(parsed.values, "reclaim-lock");
  const logOperations = readBooleanOption(parsed.values, "log-operations");
  const config = readStringOption(parsed.values, "config");

  if (help && version) {
    throw new CliUsageError("--help and --version cannot be used together.");
  }

  if (help) {
    return {
      kind: "help",
    };
  }

  if (version) {
    return {
      kind: "version",
    };
  }

  return {
    kind: "start",
    ...(host === undefined ? {} : { host }),
    ...(port === undefined ? {} : { port }),
    ...(dataDir === undefined ? {} : { dataDir }),
    ...(writeConcern === undefined ? {} : { writeConcern }),
    ...(durability === undefined ? {} : { durability }),
    ...(checkpointBytes === undefined ? {} : { checkpointBytes }),
    ...(checkpointInterval === undefined ? {} : { checkpointInterval }),
    ...(checkpointKeep === undefined ? {} : { checkpointKeep }),
    ...(reclaimLock ? { reclaimLock } : {}),
    ...(logOperations ? { logOperations } : {}),
    ...(config === undefined ? {} : { config }),
  };
}

function readBooleanOption(
  values: Readonly<Record<string, unknown>>,
  name: string,
): boolean {
  const value = values[name];

  if (value === undefined) {
    return false;
  }

  if (typeof value !== "boolean") {
    throw new CliUsageError(`Option --${name} must be a boolean flag.`);
  }

  return value;
}

function readStringOption(
  values: Readonly<Record<string, unknown>>,
  name: string,
): string | undefined {
  const value = values[name];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new CliUsageError(`Option --${name} must have a string value.`);
  }

  return value;
}
