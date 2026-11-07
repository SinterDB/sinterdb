import { parseArgs } from "node:util";

import {
  inspectDataDirectory,
  repairDataDirectory,
  type InspectionReport,
  type RepairOptions,
  type RepairResult,
} from "@sinterdb-internal/server";

import {
  PLAIN_STYLE,
  createStyle,
  formatBytes,
  keyValues,
  padEnd,
  styleHelp,
  table,
  title,
  wrap,
  type Style,
} from "./style.js";

export const MAINTENANCE_COMMANDS = ["inspect", "repair"] as const;

export type MaintenanceCommandName = (typeof MAINTENANCE_COMMANDS)[number];

export const MAINTENANCE_HELP_TEXT = `SinterDB Server: inspect and repair commands

Usage:
  sinterd inspect --data-dir <path> [--json]
  sinterd repair --data-dir <path> [--apply] [--rebuild-manifest]
                 [--clear-lock] [--allow-data-loss] [--json]

Options:
  --data-dir <path>     The data directory to examine or repair
  --json                Print the report as JSON
  --apply               Make the changes. Without it, repair only shows what
                        it would do
  --rebuild-manifest    Replace a missing or unreadable manifest.json
  --clear-lock          Take over a lock left by another host or container.
                        Only use it when no server can be using the directory
  --allow-data-loss     Allow steps that discard log records which are not in
                        any snapshot
  -h, --help            Show this help message

inspect never changes anything and can run while a server is using the
directory. repair needs the server stopped. Nothing is deleted: removed files
are moved to quarantine/ inside the data directory.

Exit codes: inspect 0 if the directory can be opened, 1 if not. repair 0 if the
directory is, or after --apply becomes, openable and nothing was skipped, 1
otherwise. 2 for a usage error.
`;

export interface MaintenanceCommand {
  readonly name: MaintenanceCommandName;
  readonly help: boolean;
  readonly dataDir?: string;
  readonly json: boolean;
  readonly apply: boolean;
  readonly rebuildManifest: boolean;
  readonly clearLock: boolean;
  readonly allowDataLoss: boolean;
}

export class MaintenanceUsageError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "MaintenanceUsageError";
  }
}

export function isMaintenanceCommandName(
  value: unknown,
): value is MaintenanceCommandName {
  return MAINTENANCE_COMMANDS.some((name) => name === value);
}

export function parseMaintenanceArguments(
  name: MaintenanceCommandName,
  arguments_: readonly string[],
): MaintenanceCommand {
  let values: ReturnType<typeof parseArgs>["values"];

  try {
    values = parseArgs({
      args: [...arguments_],
      strict: true,
      allowPositionals: false,
      options: {
        "data-dir": { type: "string" },
        json: { type: "boolean" },
        apply: { type: "boolean" },
        "rebuild-manifest": { type: "boolean" },
        "clear-lock": { type: "boolean" },
        "allow-data-loss": { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
    }).values;
  } catch (error: unknown) {
    throw new MaintenanceUsageError(
      error instanceof Error
        ? error.message
        : "Invalid command-line arguments.",
    );
  }

  const dataDir =
    typeof values["data-dir"] === "string" ? values["data-dir"] : undefined;
  const help = values["help"] === true;
  const command: MaintenanceCommand = {
    name,
    help,
    ...(dataDir === undefined ? {} : { dataDir }),
    json: values["json"] === true,
    apply: values["apply"] === true,
    rebuildManifest: values["rebuild-manifest"] === true,
    clearLock: values["clear-lock"] === true,
    allowDataLoss: values["allow-data-loss"] === true,
  };

  if (help) {
    return command;
  }

  if (dataDir === undefined || dataDir === "") {
    throw new MaintenanceUsageError(`${name} requires --data-dir.`);
  }

  if (name === "inspect") {
    const repairOnly: [string, boolean][] = [
      ["--apply", command.apply],
      ["--rebuild-manifest", command.rebuildManifest],
      ["--clear-lock", command.clearLock],
      ["--allow-data-loss", command.allowDataLoss],
    ];

    for (const [option, given] of repairOnly) {
      if (given) {
        throw new MaintenanceUsageError(`inspect does not accept ${option}.`);
      }
    }
  }

  return command;
}

export function runMaintenanceCommand(command: MaintenanceCommand): void {
  if (command.help) {
    process.stdout.write(
      styleHelp(MAINTENANCE_HELP_TEXT, createStyle(process.stdout)),
    );
    return;
  }

  const style = createStyle(process.stdout);
  const directory = command.dataDir as string;

  try {
    if (command.name === "inspect") {
      const report = inspectDataDirectory(directory);

      process.stdout.write(
        command.json ? toJson(report) : formatInspection(report, style),
      );

      if (!report.recovery.recoverable) {
        process.exitCode = 1;
      }

      return;
    }

    const options: RepairOptions = {
      directory,
      ...(command.apply ? { apply: true } : {}),
      ...(command.rebuildManifest ? { rebuildManifest: true } : {}),
      ...(command.clearLock ? { clearLock: true } : {}),
      ...(command.allowDataLoss ? { allowDataLoss: true } : {}),
    };
    const result = repairDataDirectory(options);

    process.stdout.write(
      command.json ? toJson(result) : formatRepair(result, style),
    );

    if (!repairSucceeded(result)) {
      process.exitCode = 1;
    }
  } catch (error: unknown) {
    const failure = createStyle(process.stderr);

    process.stderr.write(
      `${failure.bold(failure.red(`${command.name} failed:`))} ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}

/** What a maintenance action found, as text a person can read. */
export interface MaintenanceOutcome {
  readonly text: string;
  /** Whether the directory is, or after the action became, openable. */
  readonly ok: boolean;
  /** For a repair dry run: whether some of its steps can be carried out now. */
  readonly applicable?: boolean;
}

/** Examines a data directory and describes it. Never changes anything. */
export function inspectDirectory(
  directory: string,
  style: Style,
): MaintenanceOutcome {
  const report = inspectDataDirectory(directory);

  return {
    text: formatInspection(report, style),
    ok: report.recovery.recoverable,
  };
}

/** Repairs a data directory, or with no `apply`, describes what it would do. */
export function repairDirectory(
  options: RepairOptions,
  style: Style,
): MaintenanceOutcome {
  const result = repairDataDirectory(options);

  return {
    text: formatRepair(result, style),
    ok: repairSucceeded(result),
    applicable:
      !result.apply && result.actions.some((action) => action.allowed),
  };
}

function repairSucceeded(result: RepairResult): boolean {
  if (!result.apply) {
    return result.before.recovery.recoverable && result.actions.length === 0;
  }

  return (
    result.after?.recovery.recoverable === true &&
    result.blocked.length === 0 &&
    result.actions.every((action) => action.applied)
  );
}

function toJson(value: unknown): string {
  return `${JSON.stringify(
    value,
    (_key, item: unknown) =>
      typeof item === "bigint" ? item.toString() : item,
    2,
  )}\n`;
}

const HEALTHY_SEGMENTS_SHOWN = 10;

function verdict(style: Style, good: boolean, text: string): string {
  const { ok, fail } = style.symbols;

  return good
    ? `${style.green(ok)} ${style.bold(text)}`
    : `${style.red(fail)} ${style.bold(text)}`;
}

function problemLines(style: Style, problems: readonly string[]): string[] {
  return problems.flatMap((problem) => {
    const [first = "", ...rest] = wrap(style, problem, 4);

    return [
      `  ${style.red(style.symbols.bullet)} ${first.trimStart()}`,
      ...rest,
    ];
  });
}

function segmentStatus(
  style: Style,
  status: string,
  isLast: boolean,
  hasGap: boolean,
): string {
  const text = (() => {
    switch (status) {
      case "ok":
        return style.green("ok");
      case "torn-tail":
        return style.yellow(isLast ? "torn end (normal)" : "torn end");
      case "incomplete-header":
        return style.yellow("empty");
      case "bad-header":
        return style.red("bad header");
      default:
        return style.red(status);
    }
  })();

  return hasGap ? `${text} ${style.red("gap before")}` : text;
}

export function formatInspection(
  report: InspectionReport,
  style: Style = PLAIN_STYLE,
): string {
  const { recovery, manifest, log } = report;
  const lines: string[] = [
    title(style, "SinterDB data directory"),
    report.directory,
    "",
    verdict(
      style,
      recovery.recoverable,
      recovery.recoverable
        ? "The server can open this directory."
        : "The server CANNOT open this directory.",
    ),
    ...problemLines(style, recovery.problems),
    "",
  ];

  const manifestText =
    manifest.status === "ok"
      ? style.green("ok") +
        ` ${style.symbols.dot} storage format version ${manifest.formatVersion}` +
        (manifest.needsUpgrade
          ? style.yellow(` ${style.symbols.dot} upgraded on the next start`)
          : "")
      : style.red(
          `${manifest.status}${manifest.problem === undefined ? "" : `: ${manifest.problem}`}`,
        );
  const lockText =
    report.lock === undefined
      ? style.dim("none")
      : (report.lock.state === "running"
          ? style.yellow(report.lock.state)
          : report.lock.state === "stale"
            ? style.dim(report.lock.state)
            : style.yellow(report.lock.state)) +
        (report.lock.holder === undefined
          ? ""
          : ` ${style.symbols.dot} process ${report.lock.holder.pid} on ${report.lock.holder.hostname}, started ${report.lock.holder.startedAt}`);

  lines.push(
    ...keyValues(
      style,
      [
        ["manifest", manifestText],
        ["lock", lockText],
      ],
      0,
    ),
  );

  lines.push("", style.bold(`Snapshots (${report.snapshots.length})`));

  if (report.snapshots.length === 0) {
    lines.push(`  ${style.dim("none")}`);
  } else {
    lines.push(
      ...table(
        style,
        [
          { header: "FILE" },
          { header: "SIZE", align: "right" },
          { header: "COLLECTIONS", align: "right" },
          { header: "DOCUMENTS", align: "right" },
          { header: "STATUS" },
        ],
        report.snapshots.map((snapshot) => [
          snapshot.file,
          formatBytes(snapshot.bytes),
          snapshot.collections === undefined
            ? ""
            : String(snapshot.collections),
          snapshot.documents === undefined ? "" : String(snapshot.documents),
          snapshot.status === "ok"
            ? style.green("ok")
            : style.red(`damaged: ${snapshot.problem ?? ""}`),
        ]),
      ),
    );
  }

  const range =
    log.firstLsn === undefined || log.records === 0
      ? ""
      : `, sequence numbers ${log.firstLsn} to ${log.lastLsn}`;

  lines.push(
    "",
    style.bold(`Log (${log.segments.length} segments)`) +
      style.dim(` ${log.records} intact records${range}`),
  );

  const unhealthy = log.segments.filter(
    (segment) => segment.status !== "ok" || segment.gap !== undefined,
  );
  const shown =
    log.segments.length - unhealthy.length <= HEALTHY_SEGMENTS_SHOWN
      ? log.segments
      : unhealthy;

  if (log.segments.length === 0) {
    lines.push(`  ${style.dim("none")}`);
  } else {
    lines.push(
      ...table(
        style,
        [
          { header: "FILE" },
          { header: "FIRST", align: "right" },
          { header: "LAST", align: "right" },
          { header: "RECORDS", align: "right" },
          { header: "SIZE", align: "right" },
          { header: "STATUS" },
        ],
        shown.map((segment) => [
          segment.file,
          segment.firstLsn === undefined ? "" : String(segment.firstLsn),
          segment.lastLsn === undefined || segment.records === 0
            ? ""
            : String(segment.lastLsn),
          String(segment.records),
          formatBytes(segment.bytes),
          segmentStatus(
            style,
            segment.status,
            segment === log.segments[log.segments.length - 1],
            segment.gap !== undefined,
          ),
        ]),
      ),
    );

    for (const segment of shown) {
      for (const note of [segment.problem, segment.gap]) {
        if (note !== undefined) {
          const [first = "", ...rest] = wrap(
            style,
            `${segment.file}: ${note}`,
            4,
          );

          lines.push(
            `  ${style.dim(style.symbols.bullet)} ${first.trimStart()}`,
            ...rest,
          );
        }
      }
    }

    if (shown.length < log.segments.length) {
      lines.push(
        style.dim(
          `  ${log.segments.length - shown.length} healthy segments not listed. Use --json for all of them.`,
        ),
      );
    }
  }

  if (report.leftovers.length > 0) {
    lines.push(
      "",
      style.bold("Temporary files") + style.dim(" removed on the next start"),
      ...report.leftovers.map((name) => `  ${name}`),
    );
  }

  lines.push("");

  if (recovery.recoverable) {
    lines.push(
      style.dim(
        recovery.baseSnapshot === undefined
          ? `Recovery would replay ${recovery.recordsToReplay} log records.`
          : `Recovery would start from ${recovery.baseSnapshot} and replay ${recovery.recordsToReplay} log records.`,
      ),
    );
  } else {
    lines.push(
      `Run ${style.cyan("sinterd repair --data-dir <path>")} to see what can be fixed.`,
    );
  }

  return `${lines.join("\n")}\n`;
}

function flagFor(option: string): string {
  switch (option) {
    case "rebuildManifest":
      return "--rebuild-manifest";
    case "clearLock":
      return "--clear-lock";
    default:
      return "--allow-data-loss";
  }
}

export function formatRepair(
  result: RepairResult,
  style: Style = PLAIN_STYLE,
): string {
  const lines: string[] = [
    title(
      style,
      result.apply ? "SinterDB repair" : "SinterDB repair (dry run)",
    ),
    result.directory,
    "",
  ];

  if (result.actions.length === 0 && result.blocked.length === 0) {
    lines.push(
      result.before.recovery.recoverable
        ? verdict(
            style,
            true,
            "Nothing to repair: the server can open this directory.",
          )
        : verdict(style, false, "Nothing the repair command can fix."),
      ...problemLines(
        style,
        result.before.recovery.recoverable
          ? []
          : result.before.recovery.problems,
      ),
    );
  }

  if (result.actions.length > 0) {
    lines.push(style.bold(result.apply ? "Steps" : "Steps it would take"));

    result.actions.forEach((action, index) => {
      const marker = !result.apply
        ? style.dim(`${index + 1}.`)
        : action.applied
          ? style.green(style.symbols.ok)
          : style.yellow(style.symbols.warn);
      const [first = "", ...rest] = wrap(style, action.description, 5);

      lines.push(`  ${padEnd(marker, 2)} ${first.trimStart()}`, ...rest);

      const notes = [
        action.dataLoss
          ? style.yellow("can lose data")
          : style.green("no data lost"),
        action.requires !== undefined && !action.allowed
          ? style.red(`needs ${flagFor(action.requires)}`)
          : undefined,
        result.apply && !action.applied ? style.red("skipped") : undefined,
      ].filter((note): note is string => note !== undefined);

      lines.push(`     ${notes.join(style.dim(` ${style.symbols.dot} `))}`);
    });
  }

  for (const reason of result.blocked) {
    const [first = "", ...rest] = wrap(style, reason, 11);

    lines.push("", `${style.red("Blocked")}  ${first.trimStart()}`, ...rest);
  }

  lines.push("");

  if (!result.apply) {
    if (result.actions.length > 0) {
      lines.push(
        style.dim("Nothing was changed. Add ") +
          style.cyan("--apply") +
          style.dim(" to carry out these steps."),
      );
    }

    return `${lines.join("\n")}\n`;
  }

  if (result.quarantine !== undefined) {
    lines.push(`Removed files were moved to ${style.bold(result.quarantine)}`);
  }

  if (result.after !== undefined) {
    lines.push(
      verdict(
        style,
        result.after.recovery.recoverable,
        result.after.recovery.recoverable
          ? "The server can now open this directory."
          : "The server still cannot open this directory.",
      ),
    );

    if (!result.after.recovery.recoverable) {
      lines.push(...problemLines(style, result.after.recovery.problems));
    }
  }

  return `${lines.join("\n")}\n`;
}
