import { SERVER_ENVIRONMENT_VARIABLES } from "@sinterdb-internal/server";
import { afterEach, describe, expect, it } from "vitest";

import {
  consoleServerArguments,
  isInteractiveTerminal,
  shouldOpenConsole,
} from "./console-launch.js";
import { parseCliArguments } from "./cli.js";

function start(...arguments_: string[]) {
  const command = parseCliArguments(arguments_);

  if (command.kind !== "start") {
    throw new Error("Expected a start command.");
  }

  return command;
}

const OPEN = {
  command: start(),
  environment: { TERM: "xterm-256color" },
  file: {},
  interactive: true,
} as const;

describe("shouldOpenConsole", () => {
  it("opens for a bare sinterd in a terminal", () => {
    expect(shouldOpenConsole(OPEN)).toBe(true);
  });

  it("opens with only --config, which picks the file and not the mode", () => {
    expect(
      shouldOpenConsole({ ...OPEN, command: start("--config", "c.json") }),
    ).toBe(true);
  });

  it("does not open when a person is not at a terminal", () => {
    expect(shouldOpenConsole({ ...OPEN, interactive: false })).toBe(false);
  });

  it("does not open on a terminal that cannot draw", () => {
    expect(shouldOpenConsole({ ...OPEN, environment: { TERM: "dumb" } })).toBe(
      false,
    );
  });

  it("does not open with --no-ui", () => {
    expect(shouldOpenConsole({ ...OPEN, command: start("--no-ui") })).toBe(
      false,
    );
  });

  it('does not open when the config file says "ui": false', () => {
    expect(shouldOpenConsole({ ...OPEN, file: { ui: false } })).toBe(false);
    expect(shouldOpenConsole({ ...OPEN, file: { ui: true } })).toBe(true);
  });

  it("does not open when a server option is given", () => {
    for (const flags of [
      ["--host", "0.0.0.0"],
      ["--port", "1"],
      ["-p", "1"],
      ["--data-dir", "d"],
      ["--write-concern", "memory"],
      ["--durability", "fsync"],
      ["--checkpoint-bytes", "1"],
      ["--checkpoint-interval", "1"],
      ["--checkpoint-keep", "2"],
      ["--reclaim-lock"],
      ["--log-operations"],
    ]) {
      expect(
        shouldOpenConsole({ ...OPEN, command: start(...flags) }),
        flags.join(" "),
      ).toBe(false);
    }
  });

  it("does not open when a SINTERDB_ variable is set", () => {
    for (const name of SERVER_ENVIRONMENT_VARIABLES) {
      expect(
        shouldOpenConsole({
          ...OPEN,
          environment: { TERM: "xterm", [name]: "1" },
        }),
        name,
      ).toBe(false);
    }
  });

  it("opens when TERM is not set at all", () => {
    expect(shouldOpenConsole({ ...OPEN, environment: {} })).toBe(true);
  });
});

describe("consoleServerArguments", () => {
  it("keeps the server from opening a console, and passes the config file on", () => {
    expect(consoleServerArguments(start())).toEqual(["--no-ui"]);
    expect(consoleServerArguments(start("--config", "c.json"))).toEqual([
      "--no-ui",
      "--config",
      "c.json",
    ]);
  });
});

describe("isInteractiveTerminal", () => {
  const original = {
    stdin: process.stdin.isTTY,
    stdout: process.stdout.isTTY,
    stderr: process.stderr.isTTY,
  };

  const set = (stdin?: boolean, stdout?: boolean, stderr?: boolean): void => {
    for (const [stream, value] of [
      [process.stdin, stdin],
      [process.stdout, stdout],
      [process.stderr, stderr],
    ] as const) {
      Object.defineProperty(stream, "isTTY", {
        value,
        configurable: true,
      });
    }
  };

  afterEach(() => {
    set(original.stdin, original.stdout, original.stderr);
  });

  it("needs all three streams to be terminals", () => {
    set(true, true, true);

    expect(isInteractiveTerminal()).toBe(true);

    set(false, true, true);

    expect(isInteractiveTerminal()).toBe(false);

    set(true, undefined, true);

    expect(isInteractiveTerminal()).toBe(false);

    set(true, true, false);

    expect(isInteractiveTerminal()).toBe(false);
  });
});
