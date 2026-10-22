import { parseArgs } from "node:util";

import {
  CONFIG_KEYS,
  configKeyVariable,
  defaultConfigPath,
  isConfigKey,
  parseConfigValue,
  readConfigFile,
  resolveConfigEntries,
  validateConfigValue,
  writeConfigFile,
  type ConfigKey,
} from "./config-file.js";
import { createStyle, keyValues, styleHelp, table } from "./style.js";

export const CONFIG_COMMAND = "config";

export const CONFIG_HELP_TEXT = `SinterDB Server: config command

Usage:
  sinterd config list [--config <path>]
  sinterd config get <key> [--config <path>]
  sinterd config set <key> <value> [--config <path>]
  sinterd config unset <key> [--config <path>]
  sinterd config path [--config <path>]

Options:
  --config <path>   Use this config file instead of the default one
  -h, --help        Show this help message

The config file holds settings for the server, so they do not have to be typed
every time. Settings are taken from, in this order: command-line flags,
environment variables, the config file, then the defaults.

list shows every setting, its effective value, and where the value comes from.
get prints one effective value, and exits with 1 when nothing sets it. set
checks the value with the server's own rules before it saves it. A change
takes effect the next time the server starts. path prints the file in use.

Keys:
  host                 Address to listen on
  port                 TCP port to listen on
  dataDir              Directory for durable storage
  writeConcern         flushed, journaled or memory
  checkpointBytes      Bytes of log between checkpoints
  checkpointInterval   Seconds between time-based checkpoints
  checkpointKeep       Snapshots to keep, at least 2
  reclaimLock          Take over a lock left by another host
  logOperations        Log every command the server runs

writeConcern, checkpointBytes, checkpointInterval, checkpointKeep and
reclaimLock only apply when a data directory is set. The default file is
$XDG_CONFIG_HOME/sinterdb/config.json, or ~/.config/sinterdb/config.json.
`;

export const CONFIG_ACTIONS = ["list", "get", "set", "unset", "path"] as const;

export type ConfigAction = (typeof CONFIG_ACTIONS)[number];

export class ConfigUsageError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ConfigUsageError";
  }
}

export interface ConfigCommand {
  readonly help: boolean;
  readonly action?: ConfigAction;
  readonly key?: ConfigKey;
  readonly value?: string;
  readonly config?: string;
}

export function isConfigCommandName(value: string | undefined): boolean {
  return value === CONFIG_COMMAND;
}

export function parseConfigArguments(
  arguments_: readonly string[],
): ConfigCommand {
  let parsed: ReturnType<typeof parseArgs>;

  try {
    parsed = parseArgs({
      args: [...arguments_],
      strict: true,
      allowPositionals: true,
      options: {
        config: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (error: unknown) {
    throw new ConfigUsageError(
      error instanceof Error
        ? error.message
        : "Invalid command-line arguments.",
    );
  }

  const config =
    typeof parsed.values["config"] === "string"
      ? parsed.values["config"]
      : undefined;
  const configPart = config === undefined ? {} : { config };

  if (parsed.values["help"] === true) {
    return { help: true, ...configPart };
  }

  const [action, key, value, ...extra] = parsed.positionals;

  if (action === undefined) {
    throw new ConfigUsageError(
      `config needs an action: ${CONFIG_ACTIONS.join(", ")}.`,
    );
  }

  if (!(CONFIG_ACTIONS as readonly string[]).includes(action)) {
    throw new ConfigUsageError(
      `Unknown config action "${action}". Use ${CONFIG_ACTIONS.join(", ")}.`,
    );
  }

  const name = action as ConfigAction;
  const wanted =
    name === "set" ? 2 : name === "get" || name === "unset" ? 1 : 0;
  const given = parsed.positionals.length - 1;

  if (given !== wanted || extra.length > 0) {
    throw new ConfigUsageError(
      wanted === 0
        ? `config ${name} takes no arguments.`
        : name === "set"
          ? "config set needs a key and a value."
          : `config ${name} needs one key.`,
    );
  }

  if (key === undefined) {
    return { help: false, action: name, ...configPart };
  }

  if (!isConfigKey(key)) {
    throw new ConfigUsageError(
      `Unknown config key "${key}". Keys: ${CONFIG_KEYS.join(", ")}.`,
    );
  }

  return {
    help: false,
    action: name,
    key,
    ...(value === undefined ? {} : { value }),
    ...configPart,
  };
}

export function runConfigCommand(
  command: ConfigCommand,
  environment: NodeJS.ProcessEnv = process.env,
): void {
  if (command.help) {
    process.stdout.write(
      styleHelp(CONFIG_HELP_TEXT, createStyle(process.stdout)),
    );
    return;
  }

  const style = createStyle(process.stdout);
  const path = command.config ?? defaultConfigPath(environment);

  try {
    switch (command.action) {
      case "path":
        process.stdout.write(`${path}\n`);
        return;

      case "list": {
        const file = readConfigFile(path);
        const entries = resolveConfigEntries(file.values, environment);
        const rows = entries.map((entry) => [
          entry.key,
          entry.value ?? style.dim("(not set)"),
          describeSource(style, entry),
        ]);

        process.stdout.write(
          `${[
            ...table(
              style,
              [{ header: "KEY" }, { header: "VALUE" }, { header: "SOURCE" }],
              rows,
            ),
            "",
            ...keyValues(style, [
              ["config file", file.exists ? path : `${path} (not created yet)`],
            ]),
          ]
            .map((line) => line.trimEnd())
            .join("\n")}\n`,
        );
        return;
      }

      case "get": {
        const key = requiredKey(command);
        const entry = resolveConfigEntries(
          readConfigFile(path).values,
          environment,
        ).find((item) => item.key === key);

        if (entry?.value === undefined) {
          process.exitCode = 1;
          return;
        }

        process.stdout.write(`${entry.value}\n`);
        return;
      }

      case "set": {
        const key = requiredKey(command);
        const value = parseConfigValue(key, command.value ?? "");

        validateConfigValue(key, value);

        const file = readConfigFile(path);

        writeConfigFile(path, { ...file.values, [key]: value });
        process.stdout.write(
          `${style.green(style.symbols.ok)} ${style.bold(`${key} = ${String(value)}`)}\n${notice(style, key, environment)}`,
        );
        return;
      }

      case "unset": {
        const key = requiredKey(command);
        const file = readConfigFile(path);

        if (file.values[key] === undefined) {
          process.stdout.write(`${key} is not set in ${path}.\n`);
          return;
        }

        const rest = { ...file.values };

        delete rest[key];
        writeConfigFile(path, rest);
        process.stdout.write(
          `${style.green(style.symbols.ok)} ${style.bold(`${key} removed`)}\n${notice(style, key, environment)}`,
        );
        return;
      }

      case undefined:
        throw new ConfigUsageError("config needs an action.");
    }
  } catch (error: unknown) {
    if (error instanceof ConfigUsageError) {
      throw error;
    }

    const failure = createStyle(process.stderr);

    process.stderr.write(
      `${failure.bold(failure.red("config failed:"))} ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}

function requiredKey(command: ConfigCommand): ConfigKey {
  if (command.key === undefined) {
    throw new ConfigUsageError("A key is required.");
  }

  return command.key;
}

function describeSource(
  style: ReturnType<typeof createStyle>,
  entry: ReturnType<typeof resolveConfigEntries>[number],
): string {
  const text =
    entry.source === "env"
      ? `env ${entry.variable}`
      : entry.source === "unset"
        ? ""
        : entry.source;
  const shown = entry.source === "file" ? style.cyan(text) : text;

  return entry.note === undefined
    ? shown
    : `${shown}${shown === "" ? "" : " "}${style.yellow(`(${entry.note})`)}`;
}

function notice(
  style: ReturnType<typeof createStyle>,
  key: ConfigKey,
  environment: NodeJS.ProcessEnv,
): string {
  const lines = [
    `  ${style.dim("Takes effect the next time the server starts.")}`,
  ];
  const variable = configKeyVariable(key);

  if (environment[variable] !== undefined) {
    lines.push(
      `  ${style.yellow(`${variable} is set and overrides the file.`)}`,
    );
  }

  return `${lines.join("\n")}\n`;
}
