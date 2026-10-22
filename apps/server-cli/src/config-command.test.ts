import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CONFIG_HELP_TEXT,
  ConfigUsageError,
  isConfigCommandName,
  parseConfigArguments,
  runConfigCommand,
} from "./config-command.js";
import { CONFIG_KEYS } from "./config-file.js";
import { usePlainOutput } from "./plain-output.js";

usePlainOutput();

describe("parseConfigArguments", () => {
  it("knows the command name", () => {
    expect(isConfigCommandName("config")).toBe(true);
    expect(isConfigCommandName("configs")).toBe(false);
    expect(isConfigCommandName(undefined)).toBe(false);
  });

  it("parses each action", () => {
    expect(parseConfigArguments(["list"])).toEqual({
      help: false,
      action: "list",
    });
    expect(parseConfigArguments(["path"])).toEqual({
      help: false,
      action: "path",
    });
    expect(parseConfigArguments(["get", "port"])).toEqual({
      help: false,
      action: "get",
      key: "port",
    });
    expect(parseConfigArguments(["unset", "port"])).toEqual({
      help: false,
      action: "unset",
      key: "port",
    });
    expect(parseConfigArguments(["set", "port", "5"])).toEqual({
      help: false,
      action: "set",
      key: "port",
      value: "5",
    });
  });

  it("accepts --config before or after the action", () => {
    expect(parseConfigArguments(["--config", "f", "list"])).toMatchObject({
      config: "f",
    });
    expect(
      parseConfigArguments(["get", "port", "--config", "f"]),
    ).toMatchObject({ config: "f", key: "port" });
  });

  it("parses --help", () => {
    expect(parseConfigArguments(["--help"])).toEqual({ help: true });
    expect(parseConfigArguments(["set", "-h"]).help).toBe(true);
  });

  it("rejects a missing or unknown action", () => {
    expect(() => parseConfigArguments([])).toThrow(ConfigUsageError);
    expect(() => parseConfigArguments([])).toThrow(/needs an action/);
    expect(() => parseConfigArguments(["show"])).toThrow(
      /Unknown config action "show"/,
    );
  });

  it("rejects the wrong number of arguments", () => {
    expect(() => parseConfigArguments(["list", "x"])).toThrow(/no arguments/);
    expect(() => parseConfigArguments(["path", "x"])).toThrow(/no arguments/);
    expect(() => parseConfigArguments(["get"])).toThrow(/needs one key/);
    expect(() => parseConfigArguments(["get", "port", "x"])).toThrow(
      /needs one key/,
    );
    expect(() => parseConfigArguments(["unset"])).toThrow(/needs one key/);
    expect(() => parseConfigArguments(["set", "port"])).toThrow(
      /needs a key and a value/,
    );
    expect(() => parseConfigArguments(["set", "port", "1", "2"])).toThrow(
      /needs a key and a value/,
    );
  });

  it("rejects an unknown key and lists the known ones", () => {
    expect(() => parseConfigArguments(["get", "prot"])).toThrow(
      /Unknown config key "prot"\. Keys: host, port/,
    );
  });

  it("rejects unknown options", () => {
    expect(() => parseConfigArguments(["list", "--nope"])).toThrow(
      ConfigUsageError,
    );
  });
});

describe("runConfigCommand", () => {
  let directory = "";
  let path = "";
  let output = "";
  let errors = "";

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "sinterd-config-cmd-"));
    path = join(directory, "config.json");
    output = "";
    errors = "";
    process.exitCode = undefined;
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      output += String(chunk);
      return true;
    });
    vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      errors += String(chunk);
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
    rmSync(directory, { recursive: true, force: true });
  });

  const run = (arguments_: string[], environment: NodeJS.ProcessEnv = {}) =>
    runConfigCommand(
      parseConfigArguments([...arguments_, "--config", path]),
      environment,
    );

  it("prints its help", () => {
    runConfigCommand(parseConfigArguments(["--help"]));

    expect(output).toBe(CONFIG_HELP_TEXT);
  });

  it("documents every key in its help", () => {
    for (const key of CONFIG_KEYS) {
      expect(CONFIG_HELP_TEXT).toMatch(new RegExp(`^  ${key} `, "m"));
    }
  });

  it("prints the path in use", () => {
    run(["path"]);

    expect(output).toBe(`${path}\n`);
  });

  it("prints the default path when --config is not given", () => {
    runConfigCommand(parseConfigArguments(["path"]), {
      XDG_CONFIG_HOME: "/x",
    });

    expect(output).toBe(`${join("/x", "sinterdb", "config.json")}\n`);
  });

  it("sets a value, saves it typed, and says when it takes effect", () => {
    run(["set", "port", "5000"]);

    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({ port: 5000 });
    expect(output).toContain("port = 5000");
    expect(output).toContain("Takes effect the next time the server starts.");
    expect(process.exitCode).toBeUndefined();
  });

  it("keeps the other keys when it sets one", () => {
    run(["set", "host", "0.0.0.0"]);
    run(["set", "logOperations", "true"]);

    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({
      host: "0.0.0.0",
      logOperations: true,
    });
  });

  it("refuses a bad value and leaves the file alone", () => {
    writeFileSync(path, '{"port":1}\n');
    run(["set", "port", "70000"]);

    expect(errors).toContain("config failed:");
    expect(errors).toContain("between 0 and 65535");
    expect(process.exitCode).toBe(1);
    expect(readFileSync(path, "utf8")).toBe('{"port":1}\n');
  });

  it("refuses a value of the wrong kind", () => {
    run(["set", "port", "abc"]);

    expect(errors).toContain("port must be a number");
    expect(process.exitCode).toBe(1);

    process.exitCode = undefined;
    run(["set", "reclaimLock", "yes"]);

    expect(errors).toContain('"true" or "false"');
    expect(process.exitCode).toBe(1);
  });

  it("lets settings that need a data directory be set in any order", () => {
    run(["set", "checkpointKeep", "4"]);
    run(["set", "dataDir", "/data"]);

    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({
      dataDir: "/data",
      checkpointKeep: 4,
    });
    expect(process.exitCode).toBeUndefined();
  });

  it("warns that an environment variable overrides the file", () => {
    run(["set", "port", "5"], { SINTERDB_PORT: "9" });

    expect(output).toContain("SINTERDB_PORT is set and overrides the file.");
  });

  it("does not warn when the variable is not set", () => {
    run(["set", "port", "5"]);

    expect(output).not.toContain("overrides");
  });

  it("refuses to change a file that is not valid", () => {
    writeFileSync(path, "{nope");
    run(["set", "port", "5"]);

    expect(errors).toContain("not valid JSON");
    expect(process.exitCode).toBe(1);
    expect(readFileSync(path, "utf8")).toBe("{nope");
  });

  it("gets the effective value", () => {
    writeFileSync(path, '{"port":5000}\n');
    run(["get", "port"]);

    expect(output).toBe("5000\n");
  });

  it("gets an environment value over the file", () => {
    writeFileSync(path, '{"port":5000}\n');
    run(["get", "port"], { SINTERDB_PORT: "6000" });

    expect(output).toBe("6000\n");
  });

  it("gets a default", () => {
    run(["get", "host"]);

    expect(output).toBe("127.0.0.1\n");
  });

  it("prints nothing and exits 1 for a setting nothing sets", () => {
    run(["get", "dataDir"]);

    expect(output).toBe("");
    expect(errors).toBe("");
    expect(process.exitCode).toBe(1);
  });

  it("unsets a value", () => {
    writeFileSync(path, '{"host":"h","port":5}\n');
    run(["unset", "port"]);

    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({ host: "h" });
    expect(output).toContain("port removed");
    expect(output).toContain("Takes effect the next time the server starts.");
  });

  it("says so when there is nothing to unset, and writes nothing", () => {
    run(["unset", "port"]);

    expect(output).toBe(`port is not set in ${path}.\n`);
    expect(() => readFileSync(path)).toThrow();
    expect(process.exitCode).toBeUndefined();
  });

  it("lists every key with its value and source", () => {
    writeFileSync(path, '{"host":"0.0.0.0","dataDir":"/d"}\n');
    run(["list"], { SINTERDB_PORT: "6000" });

    const lines = output.split("\n");
    const row = (key: string): string =>
      lines.find((line) => line.trimStart().startsWith(`${key} `)) ?? "";

    expect(lines[0]).toMatch(/KEY\s+VALUE\s+SOURCE/);
    expect(row("host")).toMatch(/host\s+0\.0\.0\.0\s+file$/);
    expect(row("port")).toMatch(/port\s+6000\s+env SINTERDB_PORT$/);
    expect(row("dataDir")).toMatch(/dataDir\s+\/d\s+file$/);
    expect(row("writeConcern")).toMatch(/writeConcern\s+flushed\s+default$/);
    expect(row("checkpointInterval")).toMatch(
      /checkpointInterval\s+\(not set\)$/,
    );
    expect(output).toContain(`config file  ${path}`);

    for (const key of CONFIG_KEYS) {
      expect(row(key)).not.toBe("");
    }
  });

  it("explains a file value that is not used", () => {
    writeFileSync(path, '{"checkpointKeep":5}\n');
    run(["list"]);

    expect(output).toMatch(
      /checkpointKeep\s+2\s+default \(the file value is unused without a dataDir\)/,
    );
  });

  it("says when the file does not exist yet", () => {
    run(["list"]);

    expect(output).toContain(`${path} (not created yet)`);
  });

  it("reports an invalid file without a stack trace", () => {
    writeFileSync(path, '{"prot":1}');
    run(["list"]);

    expect(errors).toContain('unknown setting "prot"');
    expect(process.exitCode).toBe(1);
  });
});
