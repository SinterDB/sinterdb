import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { LogEntry } from "./logger.js";
import {
  ServerSupervisor,
  SupervisorError,
  SupervisorErrorCode,
  SupervisorState,
  type SupervisorOptions,
} from "./supervisor.js";

// The supervisor runs a child process, so these tests run real ones: a tiny
// script that behaves like a server in the way each test needs. The first
// argument picks the behavior. The real `sinterd` is tested in
// supervisor.integration.test.ts.

const FAKE_SERVER = `
const mode = process.argv[2];
const line = (level, event, message, details) =>
  JSON.stringify({ timestamp: new Date().toISOString(), level, event, message, ...(details ? { details } : {}) });
const started = () =>
  console.log(line("info", "server.started", "listening", { host: "127.0.0.1", port: 4721, args: process.argv.slice(2) }));

if (mode === "ok" || mode === "ignore-term" || mode === "slow-stop" || mode === "stop-fails") {
  process.on("SIGTERM", () => {
    if (mode === "ignore-term") return;
    console.log(line("info", "server.stopping", "stopping"));
    setTimeout(() => process.exit(mode === "stop-fails" ? 1 : 0), mode === "slow-stop" ? 150 : 0);
  });
  setInterval(() => {}, 1000);
  started();
} else if (mode === "no-handler") {
  started();
  setInterval(() => {}, 1000);
} else if (mode === "stderr-then-exit") {
  console.error("something went wrong");
  process.exit(2);
} else if (mode === "crash-after-start") {
  started();
  setTimeout(() => process.exit(3), 40);
} else if (mode === "fail-start") {
  console.error(line("error", "server.start_failed", "failed", { error: { name: "StorageError", message: "The data directory is in use." } }));
  process.exit(1);
} else if (mode === "exit-quietly") {
  process.exit(0);
} else if (mode === "plain-output") {
  process.on("SIGTERM", () => process.exit(0));
  console.log("hello, this is not JSON");
  console.error("a warning on stderr");
  started();
  setInterval(() => {}, 1000);
} else if (mode === "silent") {
  setInterval(() => {}, 1000);
}
`;

let directory: string;
let script: string;
const supervisors: ServerSupervisor[] = [];

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), "sinterdb-supervisor-"));
  script = join(directory, "fake-server.mjs");
  writeFileSync(script, FAKE_SERVER);
});

afterEach(async () => {
  for (const supervisor of supervisors.splice(0)) {
    await supervisor.kill();
  }
});

afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

function create(options: Partial<SupervisorOptions> = {}): ServerSupervisor {
  const supervisor = new ServerSupervisor({
    command: [process.execPath, script],
    ...options,
  });

  supervisors.push(supervisor);

  return supervisor;
}

function recordStates(supervisor: ServerSupervisor): string[] {
  const states: string[] = [SupervisorState.Stopped];

  supervisor.on("state", ({ state }: { state: string }) => states.push(state));

  return states;
}

async function failure(promise: Promise<unknown>): Promise<SupervisorError> {
  const error: unknown = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  );

  expect(error).toBeInstanceOf(SupervisorError);

  return error as SupervisorError;
}

describe("starting", () => {
  it("is stopped until it is started", () => {
    const supervisor = create();

    expect(supervisor.state).toBe(SupervisorState.Stopped);
    expect(supervisor.address).toBeUndefined();
    expect(supervisor.lastExit).toBeUndefined();
  });

  it("goes from starting to running when the server says it is listening", async () => {
    const supervisor = create();
    const states = recordStates(supervisor);
    const pending = supervisor.start(["ok"]);

    expect(supervisor.state).toBe(SupervisorState.Starting);

    const address = await pending;

    expect(states).toEqual(["stopped", "starting", "running"]);
    expect(supervisor.state).toBe(SupervisorState.Running);
    expect(address).toMatchObject({ host: "127.0.0.1", port: 4721 });
    expect(address.pid).toBeGreaterThan(0);
    expect(supervisor.address).toEqual(address);
  });

  it("adds --log-operations to the arguments, once", async () => {
    const supervisor = create();
    const lines: LogEntry[] = [];

    supervisor.on("log", (entry: LogEntry) => lines.push(entry));
    await supervisor.start(["ok", "--port", "0"]);
    await supervisor.stop();
    await supervisor.start(["ok", "--log-operations"]);

    const args = lines
      .filter((entry) => entry.event === "server.started")
      .map((entry) => entry.details?.["args"]);

    expect(args).toEqual([
      ["ok", "--port", "0", "--log-operations"],
      ["ok", "--log-operations"],
    ]);
  });

  it("refuses to start twice", async () => {
    const supervisor = create();

    await supervisor.start(["ok"]);

    const error = await failure(supervisor.start(["ok"]));

    expect(error.code).toBe(SupervisorErrorCode.InvalidState);
    expect(error.message).toContain("running");
    expect(supervisor.state).toBe(SupervisorState.Running);
  });

  it("fails with the server's own reason when it cannot start", async () => {
    const supervisor = create();
    const states = recordStates(supervisor);
    const error = await failure(supervisor.start(["fail-start"]));

    expect(error.code).toBe(SupervisorErrorCode.StartFailed);
    expect(error.message).toBe("The data directory is in use.");
    expect(states).toEqual(["stopped", "starting", "crashed"]);
    expect(supervisor.lastExit).toMatchObject({ code: 1, expected: false });
  });

  it("ends the explanation with the last thing the server wrote to standard error", async () => {
    const error = await failure(create().start(["stderr-then-exit"]));

    expect(error.message).toBe(
      "The server exited with code 2 before it started listening. something went wrong",
    );
  });

  it("describes an exit that gave no reason", async () => {
    const error = await failure(create().start(["exit-quietly"]));

    expect(error.code).toBe(SupervisorErrorCode.StartFailed);
    expect(error.message).toBe(
      "The server exited with code 0 before it started listening.",
    );
  });

  it("fails when the program cannot be launched", async () => {
    const supervisor = create({
      command: [join(directory, "no-such-program")],
    });
    const error = await failure(supervisor.start());

    expect(error.code).toBe(SupervisorErrorCode.StartFailed);
    expect(error.message).toContain("ENOENT");
    expect(supervisor.state).toBe(SupervisorState.Crashed);
  });

  it("kills a server that stays silent past the start timeout", async () => {
    const supervisor = create({ startTimeoutMs: 200 });
    const error = await failure(supervisor.start(["silent"]));

    expect(error.code).toBe(SupervisorErrorCode.StartTimeout);
    expect(error.message).toContain("200 ms");
    expect(supervisor.state).toBe(SupervisorState.Crashed);
    expect(supervisor.lastExit).toMatchObject({
      signal: "SIGKILL",
      expected: false,
    });
  });

  it("can be started again after a failed start", async () => {
    const supervisor = create();

    await failure(supervisor.start(["fail-start"]));
    await supervisor.start(["ok"]);

    expect(supervisor.state).toBe(SupervisorState.Running);
  });
});

describe("log lines", () => {
  it("passes JSON log lines on and shows other output as plain lines", async () => {
    const supervisor = create();
    const lines: LogEntry[] = [];

    supervisor.on("log", (entry: LogEntry) => lines.push(entry));
    await supervisor.start(["plain-output"]);
    await supervisor.stop();

    // Standard output and standard error are separate pipes, so the order
    // between them is not fixed.
    expect(
      lines
        .map((entry) => `${entry.level} ${entry.event} ${entry.message}`)
        .sort(),
    ).toEqual([
      "error output a warning on stderr",
      "info output hello, this is not JSON",
      "info server.started listening",
    ]);
  });
});

describe("stopping", () => {
  it("stops a running server and ends up stopped", async () => {
    const supervisor = create();
    const states = recordStates(supervisor);

    await supervisor.start(["ok"]);
    await supervisor.stop();

    expect(states).toEqual([
      "stopped",
      "starting",
      "running",
      "stopping",
      "stopped",
    ]);
    expect(supervisor.address).toBeUndefined();
    expect(supervisor.lastExit).toEqual({
      code: 0,
      signal: null,
      expected: true,
    });
  });

  it("waits for the server to finish stopping", async () => {
    const supervisor = create();

    await supervisor.start(["slow-stop"]);

    const stopping = supervisor.stop();

    expect(supervisor.state).toBe(SupervisorState.Stopping);
    await stopping;

    expect(supervisor.state).toBe(SupervisorState.Stopped);
  });

  it("gives the same answer to a second stop while one is running", async () => {
    const supervisor = create();

    await supervisor.start(["slow-stop"]);

    const first = supervisor.stop();
    const second = supervisor.stop();

    await Promise.all([first, second]);

    expect(supervisor.state).toBe(SupervisorState.Stopped);
  });

  it("does nothing when the server is not running", async () => {
    const supervisor = create();

    await supervisor.stop();
    await supervisor.kill();

    expect(supervisor.state).toBe(SupervisorState.Stopped);
  });

  it("fails after the stop timeout, stays stopping, and can then be killed", async () => {
    const supervisor = create({ stopTimeoutMs: 150 });

    await supervisor.start(["ignore-term"]);

    const error = await failure(supervisor.stop());

    expect(error.code).toBe(SupervisorErrorCode.StopTimeout);
    expect(error.message).toContain("150 ms");
    expect(supervisor.state).toBe(SupervisorState.Stopping);

    await supervisor.kill();

    expect(supervisor.state).toBe(SupervisorState.Stopped);
    expect(supervisor.lastExit).toMatchObject({
      signal: "SIGKILL",
      expected: true,
    });
  });

  it("counts a server that the stop signal ends as stopped", async () => {
    const supervisor = create();

    await supervisor.start(["no-handler"]);
    await supervisor.stop();

    expect(supervisor.state).toBe(SupervisorState.Stopped);
    expect(supervisor.lastExit).toEqual({
      code: null,
      signal: "SIGTERM",
      expected: true,
    });
  });

  it("tries again, with a new timeout, when asked to stop after a timeout", async () => {
    const supervisor = create({ stopTimeoutMs: 150 });

    await supervisor.start(["ignore-term"]);
    await failure(supervisor.stop());

    const began = Date.now();
    const error = await failure(supervisor.stop());

    expect(error.code).toBe(SupervisorErrorCode.StopTimeout);
    expect(Date.now() - began).toBeGreaterThanOrEqual(100);
  });

  it("reports a crash when the server exits badly while stopping", async () => {
    const supervisor = create();

    await supervisor.start(["stop-fails"]);
    await supervisor.stop();

    expect(supervisor.state).toBe(SupervisorState.Crashed);
    expect(supervisor.lastExit).toMatchObject({ code: 1, expected: true });
  });

  it("cancels a start that is still waiting", async () => {
    const supervisor = create();
    const pending = supervisor.start(["silent"]);
    const cancelled = failure(pending);

    await supervisor.stop();

    expect((await cancelled).code).toBe(SupervisorErrorCode.StartCancelled);
    expect(supervisor.state).toBe(SupervisorState.Stopped);
  });
});

describe("killing", () => {
  it("ends a running server at once", async () => {
    const supervisor = create();
    const states = recordStates(supervisor);

    await supervisor.start(["ignore-term"]);
    await supervisor.kill();

    expect(states).toEqual([
      "stopped",
      "starting",
      "running",
      "stopping",
      "stopped",
    ]);
    expect(supervisor.lastExit).toEqual({
      code: null,
      signal: "SIGKILL",
      expected: true,
    });
  });

  it("cancels a start that is still waiting", async () => {
    const supervisor = create();
    const cancelled = failure(supervisor.start(["silent"]));

    await supervisor.kill();

    expect((await cancelled).code).toBe(SupervisorErrorCode.StartCancelled);
    expect(supervisor.state).toBe(SupervisorState.Stopped);
  });
});

describe("crashes", () => {
  it("moves to crashed when the server exits on its own", async () => {
    const supervisor = create();
    const states = recordStates(supervisor);
    const exits: unknown[] = [];

    supervisor.on("exit", (exit: unknown) => exits.push(exit));
    await supervisor.start(["crash-after-start"]);
    await new Promise<void>((resolve) =>
      supervisor.once("exit", () => resolve()),
    );

    expect(states).toEqual(["stopped", "starting", "running", "crashed"]);
    expect(exits).toEqual([{ code: 3, signal: null, expected: false }]);
    expect(supervisor.address).toBeUndefined();
  });

  it("starts again after a crash", async () => {
    const supervisor = create();

    await supervisor.start(["crash-after-start"]);
    await new Promise<void>((resolve) =>
      supervisor.once("exit", () => resolve()),
    );
    await supervisor.start(["ok"]);

    expect(supervisor.state).toBe(SupervisorState.Running);
    expect(supervisor.lastExit).toMatchObject({ code: 3 });
  });
});
