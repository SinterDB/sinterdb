import { parseArgs } from "node:util";

import {
  createBackup,
  restoreBackup,
  verifyBackup,
} from "@sinterdb-internal/server";

import {
  createStyle,
  formatBytes,
  keyValues,
  styleHelp,
  type Style,
} from "./style.js";

export const BACKUP_COMMANDS = ["backup", "restore", "verify-backup"] as const;

export type BackupCommandName = (typeof BACKUP_COMMANDS)[number];

export const BACKUP_HELP_TEXT = `SinterDB Server: backup commands

Usage:
  sinterd backup --data-dir <path> --to <directory> [--reclaim-lock]
  sinterd restore --from <directory> --data-dir <path>
  sinterd verify-backup --from <directory>

Options:
  --data-dir <path>   The data directory to back up, or to restore into
  --to <directory>    Where to write the backup. Must be missing or empty
  --from <directory>  The backup to verify or restore
  --reclaim-lock      Back up a data directory whose lock was left by another
                      host or container. Only use it when no server can be
                      using the directory
  -h, --help          Show this help message

A backup needs the data directory to be closed, so stop the server first. A
backup is checked file by file with SHA-256 checksums, and a restore refuses a
backup that fails the check. A restore needs a missing or empty --data-dir.

Exit codes: 0 success, 1 failure, 2 usage error.
`;

export interface BackupCommand {
  readonly name: BackupCommandName;
  readonly help: boolean;
  readonly dataDir?: string;
  readonly to?: string;
  readonly from?: string;
  readonly reclaimLock: boolean;
}

export class BackupUsageError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BackupUsageError";
  }
}

export function isBackupCommandName(
  value: unknown,
): value is BackupCommandName {
  return BACKUP_COMMANDS.some((name) => name === value);
}

export function parseBackupArguments(
  name: BackupCommandName,
  arguments_: readonly string[],
): BackupCommand {
  let values: ReturnType<typeof parseArgs>["values"];

  try {
    values = parseArgs({
      args: [...arguments_],
      strict: true,
      allowPositionals: false,
      options: {
        "data-dir": { type: "string" },
        to: { type: "string" },
        from: { type: "string" },
        "reclaim-lock": { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
    }).values;
  } catch (error: unknown) {
    throw new BackupUsageError(
      error instanceof Error
        ? error.message
        : "Invalid command-line arguments.",
    );
  }

  const dataDir = readString(values["data-dir"]);
  const to = readString(values["to"]);
  const from = readString(values["from"]);
  const help = values["help"] === true;
  const reclaimLock = values["reclaim-lock"] === true;

  if (!help) {
    const required: Record<BackupCommandName, readonly string[]> = {
      backup: ["--data-dir", "--to"],
      restore: ["--from", "--data-dir"],
      "verify-backup": ["--from"],
    };
    const given: Record<string, string | undefined> = {
      "--data-dir": dataDir,
      "--to": to,
      "--from": from,
    };

    for (const option of required[name]) {
      if (given[option] === undefined || given[option] === "") {
        throw new BackupUsageError(`${name} requires ${option}.`);
      }
    }

    const allowed = new Set(required[name]);

    for (const option of Object.keys(given)) {
      if (given[option] !== undefined && !allowed.has(option)) {
        throw new BackupUsageError(`${name} does not accept ${option}.`);
      }
    }

    if (reclaimLock && name !== "backup") {
      throw new BackupUsageError(`${name} does not accept --reclaim-lock.`);
    }
  }

  return {
    name,
    help,
    ...(dataDir === undefined ? {} : { dataDir }),
    ...(to === undefined ? {} : { to }),
    ...(from === undefined ? {} : { from }),
    reclaimLock,
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function runBackupCommand(command: BackupCommand): void {
  if (command.help) {
    process.stdout.write(
      styleHelp(BACKUP_HELP_TEXT, createStyle(process.stdout)),
    );
    return;
  }

  const style = createStyle(process.stdout);

  try {
    switch (command.name) {
      case "backup": {
        process.stdout.write(
          backupText(
            style,
            required(command.dataDir),
            required(command.to),
            command.reclaimLock,
          ),
        );
        return;
      }

      case "verify-backup": {
        const summary = verifyBackup(required(command.from));

        process.stdout.write(
          formatBackupResult(style, `Backup is intact: ${summary.directory}`, [
            ["files", String(summary.files)],
            ["size", describeSize(summary.bytes)],
            ["created", summary.createdAt],
          ]),
        );
        return;
      }

      case "restore": {
        const result = restoreBackup({
          backupDirectory: required(command.from),
          dataDirectory: required(command.dataDir),
        });

        process.stdout.write(
          formatBackupResult(style, `Restored to ${result.directory}`, [
            ["files", String(result.files)],
            ["size", describeSize(result.bytes)],
            ["log position", String(result.recovery.lastLsn)],
          ]),
        );
        return;
      }
    }
  } catch (error: unknown) {
    const failure = createStyle(process.stderr);

    process.stderr.write(
      `${failure.bold(failure.red(`${command.name} failed:`))} ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}

/** Backs up a closed data directory and describes the result. */
export function backupText(
  style: Style,
  dataDirectory: string,
  backupDirectory: string,
  reclaimLock = false,
): string {
  const result = createBackup({
    dataDirectory,
    backupDirectory,
    ...(reclaimLock ? { reclaimLock: true } : {}),
  });

  return formatBackupResult(style, `Backup written to ${result.directory}`, [
    ["files", String(result.files)],
    ["size", describeSize(result.bytes)],
  ]);
}

function describeSize(bytes: number): string {
  return bytes < 1024
    ? `${bytes} bytes`
    : `${formatBytes(bytes)} (${bytes} bytes)`;
}

export function formatBackupResult(
  style: Style,
  headline: string,
  rows: readonly (readonly [string, string])[],
): string {
  return `${[
    `${style.green(style.symbols.ok)} ${style.bold(headline)}`,
    ...keyValues(style, rows, 2),
  ].join("\n")}\n`;
}

function required(value: string | undefined): string {
  if (value === undefined) {
    throw new BackupUsageError("A required option is missing.");
  }

  return value;
}
