import { EventEmitter } from "node:events";
import type { Key } from "node:readline";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { ActionReport, ConsoleActions } from "./console-actions.js";
import {
  runConsole,
  toConsoleKey,
  type ConsoleSupervisor,
  type RunConsoleOptions,
} from "./console-terminal.js";
import { PLAIN_STYLE, stripAnsi } from "./style.js";
import {
  SupervisorError,
  SupervisorErrorCode,
  SupervisorState,
  type SupervisorAddress,
  type SupervisorExit,
} from "./supervisor.js";

const ENTER = "\u001B[?1049h\u001B[?25l\u001B[2J";
const LEAVE = "\u001B[?25h\u001B[?1049l";
const ADDRESS: SupervisorAddress = { host: "127.0.0.1", port: 4721, pid: 7 };

class FakeSupervisor extends EventEmitter implements ConsoleSupervisor {
  public state: SupervisorState = SupervisorState.Stopped;
  public address: SupervisorAddress | undefined;
  public lastExit: SupervisorExit | undefined;
  public readonly calls: string[] = [];
  public startError: Error | undefined;
  public stopError: Error | undefined;
  public stopGate: Promise<void> | undefined;
  public killError: Error | undefined;
  public onKill: (() => void) | undefined;

  public set(state: SupervisorState): void {
    this.state = state;
    this.address = state === SupervisorState.Running ? ADDRESS : undefined;
    this.emit("state", { state, previous: SupervisorState.Stopped });
  }

  public start(serverArguments?: readonly string[]): Promise<unknown> {
    this.calls.push(`start ${(serverArguments ?? []).join(" ")}`.trim());

    if (this.startError !== undefined) {
      return Promise.reject(this.startError);
    }

    this.set(SupervisorState.Running);

    return Promise.resolve(ADDRESS);
  }

  public async stop(): Promise<void> {
    this.calls.push("stop");
    await this.stopGate;

    if (this.stopError !== undefined) {
      throw this.stopError;
    }

    this.set(SupervisorState.Stopped);
  }

  public kill(): Promise<void> {
    this.calls.push("kill");
    this.onKill?.();

    if (this.killError !== undefined) {
      return Promise.reject(this.killError);
    }

    this.set(SupervisorState.Stopped);

    return Promise.resolve();
  }
}

class FakeInput extends EventEmitter {
  public readonly rawModes: boolean[] = [];
  public paused = false;

  public setRawMode(mode: boolean): void {
    this.rawModes.push(mode);
  }

  public resume(): void {
    this.paused = false;
  }

  public pause(): void {
    this.paused = true;
  }

  public press(text: string | undefined, key: Partial<Key> = {}): void {
    this.emit("keypress", text, { sequence: text, ...key });
  }
}

class FakeOutput extends EventEmitter {
  public columns = 80;
  public rows = 24;
  public readonly writes: string[] = [];

  public write(text: string): void {
    this.writes.push(text);
  }

  public get text(): string {
    return this.writes.join("");
  }

  /** The text of the last full frame, with cursor moves turned into newlines. */
  public get screen(): string {
    const last = this.writes
      .filter((text) => text.includes("\u001B[1;1H"))
      .at(-1);

    return stripAnsi(
      (last ?? "")
        .replace(/\u001B\[(\d+);1H/g, "\n")
        .replaceAll("\u001B[K", ""),
    );
  }
}

interface Setup {
  supervisor: FakeSupervisor;
  input: FakeInput;
  output: FakeOutput;
  signals: EventEmitter;
  finished: Promise<void>;
  settled: () => boolean;
}

const open: Setup[] = [];

function setup(
  serverArguments: string[] = ["--no-ui"],
  data?: RunConsoleOptions["data"],
): Setup {
  const supervisor = new FakeSupervisor();
  const input = new FakeInput();
  const output = new FakeOutput();
  const signals = new EventEmitter();
  let done = false;
  const finished = runConsole({
    supervisor,
    serverArguments,
    input,
    output,
    style: PLAIN_STYLE,
    version: "1.2.3",
    ...(data === undefined ? {} : { data }),
    signals,
    tickMs: 20,
  }).finally(() => {
    done = true;
  });
  const created = {
    supervisor,
    input,
    output,
    signals,
    finished,
    settled: () => done,
  };

  open.push(created);

  return created;
}

async function until(check: () => boolean, what: string): Promise<void> {
  const end = Date.now() + 2000;

  while (!check()) {
    if (Date.now() > end) {
      throw new Error(`Timed out waiting for ${what}.`);
    }

    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

afterEach(async () => {
  for (const item of open.splice(0)) {
    if (!item.settled()) {
      // A signal quits whatever the console is showing.
      item.signals.emit("SIGINT");
      await item.finished.catch(() => undefined);
    }
  }
});

describe("runConsole screen handling", () => {
  it("takes the screen, draws, and gives it back on quit", async () => {
    const { input, output, finished } = setup();

    await until(() => output.screen.includes("SinterDB v1.2.3"), "the frame");

    expect(output.writes[0]).toBe(ENTER);
    expect(input.rawModes).toEqual([true]);
    expect(input.paused).toBe(false);
    expect(output.screen).toContain("* stopped");

    input.press("q");
    input.press("y");
    await finished;

    expect(output.writes.at(-1)).toBe(LEAVE);
    expect(output.text.split(LEAVE)).toHaveLength(2);
    expect(input.rawModes).toEqual([true, false]);
    expect(input.paused).toBe(true);
  });

  it("draws every row at the size of the terminal, and redraws on resize", async () => {
    const { input, output, finished } = setup();

    output.columns = 100;
    output.rows = 30;
    output.emit("resize");

    await until(
      () => output.screen.split("\n").length === 31,
      "a frame for 30 rows",
    );

    input.press("q");
    input.press("y");
    await finished;
  });

  it("gives the screen back when setup fails", async () => {
    const supervisor = new FakeSupervisor();
    const input = new FakeInput();
    const output = new FakeOutput();
    const signals = new EventEmitter();

    input.setRawMode = () => {
      throw new Error("no raw mode");
    };

    await expect(
      runConsole({
        supervisor,
        serverArguments: [],
        input,
        output,
        style: PLAIN_STYLE,
        version: "1",
        signals,
      }),
    ).rejects.toThrow("no raw mode");

    expect(output.text).toContain(LEAVE);
    expect(input.listenerCount("keypress")).toBe(0);
    expect(supervisor.calls).toEqual([]);
  });

  it("removes every listener it added", async () => {
    const { supervisor, input, output, signals, finished } = setup();

    await until(() => output.writes.length > 1, "a frame");
    input.press("q");
    input.press("y");
    await finished;

    expect(input.listenerCount("keypress")).toBe(0);
    expect(input.listenerCount("end")).toBe(0);
    expect(output.listenerCount("resize")).toBe(0);

    for (const name of ["state", "log", "exit"]) {
      expect(supervisor.listenerCount(name)).toBe(0);
    }

    for (const name of ["SIGINT", "SIGTERM", "SIGHUP", "exit"]) {
      expect(signals.listenerCount(name)).toBe(0);
    }
  });

  it("gives the screen back when the process exits suddenly", async () => {
    const { output, signals, finished } = setup();

    await until(() => output.writes.length > 1, "a frame");
    signals.emit("exit");

    expect(output.text.split(LEAVE)).toHaveLength(2);

    await finished;

    expect(output.text.split(LEAVE)).toHaveLength(2);
  });
});

describe("runConsole server control", () => {
  it("starts the server with the given arguments, and shows it running", async () => {
    const { supervisor, input, output, finished } = setup([
      "--no-ui",
      "--config",
      "c.json",
    ]);

    await until(() => output.writes.length > 1, "a frame");
    input.press("s");
    await until(() => output.screen.includes("* running"), "running");

    expect(supervisor.calls).toEqual(["start --no-ui --config c.json"]);
    expect(output.screen).toContain("* running   :4721");

    input.press("q");
    input.press("y");
    await finished;
  });

  it("stops the server", async () => {
    const { supervisor, input, output, finished } = setup();

    input.press("s");
    await until(() => output.screen.includes("* running"), "running");
    input.press("x");
    await until(() => output.screen.includes("* stopped"), "stopped");

    expect(supervisor.calls).toEqual(["start --no-ui", "stop"]);

    input.press("q");
    input.press("y");
    await finished;
  });

  it("restarts by stopping and then starting", async () => {
    const { supervisor, input, output, finished } = setup();

    input.press("s");
    await until(() => output.screen.includes("* running"), "running");
    input.press("s");
    await until(() => supervisor.calls.length === 3, "the restart");

    expect(supervisor.calls).toEqual([
      "start --no-ui",
      "stop",
      "start --no-ui",
    ]);

    input.press("q");
    input.press("y");
    await finished;
    expect(output.text).toContain(LEAVE);
  });

  it("does nothing for a key that does not apply", async () => {
    const { supervisor, input, output, finished } = setup();

    await until(() => output.writes.length > 1, "a frame");
    input.press("x");
    await until(
      () => output.screen.includes("The server is not running."),
      "the notice",
    );

    expect(supervisor.calls).toEqual([]);

    input.press("q");
    input.press("y");
    await finished;
  });

  it("reports a server that did not start", async () => {
    const { supervisor, input, output, finished } = setup();

    supervisor.startError = new Error("port busy");
    input.press("s");
    await until(
      () => output.screen.includes("The server did not start: port busy"),
      "the error line",
    );

    input.press("q");
    input.press("y");
    await finished;
  });

  it("does not report a start that was cancelled by a stop", async () => {
    const { supervisor, input, output, finished } = setup();

    supervisor.startError = new SupervisorError(
      SupervisorErrorCode.StartCancelled,
      "cancelled",
    );
    input.press("s");
    await until(() => supervisor.calls.length === 1, "the start");
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(output.screen).not.toContain("did not start");

    input.press("q");
    input.press("y");
    await finished;
  });

  it("reports a start that failed for another supervisor reason", async () => {
    const { supervisor, input, output, finished } = setup();

    supervisor.startError = new SupervisorError(
      SupervisorErrorCode.StartTimeout,
      "too slow",
    );
    input.press("s");
    await until(
      () => output.screen.includes("The server did not start: too slow"),
      "the error line",
    );

    input.press("q");
    input.press("y");
    await finished;
  });

  it("reports a server that did not stop", async () => {
    const { supervisor, input, output, finished } = setup();

    input.press("s");
    await until(() => output.screen.includes("* running"), "running");
    supervisor.stopError = new Error("took too long");
    input.press("x");
    await until(
      () => output.screen.includes("The server did not stop: took too long"),
      "the error line",
    );

    supervisor.stopError = undefined;
    input.press("q");
    input.press("y");
    await finished;
  });

  it("shows how a server that crashed ended", async () => {
    const { supervisor, input, output, finished } = setup();

    await until(() => output.writes.length > 1, "a frame");
    supervisor.lastExit = { code: 3, signal: null, expected: false };
    supervisor.emit("exit", supervisor.lastExit);
    supervisor.set(SupervisorState.Crashed);
    await until(
      () => output.screen.includes("crashed   exited with code 3"),
      "the crash",
    );

    input.press("q");
    input.press("y");
    await finished;
  });

  it("shows log lines from the server", async () => {
    const { supervisor, input, output, finished } = setup();

    supervisor.emit("log", {
      timestamp: "2026-01-01T10:00:00.000Z",
      level: "warn",
      event: "operation",
      message: "insertOne app.users",
      details: { ok: false },
    });
    await until(
      () => output.screen.includes("WARN  insertOne app.users"),
      "the line",
    );

    input.press("q");
    input.press("y");
    await finished;
  });
});

describe("runConsole quitting", () => {
  it("stops a running server before it gives the screen back", async () => {
    const { supervisor, input, output, finished } = setup();

    input.press("s");
    await until(() => output.screen.includes("* running"), "running");
    input.press("q");
    input.press("y");
    await finished;

    expect(supervisor.calls).toEqual(["start --no-ui", "stop"]);
    expect(supervisor.state).toBe(SupervisorState.Stopped);
    expect(output.writes.at(-1)).toBe(LEAVE);
  });

  it("shows that it is stopping while it waits", async () => {
    const { supervisor, input, output, finished } = setup();
    let release: () => void = () => undefined;

    supervisor.stopGate = new Promise((resolve) => {
      release = resolve;
    });
    input.press("s");
    await until(() => output.screen.includes("* running"), "running");
    input.press("q");
    input.press("y");
    await until(
      () => output.screen.includes("Stopping the server and quitting..."),
      "the message",
    );

    expect(output.text).not.toContain(LEAVE);

    release();
    await finished;
  });

  it("kills the server when it will not stop", async () => {
    const { supervisor, input, output, finished } = setup();

    input.press("s");
    await until(() => output.screen.includes("* running"), "running");
    supervisor.stopError = new Error("stuck");

    let screenWasStillOurs = false;

    supervisor.onKill = () => {
      screenWasStillOurs = !output.text.includes(LEAVE);
    };
    input.press("q");
    input.press("y");
    await finished;

    expect(supervisor.calls).toEqual(["start --no-ui", "stop", "kill"]);
    // The kill comes before the screen is given back, so a person sees it.
    expect(screenWasStillOurs).toBe(true);
  });

  it("kills at once on a second request while it waits", async () => {
    const { supervisor, input, output, finished } = setup();

    supervisor.stopGate = new Promise(() => undefined);
    input.press("s");
    await until(() => output.screen.includes("* running"), "running");
    input.press("q");
    input.press("y");
    await until(
      () => output.screen.includes("Stopping the server and quitting..."),
      "the message",
    );
    input.press("c", { ctrl: true, name: "c" });
    await finished;

    expect(supervisor.calls).toEqual(["start --no-ui", "stop", "kill"]);
  });

  it("quits on ctrl-c, a signal, and a closed input", async () => {
    for (const quit of [
      (item: Setup) => item.input.press("c", { ctrl: true, name: "c" }),
      (item: Setup) => item.signals.emit("SIGTERM"),
      (item: Setup) => item.signals.emit("SIGINT"),
      (item: Setup) => item.signals.emit("SIGHUP"),
      (item: Setup) => item.input.emit("end"),
    ]) {
      const item = setup();

      await until(() => item.output.writes.length > 1, "a frame");
      quit(item);
      await item.finished;

      expect(item.output.writes.at(-1)).toBe(LEAVE);
    }
  });

  it("quits at once when the server is already stopped", async () => {
    const { supervisor, input, finished } = setup();

    input.press("q");
    input.press("y");
    await finished;

    expect(supervisor.calls).toEqual([]);
  });

  it("kills a server it could not stop through the supervisor state", async () => {
    const { supervisor, input, output, finished } = setup();

    input.press("s");
    await until(() => output.screen.includes("* running"), "running");
    vi.spyOn(supervisor, "stop").mockImplementation(() => {
      supervisor.state = SupervisorState.Stopping;

      return Promise.resolve();
    });
    input.press("q");
    input.press("y");
    await finished;

    expect(supervisor.calls).toContain("kill");
  });
});

describe("toConsoleKey", () => {
  it("passes named keys", () => {
    for (const name of [
      "up",
      "down",
      "pageup",
      "pagedown",
      "home",
      "end",
      "escape",
      "backspace",
    ]) {
      expect(toConsoleKey(undefined, { name, ctrl: false })).toEqual({
        name,
        ctrl: false,
      });
    }
  });

  it("treats enter as return", () => {
    expect(toConsoleKey("\n", { name: "enter" })).toEqual({
      name: "return",
      ctrl: false,
    });
    expect(toConsoleKey("\r", { name: "return" })).toEqual({
      name: "return",
      ctrl: false,
    });
  });

  it("types printable characters, keeping case", () => {
    expect(toConsoleKey("a", { name: "a" })).toEqual({
      name: "a",
      text: "a",
      ctrl: false,
    });
    expect(toConsoleKey("A", { name: "a", shift: true })).toEqual({
      name: "a",
      text: "A",
      ctrl: false,
    });
    expect(toConsoleKey("?", undefined)).toEqual({
      name: "?",
      text: "?",
      ctrl: false,
    });
    expect(toConsoleKey(" ", { name: "space" })).toEqual({
      name: " ",
      text: " ",
      ctrl: false,
    });
  });

  it("passes control keys without text", () => {
    expect(toConsoleKey("\u0003", { name: "c", ctrl: true })).toEqual({
      name: "c",
      ctrl: true,
    });
    expect(toConsoleKey(undefined, { ctrl: true })).toBeUndefined();
  });

  it("ignores meta keys, unknown keys and pasted text", () => {
    expect(toConsoleKey("x", { name: "x", meta: true })).toBeUndefined();
    expect(toConsoleKey(undefined, { name: "f5" })).toBeUndefined();
    expect(toConsoleKey("ab", undefined)).toBeUndefined();
    expect(toConsoleKey("\u007F", undefined)).toBeUndefined();
    expect(toConsoleKey("\t", { name: "tab" })).toBeUndefined();
    expect(toConsoleKey(undefined, undefined)).toBeUndefined();
  });
});

const backspace = { name: "backspace" };
const enter = { name: "return" };

function typeText(input: FakeInput, text: string): void {
  for (const character of text) {
    input.press(character);
  }
}

describe("runConsole kill", () => {
  it("kills only after a yes, and stays open", async () => {
    const { supervisor, input, output, settled } = setup();

    input.press("s");
    await until(() => output.screen.includes("* running"), "running");
    input.press("k");
    await until(
      () => output.screen.includes("? Kill the server without a clean"),
      "the question",
    );
    input.press("n");
    await until(
      () => !output.screen.includes("? Kill the server"),
      "the answer",
    );

    expect(supervisor.calls).toEqual(["start --no-ui"]);

    input.press("k");
    input.press("y");
    await until(() => supervisor.calls.includes("kill"), "the kill");
    await until(() => output.screen.includes("* stopped"), "stopped");

    expect(settled()).toBe(false);
  });

  it("does not wait behind a stop that is stuck", async () => {
    const { supervisor, input, output } = setup();

    let release: () => void = () => undefined;

    supervisor.stopGate = new Promise((resolve) => {
      release = resolve;
    });
    input.press("s");
    await until(() => output.screen.includes("* running"), "running");
    input.press("x");
    await until(() => supervisor.calls.includes("stop"), "the stop");
    input.press("k");
    input.press("y");
    await until(() => supervisor.calls.includes("kill"), "the kill");

    expect(supervisor.calls).toEqual(["start --no-ui", "stop", "kill"]);

    release();
  });

  it("reports a kill that failed", async () => {
    const { supervisor, input, output } = setup();

    supervisor.killError = new Error("no such process");
    input.press("s");
    await until(() => output.screen.includes("* running"), "running");
    input.press("k");
    input.press("y");
    await until(
      () => output.screen.includes("The server did not die: no such process"),
      "the failure",
    );
  });
});

describe("runConsole data actions", () => {
  function fakeActions(): ConsoleActions & { calls: string[] } {
    const calls: string[] = [];
    const report = (title: string, applicable = false): ActionReport => ({
      title,
      lines: [`${title} says hello`],
      applicable,
    });

    return {
      calls,
      inspect: (width) => {
        calls.push(`inspect ${width}`);

        return report("Inspect");
      },
      backup: (to, width) => {
        calls.push(`backup ${to} ${width}`);

        return report("Backup");
      },
      repair: (apply, width) => {
        calls.push(`repair ${apply} ${width}`);

        return report(apply ? "Repair" : "Repair (dry run)", !apply);
      },
    };
  }

  it("shows an inspection in a panel, sized to the screen", async () => {
    const actions = fakeActions();
    const { input, output } = setup(["--no-ui"], {
      directory: "./data",
      actions,
    });

    input.press("i");
    await until(
      () => output.screen.includes("Inspect says hello"),
      "the panel",
    );

    expect(actions.calls).toEqual(["inspect 76"]);

    input.press(undefined, { name: "escape" });
    await until(
      () => !output.screen.includes("Inspect says hello"),
      "the panel to close",
    );
  });

  it("asks where to back up, then backs up there", async () => {
    const actions = fakeActions();
    const { input, output } = setup(["--no-ui"], {
      directory: "./data",
      actions,
    });

    input.press("b");
    await until(
      () => output.screen.includes("Back up to: ./data-backup-"),
      "the prompt",
    );

    for (let index = 0; index < 60; index += 1) {
      input.press(undefined, backspace);
    }

    typeText(input, "/tmp/copy");
    input.press("\r", enter);
    await until(() => output.screen.includes("Backup says hello"), "the panel");

    expect(actions.calls).toEqual(["backup /tmp/copy 76"]);
  });

  it("shows a repair plan, and applies it after a yes", async () => {
    const actions = fakeActions();
    const { input, output } = setup(["--no-ui"], {
      directory: "./data",
      actions,
    });

    input.press("r");
    await until(
      () => output.screen.includes("Repair (dry run) says hello"),
      "the plan",
    );
    input.press("a");
    await until(
      () => output.screen.includes("? Apply the repair steps? [y/N]"),
      "the question",
    );

    expect(actions.calls).toEqual(["repair false 76"]);

    input.press("y");
    await until(
      () => output.screen.includes("Repair says hello"),
      "the result",
    );

    expect(actions.calls).toEqual(["repair false 76", "repair true 76"]);
  });

  it("uses a narrower width on a narrower screen", async () => {
    const actions = fakeActions();
    const { input, output } = setup(["--no-ui"], {
      directory: "./data",
      actions,
    });

    output.columns = 100;
    input.press("i");
    await until(() => actions.calls.length > 0, "the action");

    expect(actions.calls).toEqual(["inspect 96"]);
  });

  it("says there is no data directory when none was given", async () => {
    const { input, output } = setup();

    input.press("i");
    await until(
      () => output.screen.includes("No data directory set"),
      "the notice",
    );
  });
});
