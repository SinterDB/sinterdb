import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { SinterClient } from "./client.js";
import { SinterServerError } from "./errors.js";

// `sinterd --log-operations` logs one "operation" event for every command, and
// without the flag the log has none. This starts the built server CLI for
// real and reads its standard output. `pnpm build` must have run first.

const CLI = join(
  fileURLToPath(new URL("../../../", import.meta.url)),
  "apps/server-cli/dist/index.js",
);

interface LogLine {
  readonly level: string;
  readonly event: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

interface Running {
  readonly child: ChildProcess;
  readonly port: number;
  readonly lines: LogLine[];
  stop(): Promise<void>;
}

const running: ChildProcess[] = [];

afterEach(() => {
  for (const child of running.splice(0)) {
    child.kill("SIGKILL");
  }
});

function start(
  extra: string[],
  env: Record<string, string> = {},
): Promise<Running> {
  if (!existsSync(CLI)) {
    throw new Error("The server CLI is not built. Run `pnpm build` first.");
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, "--port", "0", ...extra], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...env },
    });
    const lines: LogLine[] = [];
    let buffer = "";
    let started = false;

    running.push(child);

    const timer = setTimeout(
      () => reject(new Error("The server did not start.")),
      15_000,
    );

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      buffer += chunk;

      const complete = buffer.split("\n");

      buffer = complete.pop() ?? "";

      for (const text of complete) {
        const line = JSON.parse(text) as LogLine;

        lines.push(line);

        if (!started && line.event === "server.started") {
          started = true;
          clearTimeout(timer);
          resolve({
            child,
            port: line.details?.["port"] as number,
            lines,
            stop: () =>
              new Promise<void>((done) => {
                child.once("exit", () => done());
                child.kill("SIGINT");
              }),
          });
        }
      }
    });
  });
}

async function work(port: number): Promise<void> {
  const client = new SinterClient(`sinterdb://127.0.0.1:${port}/app`);

  await client.connect();

  try {
    const users = client
      .db()
      .collection<{ _id: string; name: string }>("users");

    await users.insertOne({ name: "Ada" } as never);
    await users.find({}).toArray();

    const failure = await client
      .db()
      .collection("users")
      .insertOne({ _id: "not an id" } as never)
      .then(
        () => undefined,
        (error: unknown) => error,
      );

    expect(failure).toBeInstanceOf(SinterServerError);
  } finally {
    await client.close();
  }
}

describe("sinterd --log-operations", () => {
  it("logs one operation event per command", async () => {
    const server = await start(["--log-operations"]);

    await work(server.port);
    await server.stop();

    const operations = server.lines.filter(
      (line) => line.event === "operation",
    );
    const names = operations.map((line) => line.details?.["command"]);

    expect(names).toContain("insertOne");
    expect(names).toContain("find");
    expect(
      operations.every((line) => line.details?.["durationMs"] !== undefined),
    ).toBe(true);

    const insert = operations.find(
      (line) => line.details?.["command"] === "insertOne",
    );

    expect(insert).toMatchObject({
      level: "info",
      message: "insertOne app.users",
      details: { database: "app", collection: "users", ok: true },
    });

    const failed = operations.filter((line) => line.details?.["ok"] === false);

    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ level: "warn" });
    expect(typeof failed[0]?.details?.["error"]).toBe("string");
  });

  it("can be switched on with SINTERDB_LOG_OPERATIONS", async () => {
    const server = await start([], { SINTERDB_LOG_OPERATIONS: "true" });

    await work(server.port);
    await server.stop();

    expect(server.lines.some((line) => line.event === "operation")).toBe(true);
  });

  it("logs nothing extra without the flag", async () => {
    const server = await start([]);

    await work(server.port);
    await server.stop();

    expect(server.lines.map((line) => line.event)).toEqual([
      "server.started",
      "server.stopping",
      "server.stopped",
    ]);
  });
});
