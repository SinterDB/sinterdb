import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

import type { LogEntry } from "./logger.js";
import { ServerSupervisor, SupervisorError } from "./supervisor.js";

// The config file against the real built `sinterd`. `pnpm build` must have run
// first, because these tests start the file in dist.

const CLI = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const supervisors: ServerSupervisor[] = [];
const directories: string[] = [];

beforeAll(() => {
  if (!existsSync(CLI)) {
    throw new Error("The server CLI is not built. Run `pnpm build` first.");
  }
});

afterEach(async () => {
  for (const supervisor of supervisors.splice(0)) {
    await supervisor.kill();
  }

  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function directory(): string {
  const path = mkdtempSync(join(tmpdir(), "sinterd-config-start-"));

  directories.push(path);

  return path;
}

/**
 * Starts the real server with a config file and returns the
 * `server.started` details. The environment is cleaned of `SINTERDB_*`, and
 * XDG_CONFIG_HOME points at an empty directory, so nothing on the machine
 * changes the result.
 */
async function startWith(
  file: string | undefined,
  serverArguments: string[] = [],
  environment: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  const home = directory();
  const env: NodeJS.ProcessEnv = { ...process.env, XDG_CONFIG_HOME: home };

  for (const name of Object.keys(env)) {
    if (name.startsWith("SINTERDB_")) {
      delete env[name];
    }
  }

  const supervisor = new ServerSupervisor({
    command: [process.execPath, CLI],
    env: { ...env, ...environment },
  });
  const lines: LogEntry[] = [];

  supervisor.on("log", (entry: LogEntry) => lines.push(entry));
  supervisors.push(supervisor);

  if (file !== undefined) {
    writeFileSync(join(home, "config.json"), file);
  }

  await supervisor.start([
    "--port",
    "0",
    ...(file === undefined ? [] : ["--config", join(home, "config.json")]),
    ...serverArguments,
  ]);

  const started = lines.find((entry) => entry.event === "server.started");

  return { ...(started?.details ?? {}), home };
}

describe("sinterd with a config file", () => {
  it("starts exactly as before when there is no file", async () => {
    const details = await startWith(undefined);

    expect(details["storage"]).toBe("memory");
    expect(details).not.toHaveProperty("configFile");
  });

  it("uses the default file location when --config is not given", async () => {
    const home = directory();

    const directoryPath = join(directory(), "data");
    const supervisor = new ServerSupervisor({
      command: [process.execPath, CLI],
      env: { ...process.env, XDG_CONFIG_HOME: home },
    });
    const lines: LogEntry[] = [];

    supervisor.on("log", (entry: LogEntry) => lines.push(entry));
    supervisors.push(supervisor);

    // The default file is XDG_CONFIG_HOME/sinterdb/config.json.
    mkdirSync(join(home, "sinterdb"));
    writeFileSync(
      join(home, "sinterdb", "config.json"),
      JSON.stringify({ dataDir: directoryPath }),
    );
    await supervisor.start(["--port", "0"]);

    const started = lines.find((entry) => entry.event === "server.started");

    expect(started?.details?.["dataDirectory"]).toBe(directoryPath);
    expect(started?.details?.["configFile"]).toBe(
      join(home, "sinterdb", "config.json"),
    );
  });

  it("uses file values and reports the file", async () => {
    const data = join(directory(), "data");
    const details = await startWith(
      JSON.stringify({ dataDir: data, writeConcern: "journaled" }),
    );

    expect(details["storage"]).toBe("disk");
    expect(details["dataDirectory"]).toBe(data);
    expect(details["writeConcern"]).toBe("journaled");
    expect(details["configFile"]).toBe(
      join(String(details["home"]), "config.json"),
    );
  });

  it("puts a flag before the environment before the file", async () => {
    const [fromFile, fromEnvironment, fromFlag] = [
      join(directory(), "file"),
      join(directory(), "env"),
      join(directory(), "flag"),
    ] as const;
    const file = JSON.stringify({ dataDir: fromFile });

    expect((await startWith(file))["dataDirectory"]).toBe(fromFile);
    expect(
      (await startWith(file, [], { SINTERDB_DATA_DIR: fromEnvironment }))[
        "dataDirectory"
      ],
    ).toBe(fromEnvironment);
    expect(
      (
        await startWith(file, ["--data-dir", fromFlag], {
          SINTERDB_DATA_DIR: fromEnvironment,
        })
      )["dataDirectory"],
    ).toBe(fromFlag);
  });

  it("lets a file that sets disk-only options start a memory server", async () => {
    const details = await startWith(
      JSON.stringify({ checkpointKeep: 4, writeConcern: "memory" }),
    );

    expect(details["storage"]).toBe("memory");
  });

  it("fails clearly on an invalid file", async () => {
    await expect(startWith('{"port":"x"}')).rejects.toThrow(SupervisorError);
    await expect(startWith('{"port":"x"}')).rejects.toThrow(
      /setting "port" must be a number/,
    );
  });

  it("fails when an explicit --config file is missing", async () => {
    const supervisor = new ServerSupervisor({
      command: [process.execPath, CLI],
    });

    supervisors.push(supervisor);

    await expect(
      supervisor.start(["--config", join(directory(), "missing.json")]),
    ).rejects.toThrow(/does not exist/);
  });
});

describe("sinterd config", () => {
  const run = (...arguments_: string[]) =>
    spawnSync(process.execPath, [CLI, "config", ...arguments_], {
      encoding: "utf8",
      // Plain output, whatever color settings the caller has.
      env: { ...process.env, FORCE_COLOR: "", NO_COLOR: "1" },
    });

  it("sets, gets and lists through the built binary", () => {
    const path = join(directory(), "config.json");

    expect(run("set", "port", "5000", "--config", path).status).toBe(0);
    expect(run("get", "port", "--config", path)).toMatchObject({
      status: 0,
      stdout: "5000\n",
    });
    expect(run("list", "--config", path).stdout).toMatch(/port\s+5000\s+file/);
  });

  it("exits 2 with the config help on a usage error", () => {
    const result = run("show");

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Unknown config action "show"');
    expect(result.stderr).toContain("sinterd config set <key> <value>");
  });

  it("exits 1 for a value the server would refuse", () => {
    const path = join(directory(), "config.json");
    const result = run("set", "port", "99999", "--config", path);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("config failed:");
    expect(existsSync(path)).toBe(false);
  });
});
