import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import {
  DEFAULT_CHECKPOINT_KEEP,
  DEFAULT_CHECKPOINT_THRESHOLD_BYTES,
  DEFAULT_SERVER_HOST,
  DEFAULT_SERVER_PORT,
  DEFAULT_WRITE_CONCERN,
  ServerConfigurationError,
  resolveServerConfig,
  type ServerConfigInput,
  type ServerEnvironment,
} from "@sinterdb-internal/server";

/** The settings a config file can hold, in the order `config list` shows. */
export const CONFIG_KEYS = [
  "host",
  "port",
  "dataDir",
  "writeConcern",
  "checkpointBytes",
  "checkpointInterval",
  "checkpointKeep",
  "reclaimLock",
  "logOperations",
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];

export type ConfigValue = string | number | boolean;

/** What a config file holds: only the keys that were set. */
export type ConfigValues = Partial<Record<ConfigKey, ConfigValue>>;

type ValueType = "string" | "number" | "boolean";

interface KeySpec {
  readonly type: ValueType;
  /** The matching field of the server's configuration input. */
  readonly input: keyof ServerConfigInput;
  readonly variable: string;
  /** Needs a data directory to mean anything. */
  readonly needsDataDir: boolean;
  readonly defaultValue?: string;
}

const SPECS: Readonly<Record<ConfigKey, KeySpec>> = {
  host: {
    type: "string",
    input: "host",
    variable: "SINTERDB_HOST",
    needsDataDir: false,
    defaultValue: DEFAULT_SERVER_HOST,
  },
  port: {
    type: "number",
    input: "port",
    variable: "SINTERDB_PORT",
    needsDataDir: false,
    defaultValue: String(DEFAULT_SERVER_PORT),
  },
  dataDir: {
    type: "string",
    input: "dataDirectory",
    variable: "SINTERDB_DATA_DIR",
    needsDataDir: false,
  },
  writeConcern: {
    type: "string",
    input: "writeConcern",
    variable: "SINTERDB_WRITE_CONCERN",
    needsDataDir: true,
    defaultValue: DEFAULT_WRITE_CONCERN,
  },
  checkpointBytes: {
    type: "number",
    input: "checkpointThresholdBytes",
    variable: "SINTERDB_CHECKPOINT_BYTES",
    needsDataDir: true,
    defaultValue: String(DEFAULT_CHECKPOINT_THRESHOLD_BYTES),
  },
  checkpointInterval: {
    type: "number",
    input: "checkpointIntervalSeconds",
    variable: "SINTERDB_CHECKPOINT_INTERVAL",
    needsDataDir: true,
  },
  checkpointKeep: {
    type: "number",
    input: "checkpointKeep",
    variable: "SINTERDB_CHECKPOINT_KEEP",
    needsDataDir: true,
    defaultValue: String(DEFAULT_CHECKPOINT_KEEP),
  },
  reclaimLock: {
    type: "boolean",
    input: "reclaimLock",
    variable: "SINTERDB_RECLAIM_LOCK",
    needsDataDir: true,
    defaultValue: "false",
  },
  logOperations: {
    type: "boolean",
    input: "logOperations",
    variable: "SINTERDB_LOG_OPERATIONS",
    needsDataDir: false,
    defaultValue: "false",
  },
};

export function isConfigKey(value: string): value is ConfigKey {
  return (CONFIG_KEYS as readonly string[]).includes(value);
}

/** The environment variable that sets the same thing as this key. */
export function configKeyVariable(key: ConfigKey): string {
  return SPECS[key].variable;
}

/** A config file that cannot be read, is invalid, or holds a bad value. */
export class ConfigFileError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ConfigFileError";
  }
}

/**
 * Where the config file lives when `--config` is not given:
 * `$XDG_CONFIG_HOME/sinterdb/config.json`, else `~/.config/sinterdb/config.json`,
 * and `%APPDATA%\sinterdb\config.json` on Windows.
 */
export function defaultConfigPath(
  environment: Readonly<Record<string, string | undefined>> = process.env,
  platform: NodeJS.Platform = process.platform,
  home: string = homedir(),
): string {
  if (platform === "win32") {
    const appData = environment["APPDATA"];

    return join(
      appData === undefined || appData === ""
        ? join(home, "AppData", "Roaming")
        : appData,
      "sinterdb",
      "config.json",
    );
  }

  const xdg = environment["XDG_CONFIG_HOME"];

  return join(
    xdg === undefined || xdg === "" ? join(home, ".config") : xdg,
    "sinterdb",
    "config.json",
  );
}

export interface LoadedConfigFile {
  readonly path: string;
  /** False when the file does not exist, which is the same as an empty one. */
  readonly exists: boolean;
  readonly values: ConfigValues;
}

/**
 * Reads and checks a config file. A missing file is an empty one. An invalid
 * file is an error that names the file.
 */
export function readConfigFile(path: string): LoadedConfigFile {
  let text: string;

  try {
    text = readFileSync(path, "utf8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { path, exists: false, values: {} };
    }

    throw new ConfigFileError(
      `Cannot read the config file ${path}: ${(error as Error).message}`,
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error: unknown) {
    throw new ConfigFileError(
      `The config file ${path} is not valid JSON: ${(error as Error).message}`,
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ConfigFileError(
      `The config file ${path} must hold one JSON object.`,
    );
  }

  const values: ConfigValues = {};

  for (const [key, value] of Object.entries(parsed)) {
    if (!isConfigKey(key)) {
      throw new ConfigFileError(
        `The config file ${path} has an unknown setting "${key}". Known settings: ${CONFIG_KEYS.join(", ")}.`,
      );
    }

    const type = SPECS[key].type;

    if (typeof value !== type) {
      throw new ConfigFileError(
        `The config file ${path} setting "${key}" must be a ${type}; found ${JSON.stringify(value)}.`,
      );
    }

    try {
      validateConfigValue(key, value as ConfigValue);
    } catch (error: unknown) {
      throw new ConfigFileError(
        `The config file ${path} setting "${key}" is not valid. ${(error as Error).message}`,
      );
    }

    values[key] = value as ConfigValue;
  }

  return { path, exists: true, values };
}

/**
 * Writes the file in one step: a temporary file next to it, then a rename, so
 * a crash never leaves half a file. Keys are written in a fixed order.
 */
export function writeConfigFile(path: string, values: ConfigValues): void {
  const ordered: ConfigValues = {};

  for (const key of CONFIG_KEYS) {
    const value = values[key];

    if (value !== undefined) {
      ordered[key] = value;
    }
  }

  mkdirSync(dirname(path), { recursive: true });

  const temporary = `${path}.${process.pid}.tmp`;

  try {
    writeFileSync(temporary, `${JSON.stringify(ordered, null, 2)}\n`);
    renameSync(temporary, path);
  } catch (error: unknown) {
    rmSync(temporary, { force: true });
    throw new ConfigFileError(
      `Cannot write the config file ${path}: ${(error as Error).message}`,
    );
  }
}

/** Turns text typed on the command line into the value the key holds. */
export function parseConfigValue(key: ConfigKey, text: string): ConfigValue {
  const spec = SPECS[key];

  if (spec.type === "string") {
    return text;
  }

  if (spec.type === "boolean") {
    if (text !== "true" && text !== "false") {
      throw new ConfigFileError(
        `${key} must be "true" or "false"; received ${JSON.stringify(text)}.`,
      );
    }

    return text === "true";
  }

  const number = text.trim() === "" ? Number.NaN : Number(text);

  if (!Number.isFinite(number)) {
    throw new ConfigFileError(
      `${key} must be a number; received ${JSON.stringify(text)}.`,
    );
  }

  return number;
}

/**
 * Checks one value with the server's own rules. A key that needs a data
 * directory is checked beside a stand-in one, so the order in which a person
 * sets keys never matters.
 */
export function validateConfigValue(key: ConfigKey, value: ConfigValue): void {
  const spec = SPECS[key];
  const input: Record<string, ConfigValue> = { [spec.input]: value };

  if (spec.needsDataDir) {
    input["dataDirectory"] = "data";
  }

  try {
    resolveServerConfig(input as ServerConfigInput, {});
  } catch (error: unknown) {
    if (error instanceof ServerConfigurationError) {
      throw new ConfigFileError(error.message);
    }

    throw error;
  }
}

export type ConfigSource = "flag" | "env" | "file" | "default" | "unset";

export interface ConfigEntry {
  readonly key: ConfigKey;
  /** The effective value as text, or undefined when nothing sets it. */
  readonly value: string | undefined;
  readonly source: ConfigSource;
  /** The environment variable that is the source when `source` is "env". */
  readonly variable: string;
  /** Why a value in the file is not used. */
  readonly note?: string;
}

/**
 * Works out where every setting comes from. The order is flags, then
 * environment variables, then the config file, then the defaults.
 *
 * A file value for a setting that needs a data directory is not used when no
 * data directory is set anywhere, so a file that sets `checkpointKeep` cannot
 * stop a memory-only server from starting. A file `writeConcern` also loses to
 * the deprecated durability mode, which counts as the write concern in the
 * flag and environment layers.
 */
export function resolveConfigEntries(
  file: ConfigValues,
  environment: ServerEnvironment,
  flags: ServerConfigInput = {},
): ConfigEntry[] {
  const lookup = (key: ConfigKey): ConfigEntry => {
    const spec = SPECS[key];
    const fromFlag =
      key === "writeConcern"
        ? (flags.writeConcern ?? flags.durability)
        : flags[spec.input];
    const fromEnvironment =
      key === "writeConcern"
        ? (environment.SINTERDB_WRITE_CONCERN ??
          environment.SINTERDB_DURABILITY)
        : (environment as Record<string, string | undefined>)[spec.variable];
    const variable =
      key === "writeConcern" &&
      environment.SINTERDB_WRITE_CONCERN === undefined &&
      environment.SINTERDB_DURABILITY !== undefined
        ? "SINTERDB_DURABILITY"
        : spec.variable;

    if (fromFlag !== undefined) {
      return { key, value: String(fromFlag), source: "flag", variable };
    }

    if (fromEnvironment !== undefined) {
      return { key, value: fromEnvironment, source: "env", variable };
    }

    const fromFile = file[key];
    const fallback: ConfigEntry =
      spec.defaultValue === undefined
        ? { key, value: undefined, source: "unset", variable }
        : { key, value: spec.defaultValue, source: "default", variable };

    if (fromFile === undefined) {
      return fallback;
    }

    return { key, value: String(fromFile), source: "file", variable };
  };

  const entries = CONFIG_KEYS.map(lookup);
  const hasDataDir =
    entries.find((entry) => entry.key === "dataDir")?.value !== undefined;

  return entries.map((entry) => {
    if (entry.source !== "file") {
      return entry;
    }

    const spec = SPECS[entry.key];
    const fallback: ConfigEntry =
      spec.defaultValue === undefined
        ? { ...entry, value: undefined, source: "unset" }
        : { ...entry, value: spec.defaultValue, source: "default" };

    if (spec.needsDataDir && !hasDataDir) {
      return {
        ...fallback,
        note: "the file value is unused without a dataDir",
      };
    }

    return entry;
  });
}

/**
 * Adds the config file's values to the options given on the command line. A
 * value from the file is only added where no flag and no environment variable
 * sets the same setting.
 */
export function applyConfigFile(
  flags: ServerConfigInput,
  file: ConfigValues,
  environment: ServerEnvironment,
): ServerConfigInput {
  const added: Record<string, ConfigValue> = {};

  for (const entry of resolveConfigEntries(file, environment, flags)) {
    const value = file[entry.key];

    if (entry.source === "file" && value !== undefined) {
      added[SPECS[entry.key].input] = value;
    }
  }

  return { ...flags, ...added };
}
