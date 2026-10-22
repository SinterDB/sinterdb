import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { createInterface } from "node:readline";

import type { LogEntry } from "./logger.js";

/** What the supervised server is doing right now. */
export const SupervisorState = {
  /** No server process. The starting state, and the state after a clean stop. */
  Stopped: "stopped",
  /** A process was launched and has not said it is listening yet. */
  Starting: "starting",
  /** The server said it is listening. */
  Running: "running",
  /** A stop was asked for and the process has not exited yet. */
  Stopping: "stopping",
  /**
   * The process exited when nobody asked it to, or it failed to start. The
   * last exit is in {@link ServerSupervisor.lastExit}.
   */
  Crashed: "crashed",
} as const;

export type SupervisorState =
  (typeof SupervisorState)[keyof typeof SupervisorState];

export const SupervisorErrorCode = {
  /** The call does not fit the current state, such as starting twice. */
  InvalidState: "INVALID_STATE",
  /** The process exited, or could not be launched, before it was listening. */
  StartFailed: "START_FAILED",
  /** The process did not say it was listening in time, and was killed. */
  StartTimeout: "START_TIMEOUT",
  /** A stop was asked for while the server was still starting. */
  StartCancelled: "START_CANCELLED",
  /** The process was still running when the stop timeout ran out. */
  StopTimeout: "STOP_TIMEOUT",
} as const;

export type SupervisorErrorCode =
  (typeof SupervisorErrorCode)[keyof typeof SupervisorErrorCode];

export class SupervisorError extends Error {
  public readonly code: SupervisorErrorCode;

  public constructor(code: SupervisorErrorCode, message: string) {
    super(message);

    this.name = "SupervisorError";
    this.code = code;
  }
}

export interface SupervisorOptions {
  /**
   * The program and the arguments that come before the server's own, such as
   * `[process.execPath, "/path/to/sinterd/index.js"]`.
   */
  readonly command: readonly [string, ...string[]];
  /** Environment for the process. Defaults to this process's environment. */
  readonly env?: NodeJS.ProcessEnv;
  /** How long a start may take before the process is killed. Default 15000. */
  readonly startTimeoutMs?: number;
  /** How long a graceful stop may take before it fails. Default 10000. */
  readonly stopTimeoutMs?: number;
}

export interface SupervisorAddress {
  readonly host: string;
  readonly port: number;
  readonly pid: number;
}

export interface SupervisorExit {
  /** The exit code, or `null` when a signal ended the process. */
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
  /** `true` when a stop or kill was asked for first. */
  readonly expected: boolean;
}

export const DEFAULT_START_TIMEOUT_MS = 15_000;
export const DEFAULT_STOP_TIMEOUT_MS = 10_000;

/**
 * Runs the SinterDB server as a child process and reports what it does.
 *
 * The child is the same `sinterd` program started from a terminal or a
 * service, with `--log-operations` added. Its log lines arrive as `log`
 * events. Because it is a separate process, a crash or a kill cannot take the
 * supervisor down, and `kill()` is a real kill.
 *
 * Events: `state` ({ state, previous }), `log` (a LogEntry), and `exit`
 * (a SupervisorExit).
 */
export class ServerSupervisor extends EventEmitter {
  private readonly command: readonly [string, ...string[]];
  private readonly env: NodeJS.ProcessEnv | undefined;
  private readonly startTimeoutMs: number;
  private readonly stopTimeoutMs: number;

  private currentState: SupervisorState = SupervisorState.Stopped;
  private child: ChildProcess | undefined;
  private currentAddress: SupervisorAddress | undefined;
  private currentExit: SupervisorExit | undefined;
  private stopRequested = false;
  private timedOut = false;
  private cancelled = false;
  private lastErrorLine: string | undefined;
  private startFailure: string | undefined;
  private settleStart:
    | { resolve(address: SupervisorAddress): void; reject(error: Error): void }
    | undefined;
  private stopping: Promise<void> | undefined;

  public constructor(options: SupervisorOptions) {
    super();

    this.command = options.command;
    this.env = options.env;
    this.startTimeoutMs = options.startTimeoutMs ?? DEFAULT_START_TIMEOUT_MS;
    this.stopTimeoutMs = options.stopTimeoutMs ?? DEFAULT_STOP_TIMEOUT_MS;
  }

  public get state(): SupervisorState {
    return this.currentState;
  }

  /** Where the server listens. Set while it is running or stopping. */
  public get address(): SupervisorAddress | undefined {
    return this.currentAddress;
  }

  /** How the last process ended, or `undefined` before the first exit. */
  public get lastExit(): SupervisorExit | undefined {
    return this.currentExit;
  }

  /**
   * Starts the server with these `sinterd` arguments and resolves once it is
   * listening. It fails when the process exits first (a data directory that
   * another server holds, a port in use) or stays silent past the start
   * timeout. Either way the state is then `crashed`.
   */
  public start(
    serverArguments: readonly string[] = [],
  ): Promise<SupervisorAddress> {
    if (
      this.currentState !== SupervisorState.Stopped &&
      this.currentState !== SupervisorState.Crashed
    ) {
      return Promise.reject(
        new SupervisorError(
          SupervisorErrorCode.InvalidState,
          `The server cannot be started while it is ${this.currentState}.`,
        ),
      );
    }

    const [program, ...leading] = this.command;
    const args = [
      ...leading,
      ...serverArguments,
      ...(serverArguments.includes("--log-operations")
        ? []
        : ["--log-operations"]),
    ];

    this.stopRequested = false;
    this.lastErrorLine = undefined;
    this.startFailure = undefined;
    this.currentAddress = undefined;
    this.stopping = undefined;
    this.setState(SupervisorState.Starting);

    return new Promise<SupervisorAddress>((resolve, reject) => {
      const child = spawn(program, args, {
        stdio: ["ignore", "pipe", "pipe"],
        ...(this.env === undefined ? {} : { env: this.env }),
      });
      const timer = setTimeout(() => {
        if (this.currentState !== SupervisorState.Starting) {
          return;
        }

        this.startFailure = `The server did not start listening within ${this.startTimeoutMs} ms.`;
        this.timedOut = true;
        child.kill("SIGKILL");
      }, this.startTimeoutMs);

      this.child = child;
      this.timedOut = false;
      this.settleStart = {
        resolve: (address) => {
          clearTimeout(timer);
          resolve(address);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };

      this.readLines(child, "stdout");
      this.readLines(child, "stderr");

      child.once("error", (error) => {
        // The program could not be launched at all.
        this.startFailure = error.message;
      });
      child.once("close", (code, signal) => {
        this.handleClose(child, code, signal);
      });
    });
  }

  /**
   * Asks the server to stop and waits until the process has exited. The
   * server finishes its writes and closes its files first, so nothing is lost.
   * It fails with `STOP_TIMEOUT` if the process is still running after the
   * stop timeout. It then stays `stopping`, and {@link kill} ends it at once.
   * Stopping a server that is not running does nothing.
   */
  public stop(): Promise<void> {
    if (this.stopping !== undefined) {
      return this.stopping;
    }

    const child = this.child;

    if (
      child === undefined ||
      (this.currentState !== SupervisorState.Starting &&
        this.currentState !== SupervisorState.Running &&
        this.currentState !== SupervisorState.Stopping)
    ) {
      return Promise.resolve();
    }

    const wasStarting = this.currentState === SupervisorState.Starting;

    this.stopRequested = true;
    this.setState(SupervisorState.Stopping);

    if (wasStarting) {
      this.startFailure = "The server was stopped before it finished starting.";
      this.cancelled = true;
    }

    const exited = this.whenClosed(child);

    child.kill("SIGTERM");

    const stopping = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.stopping = undefined;
        reject(
          new SupervisorError(
            SupervisorErrorCode.StopTimeout,
            `The server was still running ${this.stopTimeoutMs} ms after it was asked to stop. Kill it to end it now.`,
          ),
        );
      }, this.stopTimeoutMs);

      void exited.then(() => {
        clearTimeout(timer);
        resolve();
      });
    });

    this.stopping = stopping;

    return stopping;
  }

  /**
   * Ends the process at once, without a graceful shutdown, and waits for it to
   * exit. Data that was acknowledged under the `flushed` write concern is safe,
   * and the next start recovers from the log. Killing a server that is not
   * running does nothing.
   */
  public async kill(): Promise<void> {
    const child = this.child;

    if (
      child === undefined ||
      (this.currentState !== SupervisorState.Starting &&
        this.currentState !== SupervisorState.Running &&
        this.currentState !== SupervisorState.Stopping)
    ) {
      return;
    }

    if (this.currentState === SupervisorState.Starting) {
      this.startFailure = "The server was killed before it finished starting.";
      this.cancelled = true;
    }

    this.stopRequested = true;

    if (this.currentState !== SupervisorState.Stopping) {
      this.setState(SupervisorState.Stopping);
    }

    const exited = this.whenClosed(child);

    child.kill("SIGKILL");
    await exited;
  }

  private whenClosed(child: ChildProcess): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.child !== child) {
        resolve();
        return;
      }

      child.once("close", () => resolve());
    });
  }

  private readLines(child: ChildProcess, source: "stdout" | "stderr"): void {
    const stream = source === "stdout" ? child.stdout : child.stderr;

    if (stream === null) {
      return;
    }

    createInterface({ input: stream }).on("line", (line) => {
      this.handleLine(line, source);
    });
  }

  private handleLine(line: string, source: "stdout" | "stderr"): void {
    if (line.trim().length === 0) {
      return;
    }

    const entry = parseLogLine(line, source);

    if (source === "stderr") {
      this.lastErrorLine = entry.message;
    }

    if (entry.event === "server.start_failed") {
      this.startFailure = readErrorMessage(entry) ?? entry.message;
    }

    this.emit("log", entry);

    if (
      entry.event === "server.started" &&
      this.currentState === SupervisorState.Starting
    ) {
      const details = entry.details;
      const host = details?.["host"];
      const port = details?.["port"];

      if (
        this.child?.pid === undefined ||
        typeof host !== "string" ||
        typeof port !== "number"
      ) {
        return;
      }

      this.currentAddress = { host, port, pid: this.child.pid };
      this.setState(SupervisorState.Running);
      this.settleStart?.resolve(this.currentAddress);
      this.settleStart = undefined;
    }
  }

  private handleClose(
    child: ChildProcess,
    code: number | null,
    signal: NodeJS.Signals | null,
  ): void {
    if (this.child !== child) {
      return;
    }

    const expected = this.stopRequested;
    const exit: SupervisorExit = { code, signal, expected };
    const failedToStart = this.settleStart !== undefined;
    const cancelled = this.cancelled;
    const timedOut = this.timedOut;
    const cleanStop =
      expected && (code === 0 || signal === "SIGKILL" || signal === "SIGTERM");

    this.child = undefined;
    this.currentAddress = undefined;
    this.currentExit = exit;
    this.cancelled = false;
    this.timedOut = false;

    this.setState(
      cleanStop || (expected && cancelled)
        ? SupervisorState.Stopped
        : SupervisorState.Crashed,
    );
    this.emit("exit", exit);

    if (failedToStart) {
      const settle = this.settleStart;

      this.settleStart = undefined;
      settle?.reject(
        new SupervisorError(
          cancelled
            ? SupervisorErrorCode.StartCancelled
            : timedOut
              ? SupervisorErrorCode.StartTimeout
              : SupervisorErrorCode.StartFailed,
          this.startFailure ?? this.describeExit(exit),
        ),
      );
    }
  }

  private describeExit(exit: SupervisorExit): string {
    const how =
      exit.signal === null
        ? `exited with code ${exit.code}`
        : `was ended by ${exit.signal}`;
    const last = this.lastErrorLine;

    return `The server ${how} before it started listening.${last === undefined ? "" : ` ${last}`}`;
  }

  private setState(state: SupervisorState): void {
    const previous = this.currentState;

    if (previous === state) {
      return;
    }

    this.currentState = state;
    this.emit("state", { state, previous });
  }
}

function parseLogLine(line: string, source: "stdout" | "stderr"): LogEntry {
  try {
    const parsed = JSON.parse(line) as Partial<LogEntry> | null;

    if (
      parsed !== null &&
      typeof parsed === "object" &&
      typeof parsed.event === "string" &&
      typeof parsed.message === "string" &&
      typeof parsed.timestamp === "string" &&
      (parsed.level === "info" ||
        parsed.level === "warn" ||
        parsed.level === "error")
    ) {
      return parsed as LogEntry;
    }
  } catch {
    // Not one of our log lines. It is shown as plain output below.
  }

  return {
    timestamp: new Date().toISOString(),
    level: source === "stderr" ? "error" : "info",
    event: "output",
    message: line,
  };
}

function readErrorMessage(entry: LogEntry): string | undefined {
  const error = entry.details?.["error"];

  if (error !== null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return undefined;
}
