import {
  SERVER_ENVIRONMENT_VARIABLES,
  SERVER_PRODUCT_VERSION,
} from "@sinterdb-internal/server";

import type { CliCommand } from "./cli.js";
import type { ConfigValues } from "./config-file.js";
import { runConsole } from "./console-terminal.js";
import { createStyle } from "./style.js";
import { ServerSupervisor } from "./supervisor.js";

export interface LaunchContext {
  readonly command: Extract<CliCommand, { kind: "start" }>;
  readonly environment: Readonly<Record<string, string | undefined>>;
  /** Values from the config file. */
  readonly file: ConfigValues;
  readonly interactive: boolean;
}

/**
 * Whether `sinterd` opens the interactive console instead of starting a
 * server. It does only when a person is plainly at a terminal and asked for
 * nothing else: all three standard streams are terminals, no server option
 * is on the command line or in a `SINTERDB_*` variable, `--no-ui` is not
 * given, and the config file does not say `"ui": false`. Docker, systemd,
 * CI and every command that passes options keep starting a server as before.
 */
export function shouldOpenConsole(context: LaunchContext): boolean {
  const { command, environment } = context;
  const options = Object.keys(command).filter(
    (key) => key !== "kind" && key !== "config",
  );

  return (
    context.interactive &&
    environment["TERM"] !== "dumb" &&
    options.length === 0 &&
    context.file.ui !== false &&
    SERVER_ENVIRONMENT_VARIABLES.every(
      (name) => environment[name] === undefined,
    )
  );
}

/** True when standard input, output and error are all terminals. */
export function isInteractiveTerminal(): boolean {
  return (
    process.stdin.isTTY === true &&
    process.stdout.isTTY === true &&
    process.stderr.isTTY === true
  );
}

/**
 * The arguments the console starts the server with. `--no-ui` keeps the
 * server from opening a console of its own, and `--config` passes on the
 * file the person chose.
 */
export function consoleServerArguments(
  command: Extract<CliCommand, { kind: "start" }>,
): string[] {
  return [
    "--no-ui",
    ...(command.config === undefined ? [] : ["--config", command.config]),
  ];
}

/** Opens the console on this terminal and returns when the person quits. */
export async function openConsole(
  command: Extract<CliCommand, { kind: "start" }>,
): Promise<void> {
  const entry = process.argv[1];

  if (entry === undefined) {
    throw new Error("Cannot find the sinterd program to start.");
  }

  await runConsole({
    supervisor: new ServerSupervisor({ command: [process.execPath, entry] }),
    serverArguments: consoleServerArguments(command),
    input: process.stdin,
    output: process.stdout,
    style: createStyle(process.stdout),
    version: SERVER_PRODUCT_VERSION,
  });
}
