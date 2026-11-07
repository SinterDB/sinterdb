import { describe, expect, it } from "vitest";

import {
  CHROME_ROWS,
  CONSOLE_HELP_LINES,
  ConsoleModel,
  RATE_WINDOW_MS,
  describeExit,
  type ConsoleEffect,
  type ConsoleKey,
} from "./console-model.js";
import type { LogEntry, LogLevel } from "./logger.js";
import { SupervisorState } from "./supervisor.js";

let clock = 1_000_000;

function create(rows = 24, capacity?: number): ConsoleModel {
  clock = 1_000_000;

  const model = new ConsoleModel({
    version: "9.9.9",
    now: () => clock,
    ...(capacity === undefined ? {} : { logCapacity: capacity }),
  });

  model.setSize(100, rows);

  return model;
}

function log(
  message: string,
  level: LogLevel = "info",
  event = "test",
  details?: Record<string, unknown>,
): LogEntry {
  return {
    timestamp: "2026-01-01T00:00:00.000Z",
    level,
    event,
    message,
    ...(details === undefined ? {} : { details }),
  };
}

const press = (name: string, ctrl = false): ConsoleKey => ({ name, ctrl });
const type = (text: string): ConsoleKey => ({
  name: text.toLowerCase(),
  text,
  ctrl: false,
});

function typeAll(model: ConsoleModel, text: string): void {
  for (const character of text) {
    model.handleKey(type(character));
  }
}

const ADDRESS = { host: "127.0.0.1", port: 4721, pid: 42 };

describe("ConsoleModel server state", () => {
  it("starts stopped with empty counters", () => {
    const snapshot = create().snapshot();

    expect(snapshot).toMatchObject({
      version: "9.9.9",
      server: "stopped",
      commands: 0,
      failed: 0,
      active: 0,
      opsPerSecond: 0,
      paused: false,
      level: "all",
      search: "",
      mode: "normal",
      offset: 0,
    });
    expect(snapshot.address).toBeUndefined();
    expect(snapshot.uptimeMs).toBeUndefined();
  });

  it("tracks the address and uptime while the server runs", () => {
    const model = create();

    model.setServerState(SupervisorState.Starting);
    model.setServerState(SupervisorState.Running, ADDRESS);
    clock += 65_000;

    expect(model.snapshot()).toMatchObject({
      server: "running",
      address: ADDRESS,
      uptimeMs: 65_000,
    });
  });

  it("keeps the address while stopping, and drops it once stopped", () => {
    const model = create();

    model.setServerState(SupervisorState.Running, ADDRESS);
    model.setServerState(SupervisorState.Stopping);

    expect(model.snapshot().address).toEqual(ADDRESS);

    model.setServerState(SupervisorState.Stopped);

    expect(model.snapshot().address).toBeUndefined();
    expect(model.snapshot().uptimeMs).toBeUndefined();
  });

  it("restarts the uptime for each run", () => {
    const model = create();

    model.setServerState(SupervisorState.Running, ADDRESS);
    clock += 10_000;
    model.setServerState(SupervisorState.Stopped);
    clock += 5000;
    model.setServerState(SupervisorState.Running, ADDRESS);
    clock += 2000;

    expect(model.snapshot().uptimeMs).toBe(2000);
  });

  it("does not move the start time when the state repeats", () => {
    const model = create();

    model.setServerState(SupervisorState.Running, ADDRESS);
    clock += 3000;
    model.setServerState(SupervisorState.Running, ADDRESS);

    expect(model.snapshot().uptimeMs).toBe(3000);
  });

  it("stops the uptime when the server crashes", () => {
    const model = create();

    model.setServerState(SupervisorState.Running, ADDRESS);
    model.setServerState(SupervisorState.Crashed);

    expect(model.snapshot().uptimeMs).toBeUndefined();
  });

  it("keeps one log line even in a tiny terminal", () => {
    const model = create(CHROME_ROWS - 3);

    model.addLog(log("a"));
    model.addLog(log("b"));

    expect(model.snapshot().lines.map((item) => item.entry.message)).toEqual([
      "b",
    ]);
  });

  it("clears the counters when a new run starts", () => {
    const model = create();

    model.addLog(log("x", "info", "operation", { ok: false }));
    model.addLog(log("c", "info", "connection.opened", { active: 2 }));
    model.setServerState(SupervisorState.Starting);

    expect(model.snapshot()).toMatchObject({
      commands: 0,
      failed: 0,
      active: 0,
    });
  });

  it("shows how an unexpected exit ended, and not an expected one", () => {
    const model = create();

    model.setServerState(SupervisorState.Crashed);
    model.setExit({ code: 1, signal: null, expected: false });

    expect(model.snapshot().exit).toBe("exited with code 1");

    model.setExit({ code: 0, signal: null, expected: true });

    expect(model.snapshot().exit).toBeUndefined();
  });

  it("clears the exit text when the server starts again", () => {
    const model = create();

    model.setExit({ code: 1, signal: null, expected: false });
    model.setServerState(SupervisorState.Starting);

    expect(model.snapshot().exit).toBeUndefined();
  });

  it("describes exits", () => {
    expect(describeExit({ code: 2, signal: null, expected: false })).toBe(
      "exited with code 2",
    );
    expect(
      describeExit({ code: null, signal: "SIGKILL", expected: false }),
    ).toBe("ended by SIGKILL");
    expect(describeExit({ code: null, signal: null, expected: false })).toBe(
      "exited with code unknown",
    );
  });
});

describe("ConsoleModel counters", () => {
  it("counts commands and failures from operation events", () => {
    const model = create();

    model.addLog(log("a", "info", "operation", { ok: true }));
    model.addLog(log("b", "warn", "operation", { ok: false }));
    model.addLog(log("c", "info", "server.started"));

    expect(model.snapshot()).toMatchObject({ commands: 2, failed: 1 });
  });

  it("does not count an operation without a result as a failure", () => {
    const model = create();

    model.addLog(log("a", "info", "operation"));

    expect(model.snapshot()).toMatchObject({ commands: 1, failed: 0 });
  });

  it("follows the open connections the server reports", () => {
    const model = create();

    model.addLog(log("o", "info", "connection.opened", { active: 3 }));

    expect(model.snapshot().active).toBe(3);

    model.addLog(log("c", "info", "connection.closed", { active: 2 }));

    expect(model.snapshot().active).toBe(2);
  });

  it("ignores a connection event without a count", () => {
    const model = create();

    model.addLog(log("o", "info", "connection.opened", { active: 3 }));
    model.addLog(log("c", "info", "connection.closed", { active: "x" }));

    expect(model.snapshot().active).toBe(3);
  });

  it("averages commands per second over a short window", () => {
    const model = create();

    for (let count = 0; count < 10; count += 1) {
      model.addLog(log("a", "info", "operation", { ok: true }));
    }

    expect(model.snapshot().opsPerSecond).toBe(10 / (RATE_WINDOW_MS / 1000));

    clock += RATE_WINDOW_MS;

    expect(model.snapshot().opsPerSecond).toBe(0);
    expect(model.snapshot().commands).toBe(10);
  });

  it("adds its own notes as console lines", () => {
    const model = create();

    model.note("error", "It broke.");

    expect(model.snapshot().lines[0]?.entry).toMatchObject({
      level: "error",
      event: "console",
      message: "It broke.",
    });
  });
});

describe("ConsoleModel log pane", () => {
  it("shows the newest lines that fit", () => {
    const model = create(CHROME_ROWS + 3);

    for (let index = 1; index <= 5; index += 1) {
      model.addLog(log(`m${index}`));
    }

    expect(model.snapshot().lines.map((item) => item.entry.message)).toEqual([
      "m3",
      "m4",
      "m5",
    ]);
    expect(model.snapshot()).toMatchObject({ matched: 5, total: 5 });
  });

  it("scrolls up and down and back to the newest", () => {
    const model = create(CHROME_ROWS + 3);

    for (let index = 1; index <= 10; index += 1) {
      model.addLog(log(`m${index}`));
    }

    model.handleKey(press("up"));
    model.handleKey(press("up"));

    expect(model.snapshot().offset).toBe(2);
    expect(model.snapshot().lines.map((item) => item.entry.message)).toEqual([
      "m6",
      "m7",
      "m8",
    ]);

    model.handleKey(press("down"));

    expect(model.snapshot().offset).toBe(1);

    model.handleKey(press("end"));

    expect(model.snapshot().offset).toBe(0);
  });

  it("pages by one screen less a line, and jumps to the oldest", () => {
    const model = create(CHROME_ROWS + 4);

    for (let index = 1; index <= 20; index += 1) {
      model.addLog(log(`m${index}`));
    }

    model.handleKey(press("pageup"));

    expect(model.snapshot().offset).toBe(3);

    model.handleKey(press("pagedown"));

    expect(model.snapshot().offset).toBe(0);

    model.handleKey(press("home"));

    expect(model.snapshot().offset).toBe(16);
    expect(model.snapshot().lines[0]?.entry.message).toBe("m1");
  });

  it("does not scroll past the oldest line or below the newest", () => {
    const model = create(CHROME_ROWS + 3);

    for (let index = 1; index <= 4; index += 1) {
      model.addLog(log(`m${index}`));
    }

    for (let count = 0; count < 10; count += 1) {
      model.handleKey(press("up"));
    }

    expect(model.snapshot().offset).toBe(1);

    // One step down from the top moves, however far up it was pushed.
    model.handleKey(press("down"));

    expect(model.snapshot().offset).toBe(0);

    for (let count = 0; count < 10; count += 1) {
      model.handleKey(press("down"));
    }

    expect(model.snapshot().offset).toBe(0);
  });

  it("keeps the view still when lines arrive while scrolled up", () => {
    const model = create(CHROME_ROWS + 3);

    for (let index = 1; index <= 10; index += 1) {
      model.addLog(log(`m${index}`));
    }

    model.handleKey(press("up"));

    const before = model.snapshot().lines.map((item) => item.entry.message);

    model.addLog(log("m11"));
    model.addLog(log("m12"));

    expect(model.snapshot().lines.map((item) => item.entry.message)).toEqual(
      before,
    );
    expect(model.snapshot().offset).toBe(3);
  });

  it("follows again with f", () => {
    const model = create(CHROME_ROWS + 3);

    for (let index = 1; index <= 10; index += 1) {
      model.addLog(log(`m${index}`));
    }

    model.handleKey(press("up"));
    model.handleKey(type("f"));

    expect(model.snapshot().offset).toBe(0);
  });

  it("pauses the pane while lines keep arriving, and resumes", () => {
    const model = create(CHROME_ROWS + 3);

    model.addLog(log("a"));
    model.addLog(log("b"));
    model.handleKey(type("p"));
    model.addLog(log("c"));
    model.addLog(log("d"));

    expect(model.snapshot()).toMatchObject({
      paused: true,
      pendingWhilePaused: 2,
      matched: 2,
    });
    expect(model.snapshot().lines.map((item) => item.entry.message)).toEqual([
      "a",
      "b",
    ]);

    model.handleKey(type("p"));

    expect(model.snapshot()).toMatchObject({
      paused: false,
      pendingWhilePaused: 0,
      matched: 4,
    });
  });

  it("shows the newest lines again when it pauses, and stays put while scrolled", () => {
    const model = create(CHROME_ROWS + 3);

    for (let index = 1; index <= 10; index += 1) {
      model.addLog(log(`m${index}`));
    }

    model.handleKey(press("up"));
    model.handleKey(type("p"));

    expect(model.snapshot().offset).toBe(0);

    model.handleKey(press("up"));
    model.addLog(log("m11"));

    expect(model.snapshot().offset).toBe(1);
    expect(model.snapshot().lines.map((item) => item.entry.message)).toEqual([
      "m7",
      "m8",
      "m9",
    ]);
  });

  it("cycles the level filter and clears the scroll", () => {
    const model = create();

    model.addLog(log("i", "info"));
    model.addLog(log("w", "warn"));
    model.addLog(log("e", "error"));

    model.handleKey(type("l"));

    expect(model.snapshot().level).toBe("warn");
    expect(model.snapshot().lines.map((item) => item.entry.message)).toEqual([
      "w",
      "e",
    ]);

    model.handleKey(type("l"));

    expect(model.snapshot().level).toBe("error");

    model.handleKey(type("l"));

    expect(model.snapshot().level).toBe("all");
  });

  it("clears the log with c", () => {
    const model = create();

    model.addLog(log("a"));
    model.handleKey(type("c"));

    expect(model.snapshot()).toMatchObject({ total: 0, matched: 0 });
  });

  it("caps the lines it keeps", () => {
    const model = create(24, 3);

    for (let index = 1; index <= 10; index += 1) {
      model.addLog(log(`m${index}`));
    }

    expect(model.snapshot().total).toBe(3);
  });
});

describe("ConsoleModel typing", () => {
  it("filters by text with / and enter", () => {
    const model = create();

    model.addLog(log("alpha"));
    model.addLog(log("beta"));
    model.handleKey(type("/"));

    expect(model.snapshot().mode).toBe("filter");

    typeAll(model, "alp");

    expect(model.snapshot().input).toBe("alp");

    model.handleKey(press("return"));

    expect(model.snapshot()).toMatchObject({
      mode: "normal",
      search: "alp",
      matched: 1,
    });
  });

  it("starts the filter prompt with the current filter, and clears it when emptied", () => {
    const model = create();

    model.handleKey(type("/"));
    typeAll(model, "abc");
    model.handleKey(press("return"));
    model.handleKey(type("/"));

    expect(model.snapshot().input).toBe("abc");

    model.handleKey(press("backspace"));
    model.handleKey(press("backspace"));
    model.handleKey(press("backspace"));
    model.handleKey(press("return"));

    expect(model.snapshot().search).toBe("");
  });

  it("cancels typing with escape and keeps the old filter", () => {
    const model = create();

    model.handleKey(type("/"));
    typeAll(model, "abc");
    model.handleKey(press("return"));
    model.handleKey(type("/"));
    typeAll(model, "xyz");
    model.handleKey(press("escape"));

    expect(model.snapshot()).toMatchObject({
      mode: "normal",
      search: "abc",
      input: "",
    });
  });

  it("does not run shortcuts while typing", () => {
    const model = create();

    model.handleKey(type("/"));

    expect(model.handleKey(type("q"))).toBeUndefined();
    expect(model.snapshot().input).toBe("q");
  });

  it("ignores control keys while typing", () => {
    const model = create();

    model.handleKey(type("/"));
    model.handleKey({ name: "a", text: "a", ctrl: true });

    expect(model.snapshot().input).toBe("");
  });

  it("runs commands after :", () => {
    const model = create();

    const run = (text: string): ConsoleEffect | undefined => {
      model.handleKey(type(":"));
      typeAll(model, text);

      return model.handleKey(press("return"));
    };

    expect(run("start")).toEqual({ kind: "start" });
    expect(run("RESTART")).toEqual({ kind: "restart" });
    expect(run("quit")).toEqual({ kind: "quit" });
    expect(run("exit")).toEqual({ kind: "quit" });
    expect(run("")).toBeUndefined();
    expect(run("filter warm up")).toBeUndefined();
    expect(model.snapshot().search).toBe("warm up");
    expect(run("level error")).toBeUndefined();
    expect(model.snapshot().level).toBe("error");
  });

  it("clears the log with the clear command", () => {
    const model = create();

    model.addLog(log("a"));
    model.handleKey(type(":"));
    typeAll(model, "clear");
    model.handleKey(press("return"));

    expect(model.snapshot().total).toBe(0);
  });

  it("explains an unknown command or level", () => {
    const model = create();

    model.handleKey(type(":"));
    typeAll(model, "dance");
    model.handleKey(press("return"));

    expect(model.snapshot().notice).toBe(
      'Unknown command "dance". Press ? for help.',
    );

    model.handleKey(type(":"));
    typeAll(model, "level loud");
    model.handleKey(press("return"));

    expect(model.snapshot().notice).toBe("Level must be all, warn, error.");
  });

  it("clears the notice on the next key", () => {
    const model = create();

    model.handleKey(type(":"));
    typeAll(model, "dance");
    model.handleKey(press("return"));
    model.handleKey(type("p"));

    expect(model.snapshot().notice).toBeUndefined();
  });
});

describe("ConsoleModel server keys", () => {
  const keys = (state: SupervisorState): ConsoleModel => {
    const model = create();

    model.setServerState(state, ADDRESS);

    return model;
  };

  it("starts a stopped or crashed server, and restarts a running one, with s", () => {
    expect(keys("stopped").handleKey(type("s"))).toEqual({ kind: "start" });
    expect(keys("crashed").handleKey(type("s"))).toEqual({ kind: "start" });
    expect(keys("running").handleKey(type("s"))).toEqual({ kind: "restart" });

    const starting = keys("starting");

    expect(starting.handleKey(type("s"))).toBeUndefined();
    expect(starting.snapshot().notice).toBe("The server is already starting.");

    const stopping = keys("stopping");

    expect(stopping.handleKey(type("s"))).toBeUndefined();
    expect(stopping.snapshot().notice).toBe("The server is still stopping.");
  });

  it("refuses to start a running server from the command line", () => {
    const running = keys("running");

    running.handleKey(type(":"));
    typeAll(running, "start");

    expect(running.handleKey(press("return"))).toBeUndefined();
    expect(running.snapshot().notice).toBe("The server is already running.");
  });

  it("stops only a running or starting server", () => {
    expect(keys("running").handleKey(type("x"))).toEqual({ kind: "stop" });
    expect(keys("starting").handleKey(type("x"))).toEqual({ kind: "stop" });

    const stopped = keys("stopped");

    expect(stopped.handleKey(type("x"))).toBeUndefined();
    expect(stopped.snapshot().notice).toBe("The server is not running.");

    const stopping = keys("stopping");

    expect(stopping.handleKey(type("x"))).toBeUndefined();
    expect(stopping.snapshot().notice).toBe("The server is already stopping.");
  });

  it("restarts from the command line unless the server is between states", () => {
    const restart = (state: SupervisorState): ConsoleModel => {
      const model = keys(state);

      model.handleKey(type(":"));
      typeAll(model, "restart");

      return model;
    };

    expect(restart("running").handleKey(press("return"))).toEqual({
      kind: "restart",
    });
    expect(restart("stopped").handleKey(press("return"))).toEqual({
      kind: "restart",
    });
    expect(restart("crashed").handleKey(press("return"))).toEqual({
      kind: "restart",
    });

    const starting = restart("starting");

    expect(starting.handleKey(press("return"))).toBeUndefined();
    expect(starting.snapshot().notice).toBe(
      "Wait for the server to finish first.",
    );
    expect(restart("stopping").handleKey(press("return"))).toBeUndefined();
  });

  it("says when there is no data directory to inspect, back up or repair", () => {
    for (const key of ["i", "b", "r"]) {
      const model = create();

      expect(model.handleKey(type(key))).toBeUndefined();
      expect(model.snapshot().notice).toBe(
        "No data directory set (sinterd config set dataDir).",
      );
    }
  });

  it("shows where the server keeps its data once it has started", () => {
    const model = create();

    model.setServerState("starting");
    model.addLog({
      timestamp: "2026-01-01T10:00:00.000Z",
      level: "info",
      event: "server.started",
      message: "SinterDB server is listening.",
      details: { storage: "disk", dataDirectory: "./data/app.db" },
    });

    expect(model.snapshot().storage).toBe("./data/app.db");

    model.setServerState("starting");

    expect(model.snapshot().storage).toBeUndefined();

    model.addLog({
      timestamp: "2026-01-01T10:00:00.000Z",
      level: "info",
      event: "server.started",
      message: "SinterDB server is listening.",
      details: { storage: "memory" },
    });

    expect(model.snapshot().storage).toBe("in memory");
  });

  it("quits with q and with ctrl-c, even while typing", () => {
    expect(create().handleKey(type("q"))).toEqual({ kind: "quit" });
    expect(create().handleKey(press("c", true))).toEqual({ kind: "quit" });

    const typing = create();

    typing.handleKey(type("/"));

    expect(typing.handleKey(press("c", true))).toEqual({ kind: "quit" });
  });

  it("ignores keys it does not use", () => {
    const model = create();

    expect(model.handleKey(type("z"))).toBeUndefined();
    expect(model.handleKey(press("tab"))).toBeUndefined();
  });
});

describe("ConsoleModel help panel", () => {
  it("opens with ? and closes with escape, q or ?", () => {
    for (const close of [press("escape"), type("q"), type("?")]) {
      const model = create();

      model.handleKey(type("?"));

      expect(model.snapshot().overlay?.title).toBe("Help");
      expect(model.snapshot().overlay?.lines[0]).toBe(CONSOLE_HELP_LINES[0]);
      expect(model.snapshot().overlay?.hint).toBe(
        "esc closes, up/down scrolls 1-11 of 13",
      );

      expect(model.handleKey(close)).toBeUndefined();
      expect(model.snapshot().overlay).toBeUndefined();
    }
  });

  it("opens with the help command", () => {
    const model = create();

    model.handleKey(type(":"));
    typeAll(model, "help");
    model.handleKey(press("return"));

    expect(model.snapshot().overlay?.title).toBe("Help");
  });

  it("ignores other keys while open, but ctrl-c still quits", () => {
    const model = create();

    model.setServerState(SupervisorState.Stopped);
    model.handleKey(type("?"));

    expect(model.handleKey(type("s"))).toBeUndefined();
    expect(model.snapshot().overlay).toBeDefined();
    expect(model.handleKey(press("c", true))).toEqual({ kind: "quit" });
  });
});

function withData(state?: SupervisorState, rows = 24): ConsoleModel {
  clock = 1_000_000;

  const model = new ConsoleModel({
    version: "9.9.9",
    now: () => clock,
    dataDir: "./data/app.db/",
  });

  model.setSize(100, rows);

  if (state !== undefined) {
    model.setServerState(state, ADDRESS);
  }

  return model;
}

describe("ConsoleModel inspect", () => {
  it("asks for an inspection, even while the server runs", () => {
    for (const state of [undefined, SupervisorState.Running]) {
      expect(withData(state).handleKey(type("i"))).toEqual({
        kind: "inspect",
      });
    }
  });

  it("also runs from the command line", () => {
    const model = withData();

    model.handleKey(type(":"));
    typeAll(model, "inspect");

    expect(model.handleKey(press("return"))).toEqual({ kind: "inspect" });
  });
});

describe("ConsoleModel repair", () => {
  it("asks for a dry run when the server is stopped", () => {
    for (const state of [undefined, SupervisorState.Crashed]) {
      expect(withData(state).handleKey(type("r"))).toEqual({
        kind: "repair",
        apply: false,
      });
    }
  });

  it("refuses while the server is up or changing state", () => {
    for (const state of [
      SupervisorState.Starting,
      SupervisorState.Running,
      SupervisorState.Stopping,
    ]) {
      const model = withData(state);

      expect(model.handleKey(type("r"))).toBeUndefined();
      expect(model.snapshot().notice).toBe(
        "Stop the server first (x), then repair.",
      );
    }
  });

  it("also runs from the command line", () => {
    const model = withData();

    model.handleKey(type(":"));
    typeAll(model, "repair");

    expect(model.handleKey(press("return"))).toEqual({
      kind: "repair",
      apply: false,
    });
  });

  it("offers to apply a dry run, after confirming", () => {
    const model = withData();

    model.showReport({
      title: "Repair (dry run)",
      lines: ["Steps it would take"],
      applicable: true,
    });

    expect(model.snapshot().overlay?.hint).toBe(
      "esc closes, a applies the steps",
    );
    expect(model.handleKey(type("a"))).toBeUndefined();
    expect(model.snapshot().confirm).toBe("Apply the repair steps?");
    expect(model.handleKey(type("y"))).toEqual({ kind: "repair", apply: true });
  });

  it("does not offer to apply when no step can be carried out", () => {
    const model = withData();

    model.showReport({ title: "Repair (dry run)", lines: ["Nothing"] });

    expect(model.snapshot().overlay?.hint).toBe("esc closes");
    expect(model.handleKey(type("a"))).toBeUndefined();
    expect(model.snapshot().confirm).toBeUndefined();
  });
});

describe("ConsoleModel backup", () => {
  it("asks where to back up, suggesting a name next to the data", () => {
    const model = withData();

    expect(model.handleKey(type("b"))).toBeUndefined();
    expect(model.inputMode).toBe("backup");
    // The clock is 1,000 seconds after the epoch.
    expect(model.snapshot().input).toBe("./data/app.db-backup-19700101-001640");
  });

  it("runs the backup when enter is pressed", () => {
    const model = withData();

    model.handleKey(type("b"));

    for (let index = 0; index < 100; index += 1) {
      model.handleKey(press("backspace"));
    }

    typeAll(model, "/tmp/copy");

    expect(model.handleKey(press("return"))).toEqual({
      kind: "backup",
      to: "/tmp/copy",
    });
    expect(model.inputMode).toBe("normal");
  });

  it("does not back up to an empty name", () => {
    const model = withData();

    model.handleKey(type("b"));

    for (let index = 0; index < 100; index += 1) {
      model.handleKey(press("backspace"));
    }

    expect(model.handleKey(press("return"))).toBeUndefined();
    expect(model.snapshot().notice).toBe("Type a directory to back up to.");
  });

  it("can be cancelled", () => {
    const model = withData();

    model.handleKey(type("b"));

    expect(model.handleKey(press("escape"))).toBeUndefined();
    expect(model.inputMode).toBe("normal");
  });

  it("backs up at once when the command line names a directory", () => {
    const model = withData();

    model.handleKey(type(":"));
    typeAll(model, "backup /tmp/x y");

    expect(model.handleKey(press("return"))).toEqual({
      kind: "backup",
      to: "/tmp/x y",
    });
  });

  it("asks for a name when the command line gives none", () => {
    const model = withData();

    model.handleKey(type(":"));
    typeAll(model, "backup");
    model.handleKey(press("return"));

    expect(model.inputMode).toBe("backup");
  });

  it("refuses while the server is up or changing state", () => {
    for (const state of [
      SupervisorState.Starting,
      SupervisorState.Running,
      SupervisorState.Stopping,
    ]) {
      const model = withData(state);

      expect(model.handleKey(type("b"))).toBeUndefined();
      expect(model.inputMode).toBe("normal");
      expect(model.snapshot().notice).toBe(
        "Stop the server first (x), then back up.",
      );
    }
  });
});

describe("ConsoleModel kill and quit confirmations", () => {
  it("asks before killing a server, and kills only on y", () => {
    const model = withData(SupervisorState.Running);

    expect(model.handleKey(type("k"))).toBeUndefined();
    expect(model.snapshot().confirm).toBe(
      "Kill the server without a clean shutdown?",
    );
    expect(model.handleKey(type("y"))).toEqual({ kind: "kill" });
    expect(model.snapshot().confirm).toBeUndefined();
  });

  it("accepts a capital Y", () => {
    const model = withData(SupervisorState.Running);

    model.handleKey(type("k"));

    expect(model.handleKey(type("Y"))).toEqual({ kind: "kill" });
  });

  it("does not kill on any other key", () => {
    for (const answer of [
      type("n"),
      press("escape"),
      press("return"),
      type("k"),
      { name: "y", text: "y", ctrl: true } as ConsoleKey,
    ]) {
      const model = withData(SupervisorState.Running);

      model.handleKey(type("k"));

      expect(model.handleKey(answer)).toBeUndefined();
      expect(model.snapshot().confirm).toBeUndefined();
    }
  });

  it("kills a server that is starting or stopping, from the command line too", () => {
    for (const state of [SupervisorState.Starting, SupervisorState.Stopping]) {
      const model = withData(state);

      model.handleKey(type(":"));
      typeAll(model, "kill");
      model.handleKey(press("return"));

      expect(model.snapshot().confirm).toBeDefined();
    }
  });

  it("says there is nothing to kill when the server is not running", () => {
    for (const state of [SupervisorState.Stopped, SupervisorState.Crashed]) {
      const model = withData(state);

      expect(model.handleKey(type("k"))).toBeUndefined();
      expect(model.snapshot().notice).toBe("The server is not running.");
      expect(model.snapshot().confirm).toBeUndefined();
    }
  });

  it("asks before quitting while the server is up or changing state", () => {
    for (const state of [
      SupervisorState.Starting,
      SupervisorState.Running,
      SupervisorState.Stopping,
    ]) {
      for (const quit of [type("q"), press("c", true)]) {
        const model = withData(state);

        expect(model.handleKey(quit)).toBeUndefined();
        expect(model.snapshot().confirm).toBe(
          "Stop the running server and quit?",
        );
        expect(model.handleKey(type("y"))).toEqual({ kind: "quit" });
      }
    }
  });

  it("quits at once when the server is not running", () => {
    for (const state of [SupervisorState.Stopped, SupervisorState.Crashed]) {
      expect(withData(state).handleKey(type("q"))).toEqual({ kind: "quit" });
      expect(withData(state).handleKey(press("c", true))).toEqual({
        kind: "quit",
      });
    }
  });

  it("asks before quitting from the command line too", () => {
    const model = withData(SupervisorState.Running);

    model.handleKey(type(":"));
    typeAll(model, "quit");

    expect(model.handleKey(press("return"))).toBeUndefined();
    expect(model.snapshot().confirm).toBeDefined();
  });

  it("quits on a second ctrl-c while asking to quit", () => {
    const model = withData(SupervisorState.Running);

    model.handleKey(press("c", true));

    expect(model.handleKey(press("c", true))).toEqual({ kind: "quit" });
  });

  it("does not quit on ctrl-c while asking to kill", () => {
    const model = withData(SupervisorState.Running);

    model.handleKey(type("k"));

    expect(model.handleKey(press("c", true))).toBeUndefined();
    expect(model.snapshot().confirm).toBeUndefined();
  });

  it("stops asking once the console is quitting", () => {
    const model = withData(SupervisorState.Stopping);

    model.markQuitting();

    expect(model.handleKey(type("q"))).toEqual({ kind: "quit" });
    expect(model.handleKey(press("c", true))).toEqual({ kind: "quit" });
  });

  it("leaves typing mode when a confirmation starts", () => {
    const model = withData(SupervisorState.Running);

    model.handleKey(type("/"));
    model.handleKey(press("c", true));

    expect(model.inputMode).toBe("normal");
    expect(model.snapshot().confirm).toBeDefined();
  });
});

describe("ConsoleModel report panel", () => {
  const report = (count: number): ConsoleModel => {
    const model = withData(undefined, 16);

    model.showReport({
      title: "Inspect",
      lines: Array.from(
        { length: count },
        (_unused, index) => `line ${index + 1}`,
      ),
    });

    return model;
  };

  it("shows a report in a panel and closes with escape, q or ?", () => {
    for (const close of [press("escape"), type("q"), type("?")]) {
      const model = report(2);

      expect(model.snapshot().overlay).toEqual({
        title: "Inspect",
        lines: ["line 1", "line 2"],
        hint: "esc closes",
      });
      expect(model.handleKey(close)).toBeUndefined();
      expect(model.snapshot().overlay).toBeUndefined();
    }
  });

  it("shows a window of a long report and scrolls it", () => {
    const model = report(10);
    const view = (): string[] => [...(model.snapshot().overlay?.lines ?? [])];

    expect(view()).toEqual(["line 1", "line 2", "line 3"]);
    expect(model.snapshot().overlay?.hint).toBe(
      "esc closes, up/down scrolls 1-3 of 10",
    );

    model.handleKey(press("down"));

    expect(view()).toEqual(["line 2", "line 3", "line 4"]);

    model.handleKey(press("pagedown"));

    expect(view()).toEqual(["line 5", "line 6", "line 7"]);

    model.handleKey(press("end"));

    expect(view()).toEqual(["line 8", "line 9", "line 10"]);

    model.handleKey(press("down"));

    expect(view()).toEqual(["line 8", "line 9", "line 10"]);

    model.handleKey(press("up"));

    expect(view()).toEqual(["line 7", "line 8", "line 9"]);

    model.handleKey(press("pageup"));

    expect(view()).toEqual(["line 4", "line 5", "line 6"]);

    model.handleKey(press("home"));

    expect(view()).toEqual(["line 1", "line 2", "line 3"]);

    model.handleKey(press("up"));

    expect(view()).toEqual(["line 1", "line 2", "line 3"]);
  });

  it("does not scroll a report that fits", () => {
    for (const count of [2, 3]) {
      const model = report(count);

      model.handleKey(press("down"));
      model.handleKey(press("end"));

      expect(model.snapshot().overlay?.lines).toHaveLength(count);
      expect(model.snapshot().overlay?.lines[0]).toBe("line 1");
      expect(model.snapshot().overlay?.hint).toBe("esc closes");
    }
  });

  it("scrolls a report that is one line too long", () => {
    const model = report(4);

    expect(model.snapshot().overlay?.hint).toBe(
      "esc closes, up/down scrolls 1-3 of 4",
    );

    model.handleKey(press("down"));
    model.handleKey(press("down"));

    expect(model.snapshot().overlay?.lines).toEqual([
      "line 2",
      "line 3",
      "line 4",
    ]);
  });

  it("starts at the top again for a new report", () => {
    const model = report(10);

    model.handleKey(press("end"));
    model.showReport({ title: "Again", lines: ["a", "b", "c", "d", "e"] });

    expect(model.snapshot().overlay?.lines).toEqual(["a", "b", "c"]);
  });

  it("starts at the top again after closing and reopening", () => {
    const model = report(10);

    model.handleKey(press("end"));
    model.handleKey(press("escape"));
    model.handleKey(type("?"));

    expect(model.snapshot().overlay?.lines[0]).toBe(CONSOLE_HELP_LINES[0]);
  });

  it("leaves typing mode when a report arrives", () => {
    const model = withData();

    model.handleKey(type("b"));
    model.showReport({ title: "Backup", lines: ["done"] });

    expect(model.inputMode).toBe("normal");
    expect(model.snapshot().input).toBe("");
  });

  it("keeps the same window size as the log pane", () => {
    expect(CHROME_ROWS).toBe(11);
    expect(report(10).snapshot().overlay?.lines).toHaveLength(3);
  });
});
