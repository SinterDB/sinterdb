import { createStyle, padEnd, type Style } from "./style.js";

export type LogLevel = "info" | "warn" | "error";

export type LogFormat = "json" | "pretty";

export interface LogDetails {
  readonly [key: string]: unknown;
}

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly event: string;
  readonly message: string;
  readonly details?: LogDetails;
}

/**
 * Log lines are `pretty` when both output streams are terminals and `json`
 * otherwise, so files, pipes and container logs keep one JSON object per line.
 */
export function activeLogFormat(): LogFormat {
  return process.stdout.isTTY && process.stderr.isTTY ? "pretty" : "json";
}

export function logInfo(
  event: string,
  message: string,
  details?: LogDetails,
): void {
  writeLog("info", event, message, details, process.stdout);
}

export function logError(event: string, message: string, error: unknown): void {
  writeLog(
    "error",
    event,
    message,
    {
      error: serializationError(error),
    },
    process.stderr,
  );
}

/** The part of a server command event that the log needs. */
export interface OperationDetails {
  readonly command: string;
  readonly database?: string;
  readonly collection?: string;
  readonly durationMs: number;
  readonly ok: boolean;
  readonly error?: string;
}

/**
 * One command the server ran. A command that failed (a duplicate key, a bad
 * filter) is a `warn`, because the server itself is fine. Both go to standard
 * output, so the lines of one run stay in order.
 */
export function logOperation(operation: OperationDetails): void {
  const target =
    operation.database === undefined
      ? ""
      : operation.collection === undefined
        ? ` ${operation.database}`
        : ` ${operation.database}.${operation.collection}`;

  writeLog(
    operation.ok ? "info" : "warn",
    "operation",
    `${operation.command}${target}`,
    {
      command: operation.command,
      ...(operation.database === undefined
        ? {}
        : { database: operation.database }),
      ...(operation.collection === undefined
        ? {}
        : { collection: operation.collection }),
      durationMs: Math.round(operation.durationMs * 1000) / 1000,
      ok: operation.ok,
      ...(operation.error === undefined ? {} : { error: operation.error }),
    },
    process.stdout,
  );
}

/** The part of a server connection event that the log needs. */
export interface ConnectionDetails {
  readonly id: number;
  readonly state: "opened" | "closed";
  readonly remoteAddress?: string;
  readonly active: number;
}

/** A client connection opening or closing. */
export function logConnection(connection: ConnectionDetails): void {
  writeLog(
    "info",
    `connection.${connection.state}`,
    `Connection #${connection.id} ${connection.state}.`,
    {
      id: connection.id,
      ...(connection.remoteAddress === undefined
        ? {}
        : { remoteAddress: connection.remoteAddress }),
      active: connection.active,
    },
    process.stdout,
  );
}

/**
 * A problem that affects one connection or request but not the server, such
 * as a client that disconnected abruptly.
 */
export function logWarning(
  event: string,
  message: string,
  error: unknown,
): void {
  writeLog(
    "warn",
    event,
    message,
    {
      error: serializationError(error),
    },
    process.stderr,
  );
}

function writeLog(
  level: LogLevel,
  event: string,
  message: string,
  details: LogDetails | undefined,
  stream: NodeJS.WriteStream,
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    message,
    ...(details === undefined ? {} : { details }),
  };

  stream.write(
    activeLogFormat() === "pretty"
      ? `${formatPrettyLog(entry, createStyle(stream))}\n`
      : `${formatJsonLog(entry)}\n`,
  );
}

export function formatJsonLog(entry: LogEntry): string {
  return JSON.stringify({
    timestamp: entry.timestamp,
    level: entry.level,
    event: entry.event,
    message: entry.message,
    ...(entry.details === undefined ? {} : { details: entry.details }),
  });
}

const BADGES: Record<LogLevel, string> = {
  info: "INFO ",
  warn: "WARN ",
  error: "ERROR",
};

/**
 * One event as a few readable lines: time, level, event name and message on
 * the first, then the details as aligned `name  value` lines.
 */
export function formatPrettyLog(entry: LogEntry, style: Style): string {
  const badge = BADGES[entry.level];
  const paint =
    entry.level === "error"
      ? (text: string) => style.bold(style.red(text))
      : entry.level === "warn"
        ? (text: string) => style.bold(style.yellow(text))
        : (text: string) => style.cyan(text);
  const time = style.dim(clock(entry.timestamp));
  const first = `${time}  ${paint(badge)}  ${style.bold(entry.event)}  ${entry.message}`;
  const indent = " ".repeat(8 + 2 + badge.length + 2);
  const details = entry.details;

  if (details === undefined) {
    return first;
  }

  const lines = [first];
  const keys = Object.keys(details).filter(
    (key) =>
      details[key] !== undefined &&
      key !== "error" &&
      !(Array.isArray(details[key]) && details[key].length === 0),
  );
  const width = Math.max(0, ...keys.map((key) => key.length));

  for (const key of keys) {
    lines.push(
      `${indent}${style.dim(padEnd(key, width))}  ${formatValue(details[key])}`,
    );
  }

  const error = details["error"];

  if (error !== undefined) {
    lines.push(...formatError(error, indent, style));
  }

  return lines.join("\n");
}

function formatError(error: unknown, indent: string, style: Style): string[] {
  if (error === null || typeof error !== "object") {
    return [`${indent}${style.red(String(error))}`];
  }

  const record = error as {
    name?: unknown;
    message?: unknown;
    stack?: unknown;
  };
  const name = typeof record.name === "string" ? record.name : "Error";
  const message = typeof record.message === "string" ? record.message : "";
  const lines = [`${indent}${style.red(`${name}: ${message}`)}`];

  if (typeof record.stack === "string") {
    const frames = record.stack
      .split("\n")
      .filter((line) => line.trimStart().startsWith("at "));

    for (const frame of frames) {
      lines.push(`${indent}${style.dim(frame.trim())}`);
    }
  }

  return lines;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  return JSON.stringify(value, (_key, item: unknown) =>
    typeof item === "bigint" ? item.toString() : item,
  );
}

function clock(timestamp: string): string {
  const date = new Date(timestamp);
  const two = (value: number): string => String(value).padStart(2, "0");

  return `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
}

function serializationError(error: unknown): LogDetails {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack === undefined ? {} : { stack: error.stack }),
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}
