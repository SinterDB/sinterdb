import { emitKeypressEvents, type Key } from "node:readline";
import type { EventEmitter } from "node:events";

import {
  ConsoleModel,
  type ConsoleEffect,
  type ConsoleKey,
} from "./console-model.js";
import { renderConsole } from "./console-render.js";
import type { LogEntry } from "./logger.js";
import type { Style } from "./style.js";
import {
  SupervisorError,
  SupervisorErrorCode,
  SupervisorState,
  type SupervisorAddress,
  type SupervisorExit,
} from "./supervisor.js";

/** The parts of a terminal's input that the console uses. */
export interface ConsoleInput extends EventEmitter {
  setRawMode?(mode: boolean): unknown;
  resume(): unknown;
  pause(): unknown;
}

/** The parts of a terminal's output that the console uses. */
export interface ConsoleOutput extends EventEmitter {
  readonly columns?: number;
  readonly rows?: number;
  write(text: string): unknown;
}

/** The parts of the server supervisor that the console uses. */
export interface ConsoleSupervisor extends EventEmitter {
  readonly state: SupervisorState;
  readonly address: SupervisorAddress | undefined;
  readonly lastExit: SupervisorExit | undefined;
  start(serverArguments?: readonly string[]): Promise<unknown>;
  stop(): Promise<void>;
  kill(): Promise<void>;
}

export interface RunConsoleOptions {
  readonly supervisor: ConsoleSupervisor;
  /** The `sinterd` arguments the server is started with. */
  readonly serverArguments: readonly string[];
  readonly input: ConsoleInput;
  readonly output: ConsoleOutput;
  readonly style: Style;
  readonly version: string;
  /** Where `SIGINT`, `SIGTERM`, `SIGHUP` and `exit` come from. Default: the process. */
  readonly signals?: EventEmitter;
  readonly now?: () => number;
  /** How often the clock and rates are redrawn. Default 1000. */
  readonly tickMs?: number;
}

const ENTER_SCREEN = "\u001B[?1049h\u001B[?25l\u001B[2J";
const LEAVE_SCREEN = "\u001B[?25h\u001B[?1049l";

const NAMED_KEYS = new Set([
  "up",
  "down",
  "pageup",
  "pagedown",
  "home",
  "end",
  "return",
  "escape",
  "backspace",
]);

/** Turns what Node's keypress event gives into a {@link ConsoleKey}. */
export function toConsoleKey(
  text: string | undefined,
  key: Key | undefined,
): ConsoleKey | undefined {
  const ctrl = key?.ctrl === true;
  const name = key?.name === "enter" ? "return" : key?.name;

  if (name !== undefined && NAMED_KEYS.has(name)) {
    return { name, ctrl };
  }

  if (ctrl) {
    return name === undefined ? undefined : { name, ctrl: true };
  }

  const typed = text ?? key?.sequence;

  if (
    key?.meta !== true &&
    typed !== undefined &&
    typed.length === 1 &&
    typed >= " " &&
    typed !== "\u007F"
  ) {
    return { name: typed.toLowerCase(), text: typed, ctrl: false };
  }

  return undefined;
}

/**
 * Runs the console on a terminal until the person quits. It takes over the
 * screen, and always gives it back: on quit, on a signal, on an error, and
 * when the process exits. The server it supervises is stopped before it
 * returns.
 */
export async function runConsole(options: RunConsoleOptions): Promise<void> {
  const { supervisor, input, output, style } = options;
  const signals = options.signals ?? process;
  const model = new ConsoleModel({
    version: options.version,
    ...(options.now === undefined ? {} : { now: options.now }),
  });

  let restored = false;
  let quitting = false;
  let renderTimer: NodeJS.Timeout | undefined;
  let work: Promise<void> = Promise.resolve();
  let finish: () => void = () => undefined;

  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });

  const size = (): void =>
    model.setSize(output.columns ?? 80, output.rows ?? 24);

  const draw = (): void => {
    renderTimer = undefined;
    size();

    const lines = renderConsole(model.snapshot(), style);

    output.write(
      lines
        .map((line, index) => `\u001B[${index + 1};1H${line}\u001B[K`)
        .join(""),
    );
  };

  const render = (): void => {
    renderTimer ??= setTimeout(draw, 16);
  };

  const sync = (): void => {
    model.setServerState(supervisor.state, supervisor.address);
    render();
  };

  const onState = (): void => sync();
  const onLog = (entry: LogEntry): void => {
    model.addLog(entry);
    render();
  };
  const onExit = (exit: SupervisorExit): void => {
    model.setExit(exit);
    render();
  };

  const fail = (what: string, error: unknown): void => {
    model.note(
      "error",
      `${what}: ${error instanceof Error ? error.message : String(error)}`,
    );
    sync();
  };

  const enqueue = (task: () => Promise<void>): void => {
    work = work.then(task).catch(() => undefined);
  };

  const start = async (): Promise<void> => {
    try {
      await supervisor.start(options.serverArguments);
    } catch (error: unknown) {
      // Stopping a server that is still starting is not a failure to report.
      if (
        !(error instanceof SupervisorError) ||
        error.code !== SupervisorErrorCode.StartCancelled
      ) {
        fail("The server did not start", error);
      }
    }
  };

  const stop = async (): Promise<void> => {
    try {
      await supervisor.stop();
    } catch (error: unknown) {
      fail("The server did not stop", error);
    }
  };

  const shutDown = async (): Promise<void> => {
    if (
      supervisor.state !== SupervisorState.Stopped &&
      supervisor.state !== SupervisorState.Crashed
    ) {
      try {
        await supervisor.stop();
      } catch {
        await supervisor.kill();
      }
    }

    finish();
  };

  const quit = (): void => {
    if (quitting) {
      // A second request while stopping: stop waiting and kill.
      void supervisor.kill().then(finish);
      return;
    }

    quitting = true;
    model.note("info", "Stopping the server and quitting...");
    sync();
    enqueue(shutDown);
  };

  const perform = (effect: ConsoleEffect): void => {
    switch (effect.kind) {
      case "start":
        enqueue(start);
        return;
      case "stop":
        enqueue(stop);
        return;
      case "restart":
        enqueue(async () => {
          await stop();
          await start();
        });
        return;
      case "quit":
        quit();
    }
  };

  const onKeypress = (text: string | undefined, key: Key | undefined): void => {
    const consoleKey = toConsoleKey(text, key);

    if (consoleKey === undefined) {
      return;
    }

    const effect = model.handleKey(consoleKey);

    render();

    if (effect !== undefined) {
      perform(effect);
    }
  };

  const onResize = (): void => render();
  const onSignal = (): void => quit();
  const onProcessExit = (): void => {
    restore();
    finish();
  };

  function restore(): void {
    if (restored) {
      return;
    }

    restored = true;

    if (renderTimer !== undefined) {
      clearTimeout(renderTimer);
    }

    clearInterval(tick);
    input.off("keypress", onKeypress);
    input.off("end", onSignal);
    output.off("resize", onResize);
    supervisor.off("state", onState);
    supervisor.off("log", onLog);
    supervisor.off("exit", onExit);
    signals.off("SIGINT", onSignal);
    signals.off("SIGTERM", onSignal);
    signals.off("SIGHUP", onSignal);
    signals.off("exit", onProcessExit);
    output.write(LEAVE_SCREEN);
    input.setRawMode?.(false);
    input.pause();
  }

  const tick = setInterval(render, options.tickMs ?? 1000);

  tick.unref();

  try {
    emitKeypressEvents(input as NodeJS.ReadStream);
    input.setRawMode?.(true);
    input.resume();
    output.write(ENTER_SCREEN);
    input.on("keypress", onKeypress);
    input.on("end", onSignal);
    output.on("resize", onResize);
    supervisor.on("state", onState);
    supervisor.on("log", onLog);
    supervisor.on("exit", onExit);
    signals.on("SIGINT", onSignal);
    signals.on("SIGTERM", onSignal);
    signals.on("SIGHUP", onSignal);
    signals.on("exit", onProcessExit);
    sync();
    draw();
    await done;
  } finally {
    restore();

    if (
      supervisor.state !== SupervisorState.Stopped &&
      supervisor.state !== SupervisorState.Crashed
    ) {
      await supervisor.kill();
    }
  }
}
