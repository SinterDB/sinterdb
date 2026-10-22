import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

import type { LogEntry } from "./logger.js";
import {
  ServerSupervisor,
  SupervisorError,
  SupervisorErrorCode,
  SupervisorState,
} from "./supervisor.js";

// The supervisor against the real built `sinterd`. `pnpm build` must have run
// first, because the supervisor starts the file in dist.

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

function create(): { supervisor: ServerSupervisor; lines: LogEntry[] } {
  const supervisor = new ServerSupervisor({
    command: [process.execPath, CLI],
  });
  const lines: LogEntry[] = [];

  supervisor.on("log", (entry: LogEntry) => lines.push(entry));
  supervisors.push(supervisor);

  return { supervisor, lines };
}

function dataDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "sinterdb-supervised-"));

  directories.push(directory);

  return join(directory, "data");
}

async function waitFor(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 5000;

  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error("Timed out waiting for a condition.");
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("supervising the real server", () => {
  it("starts it, reports its port, and stops it cleanly", async () => {
    const { supervisor, lines } = create();
    const address = await supervisor.start(["--port", "0"]);

    expect(address.host).toBe("127.0.0.1");
    expect(address.port).toBeGreaterThan(0);
    expect(supervisor.state).toBe(SupervisorState.Running);

    await supervisor.stop();

    expect(supervisor.state).toBe(SupervisorState.Stopped);
    expect(supervisor.lastExit).toEqual({
      code: 0,
      signal: null,
      expected: true,
    });
    expect(lines.map((entry) => entry.event)).toEqual([
      "server.started",
      "server.stopping",
      "server.stopped",
    ]);
  });

  it("reports connections opening and closing", async () => {
    const { supervisor, lines } = create();
    const address = await supervisor.start(["--port", "0"]);
    const socket = connect({ host: address.host, port: address.port });

    await new Promise<void>((resolve) => socket.once("connect", resolve));
    await waitFor(() =>
      lines.some((entry) => entry.event === "connection.opened"),
    );
    socket.destroy();
    await waitFor(() =>
      lines.some((entry) => entry.event === "connection.closed"),
    );

    const events = lines.filter((entry) =>
      entry.event.startsWith("connection."),
    );

    expect(events.map((entry) => entry.message)).toEqual([
      "Connection #1 opened.",
      "Connection #1 closed.",
    ]);
    expect(events.map((entry) => entry.details?.["active"])).toEqual([1, 0]);
  });

  it("will not start a second server on a data directory that is in use", async () => {
    const directory = dataDirectory();
    const first = create().supervisor;
    const second = create().supervisor;

    await first.start(["--port", "0", "--data-dir", directory]);

    const error: unknown = await second
      .start(["--port", "0", "--data-dir", directory])
      .then(
        () => undefined,
        (caught: unknown) => caught,
      );

    expect(error).toBeInstanceOf(SupervisorError);
    expect((error as SupervisorError).code).toBe(
      SupervisorErrorCode.StartFailed,
    );
    expect((error as SupervisorError).message).toContain(
      "The data directory is in use",
    );
    expect(second.state).toBe(SupervisorState.Crashed);
    expect(first.state).toBe(SupervisorState.Running);

    await first.stop();
    await second.start(["--port", "0", "--data-dir", directory]);

    expect(second.state).toBe(SupervisorState.Running);
  });

  it("recovers a killed server's data directory on the next start", async () => {
    const directory = dataDirectory();
    const { supervisor } = create();

    await supervisor.start(["--port", "0", "--data-dir", directory]);
    await supervisor.kill();

    expect(supervisor.lastExit).toMatchObject({
      signal: "SIGKILL",
      expected: true,
    });
    expect(supervisor.state).toBe(SupervisorState.Stopped);

    await supervisor.start(["--port", "0", "--data-dir", directory]);

    expect(supervisor.state).toBe(SupervisorState.Running);
  });

  it("reports a crash when something else ends the process", async () => {
    const { supervisor } = create();
    const address = await supervisor.start(["--port", "0"]);
    const exited = new Promise<void>((resolve) =>
      supervisor.once("exit", () => resolve()),
    );

    process.kill(address.pid, "SIGKILL");
    await exited;

    expect(supervisor.state).toBe(SupervisorState.Crashed);
    expect(supervisor.lastExit).toEqual({
      code: null,
      signal: "SIGKILL",
      expected: false,
    });
  });

  it("explains a bad option instead of hanging", async () => {
    const { supervisor } = create();
    const error: unknown = await supervisor.start(["--port", "nope"]).then(
      () => undefined,
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(SupervisorError);
    expect((error as SupervisorError).message).toMatch(/port/i);
    expect(supervisor.state).toBe(SupervisorState.Crashed);
  });
});
