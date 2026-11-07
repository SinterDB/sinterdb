import { describe, expect, it } from "vitest";

import { ConsoleModel, type ConsoleKey } from "./console-model.js";
import {
  formatDuration,
  formatUptime,
  lineText,
  renderConsole,
} from "./console-render.js";
import { clock, type LogEntry, type LogLevel } from "./logger.js";
import { COLOR_STYLE, PLAIN_STYLE, stripAnsi, visibleLength } from "./style.js";
import { SupervisorState } from "./supervisor.js";

const NOW = 5_000_000;
const ADDRESS = { host: "127.0.0.1", port: 4721, pid: 1234 };

function create(columns = 60, rows = 16): ConsoleModel {
  const model = new ConsoleModel({ version: "0.3.5", now: () => NOW });

  model.setSize(columns, rows);

  return model;
}

function log(
  message: string,
  level: LogLevel = "info",
  event = "operation",
  details?: Record<string, unknown>,
  timestamp = "2026-01-01T10:00:00.000Z",
): LogEntry {
  return {
    timestamp,
    level,
    event,
    message,
    ...(details === undefined ? {} : { details }),
  };
}

const type = (text: string): ConsoleKey => ({
  name: text.toLowerCase(),
  text,
  ctrl: false,
});

function plain(model: ConsoleModel): string[] {
  return renderConsole(model.snapshot(), PLAIN_STYLE);
}

/** Row numbers counted from the bottom of a screen. */
const fromBottom = (lines: readonly string[], offset: number): string =>
  lines[lines.length - offset] ?? "";

describe("renderConsole", () => {
  it("draws the whole console in a box", () => {
    const model = create();

    model.setServerState(SupervisorState.Running, ADDRESS);
    model.addLog(
      log("SinterDB server is listening.", "info", "server.started", {
        storage: "disk",
        dataDirectory: "./data/app.db",
      }),
    );
    model.addLog(
      log("insertOne app.users", "info", "operation", {
        durationMs: 2,
        ok: true,
      }),
    );
    model.addLog(
      log(
        "find app.users",
        "warn",
        "operation",
        { durationMs: 212, ok: false, error: "bad filter" },
        "2026-01-01T10:00:01.000Z",
      ),
    );

    const row = (text: string): string => `| ${text}`.padEnd(59) + "|";
    const first = clock("2026-01-01T10:00:00.000Z");
    const second = clock("2026-01-01T10:00:01.000Z");

    expect(plain(model)).toEqual([
      `+${"-".repeat(58)}+`,
      "| SinterDB v0.3.5   * running   :4721   ./data/app.db      |",
      `+${"-".repeat(58)}+`,
      "| Uptime 00:00:00   Conns 0   Ops/s 0.4   Cmds 2   Failed 1|",
      "+- Logs -------------------------------- [follow] [all v] -+",
      row(`${first} INFO  SinterDB server is listening.`),
      row(`${first} INFO  insertOne app.users  2ms`),
      row(`${second} WARN  find app.users  212ms  bad filter`),
      `|${" ".repeat(58)}|`,
      `|${" ".repeat(58)}|`,
      `+${"-".repeat(58)}+`,
      "| [Help ?] [Inspect i] [Backup b] [Repair r]               |",
      "| [Pause p] [Filter /] [Restart s] [Quit q]                |",
      `+${"-".repeat(58)}+`,
      "| > type a command...   press : to type                    |",
      `+${"-".repeat(58)}+`,
    ]);
  });

  it("uses box-drawing characters when unicode is allowed", () => {
    const lines = renderConsole(create().snapshot(), COLOR_STYLE).map(
      stripAnsi,
    );

    expect(lines[0]).toBe(`┌${"─".repeat(58)}┐`);
    expect(lines[2]).toBe(`├${"─".repeat(58)}┤`);
    expect(lines[1]?.startsWith("│")).toBe(true);
    expect(lines[1]?.endsWith("│")).toBe(true);
    expect(lines[4]).toBe(`├─ Logs ${"─".repeat(32)} [follow] [all ▾] ─┤`);
    expect(fromBottom(lines, 1)).toBe(`└${"─".repeat(58)}┘`);
    expect(fromBottom(lines, 2)).toContain("type a command…");
    expect(lines[1]).toContain("● stopped");
  });

  it("draws exactly the rows asked for, none wider than the columns", () => {
    for (const [columns, rows] of [
      [60, 16],
      [80, 24],
      [120, 40],
      [200, 60],
    ] as const) {
      const model = create(columns, rows);

      model.setServerState(SupervisorState.Running, ADDRESS);

      for (let index = 0; index < 100; index += 1) {
        model.addLog(log(`message ${index} ${"x".repeat(index * 3)}`));
      }

      for (const style of [PLAIN_STYLE, COLOR_STYLE]) {
        const lines = renderConsole(model.snapshot(), style);

        expect(lines).toHaveLength(rows);

        for (const line of lines) {
          expect(visibleLength(line)).toBe(columns);
        }
      }
    }
  });

  it("says when the terminal is too small", () => {
    const lines = plain(create(40, 10));

    expect(lines).toHaveLength(10);
    expect(lines[0]).toBe("Terminal too small");
    expect(lines[1]).toBe("Needs 60x16, this is 40x10");
    expect(lines[2]).toBe("Make it larger, or press q to quit");
  });

  it("still fits a tiny terminal", () => {
    const lines = plain(create(10, 3));

    expect(lines).toHaveLength(3);

    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(10);
    }
  });

  it("draws at the smallest size it supports", () => {
    const lines = plain(create(60, 16));

    expect(lines).toHaveLength(16);
    expect(lines[0]).toBe(`+${"-".repeat(58)}+`);
    expect(lines[1]).toContain("SinterDB v0.3.5");
  });
});

describe("renderConsole header", () => {
  const header = (model: ConsoleModel): string => plain(model)[1] ?? "";

  it("shows each server state", () => {
    for (const [state, word] of [
      ["stopped", "stopped"],
      ["starting", "starting"],
      ["running", "running"],
      ["stopping", "stopping"],
      ["crashed", "crashed"],
    ] as const) {
      const model = create();

      model.setServerState(state, ADDRESS);

      expect(header(model)).toContain(`* ${word}`);
    }
  });

  it("shows the address without the host when it is this machine", () => {
    for (const host of ["127.0.0.1", "localhost", "::1"]) {
      const model = create();

      model.setServerState(SupervisorState.Running, { ...ADDRESS, host });

      expect(header(model)).toContain("* running   :4721");
    }
  });

  it("shows the host when the server listens on another address", () => {
    const model = create();

    model.setServerState(SupervisorState.Running, {
      ...ADDRESS,
      host: "0.0.0.0",
    });

    expect(header(model)).toContain("* running   0.0.0.0:4721");
  });

  it("shows where the data is kept only while the server is up", () => {
    const model = create();

    model.setServerState(SupervisorState.Running, ADDRESS);
    model.addLog(log("up", "info", "server.started", { storage: "memory" }));

    expect(header(model)).toContain(":4721   in memory");

    model.setServerState(SupervisorState.Stopped);

    expect(header(model)).not.toContain("in memory");
  });

  it("shows how a crashed server ended", () => {
    const model = create();

    model.setServerState(SupervisorState.Running, ADDRESS);
    model.setServerState(SupervisorState.Crashed);
    model.setExit({ code: 3, signal: null, expected: false });

    expect(header(model)).toContain("* crashed   exited with code 3");
  });

  it("colors the state", () => {
    const model = create();

    model.setServerState(SupervisorState.Running, ADDRESS);

    const colored = renderConsole(model.snapshot(), COLOR_STYLE)[1] ?? "";

    expect(colored).toContain(COLOR_STYLE.green("   ● running"));
  });

  it("cuts a header that is too long and marks the cut", () => {
    const model = create();

    model.setServerState(SupervisorState.Running, ADDRESS);
    model.addLog(
      log("up", "info", "server.started", {
        dataDirectory: "/a/very/long/path/".repeat(5),
      }),
    );

    const line = header(model);

    expect(line).toHaveLength(60);
    expect(line).toContain("~|");
  });
});

describe("renderConsole stats", () => {
  const stats = (model: ConsoleModel): string => plain(model)[3] ?? "";

  it("shows counters, the rate and the uptime", () => {
    const model = create(80, 16);

    model.setServerState(SupervisorState.Running, ADDRESS);

    for (let index = 0; index < 1234; index += 1) {
      model.addLog(
        log("op", index === 0 ? "warn" : "info", "operation", {
          ok: index !== 0,
        }),
      );
    }

    model.addLog(log("c", "info", "connection.opened", { id: 1, active: 7 }));

    expect(stats(model)).toBe(
      `| Uptime 00:00:00   Conns 7   Ops/s 247   Cmds 1,234   Failed 1${" ".repeat(16)}|`,
    );
  });

  it("shows a rate of exactly ten a second without a decimal", () => {
    const model = create();

    for (let index = 0; index < 50; index += 1) {
      model.addLog(log("op"));
    }

    expect(stats(model)).toContain("Ops/s 10 ");
  });

  it("shows a dash before the server is up", () => {
    expect(stats(create())).toContain("Uptime -");
  });

  it("colors the failed count only when something failed", () => {
    const none = create();
    const some = create();

    some.addLog(log("op", "warn", "operation", { ok: false }));

    const paint = (model: ConsoleModel): string =>
      renderConsole(model.snapshot(), COLOR_STYLE)[3] ?? "";

    expect(paint(none)).not.toContain(COLOR_STYLE.yellow("0"));
    expect(paint(some)).toContain(COLOR_STYLE.yellow("1"));
  });

  it("formats uptime", () => {
    expect(formatUptime(0)).toBe("00:00:00");
    expect(formatUptime(3_725_000)).toBe("01:02:05");
    expect(formatUptime(86_400_000 + 3_725_000)).toBe("1d 01:02:05");
  });
});

describe("renderConsole log", () => {
  const title = (model: ConsoleModel): string => plain(model)[4] ?? "";

  it("says whether the pane follows, is paused or is scrolled", () => {
    const model = create();

    expect(title(model)).toContain("[follow] [all v]");

    for (let index = 0; index < 20; index += 1) {
      model.addLog(log(`line ${index}`));
    }

    model.handleKey({ name: "up", ctrl: false });

    expect(title(model)).toContain("[up 1] [all v]");

    model.handleKey({ name: "up", ctrl: false });

    expect(title(model)).toContain("[up 2] [all v]");

    model.handleKey({ name: "end", ctrl: false });
    model.handleKey(type("p"));
    model.addLog(log("while paused"));

    expect(title(model)).toContain("[paused +1] [all v]");
  });

  it("shows the level and the filter text", () => {
    const model = create();

    model.handleKey(type("l"));

    expect(title(model)).toContain("[warn v]");

    model.handleKey(type("/"));

    for (const letter of "a-very-long-filter-text") {
      model.handleKey(type(letter));
    }

    model.handleKey({ name: "return", ctrl: false });

    expect(title(model)).toContain("[/a-very-long-f~] [warn v]");
  });

  it("shows a filter of exactly the longest length in full", () => {
    const model = create();

    model.handleKey(type("/"));

    for (const letter of "fourteen-chars") {
      model.handleKey(type(letter));
    }

    model.handleKey({ name: "return", ctrl: false });

    expect(title(model)).toContain("[/fourteen-chars] [all v]");
  });

  it("keeps the title the width of the screen", () => {
    for (const columns of [60, 80, 120]) {
      expect(title(create(columns, 16))).toHaveLength(columns);
    }
  });

  it("colors levels and keeps the same text", () => {
    const model = create();

    model.addLog(log("fine", "info"));
    model.addLog(log("careful", "warn"));
    model.addLog(log("broken", "error"));

    const colored = renderConsole(model.snapshot(), COLOR_STYLE).slice(5, 8);
    const text = renderConsole(model.snapshot(), PLAIN_STYLE).slice(5, 8);

    expect(
      colored
        .map(stripAnsi)
        .map((line) => line.replaceAll("─", "-").replaceAll("│", "|")),
    ).toEqual(text);
    expect(colored[0]).toContain(COLOR_STYLE.cyan("INFO "));
    expect(colored[1]).toContain(COLOR_STYLE.yellow("WARN "));
    expect(colored[2]).toContain(COLOR_STYLE.bold(COLOR_STYLE.red("ERROR")));
  });

  it("cuts a long line and marks the cut", () => {
    const model = create();

    model.addLog(log("x".repeat(200)));

    const line = plain(model)[5] ?? "";

    expect(line).toHaveLength(60);
    expect(line.endsWith("~|")).toBe(true);
  });

  it("shows only the newest lines that fit", () => {
    const model = create();

    for (let index = 1; index <= 9; index += 1) {
      model.addLog(log(`line ${index}`));
    }

    const lines = plain(model).slice(5, 10).join("\n");

    expect(lines).not.toContain("line 4 ");
    expect(lines).toContain("line 5 ");
    expect(lines).toContain("line 9 ");
  });
});

describe("lineText", () => {
  it("shows a command and how long it took", () => {
    expect(
      lineText(
        log("insertOne app.users", "info", "operation", { durationMs: 2.04 }),
      ),
    ).toEqual(["insertOne app.users", "2ms"]);
  });

  it("adds the error of a failed command", () => {
    expect(
      lineText(
        log("find app.users", "warn", "operation", {
          durationMs: 212,
          error: "bad filter",
        }),
      ),
    ).toEqual(["find app.users", "212ms  bad filter"]);
  });

  it("shortens connection events", () => {
    expect(
      lineText(
        log("Connection #3 opened.", "info", "connection.opened", { id: 3 }),
      ),
    ).toEqual(["conn #3 opened", ""]);
    expect(
      lineText(
        log("Connection #3 closed.", "info", "connection.closed", { id: 3 }),
      ),
    ).toEqual(["conn #3 closed", ""]);
  });

  it("falls back to the message when the details are missing", () => {
    expect(
      lineText(log("Connection opened.", "info", "connection.opened")),
    ).toEqual(["Connection opened.", ""]);
    expect(lineText(log("find app.users", "info", "operation"))).toEqual([
      "find app.users",
      "",
    ]);
    expect(lineText(log("plain", "info", "console"))).toEqual(["plain", ""]);
  });

  it("shows the message of an error object, or a string error", () => {
    expect(
      lineText(
        log("lost", "warn", "connection.error", {
          error: { name: "E", message: "reset" },
        }),
      ),
    ).toEqual(["lost", "reset"]);
    expect(
      lineText(log("lost", "warn", "x", { error: { name: "E" } })),
    ).toEqual(["lost", ""]);
    expect(lineText(log("lost", "warn", "x", { error: "gone" }))).toEqual([
      "lost",
      "gone",
    ]);
  });
});

describe("formatDuration", () => {
  it("picks a readable unit", () => {
    expect(formatDuration(0.04)).toBe("0ms");
    expect(formatDuration(0.44)).toBe("0.4ms");
    expect(formatDuration(2)).toBe("2ms");
    expect(formatDuration(9.96)).toBe("10ms");
    expect(formatDuration(212.4)).toBe("212ms");
    expect(formatDuration(999)).toBe("999ms");
    expect(formatDuration(1000)).toBe("1.0s");
    expect(formatDuration(1500)).toBe("1.5s");
  });
});

describe("renderConsole buttons", () => {
  const buttons = (model: ConsoleModel): string[] => {
    const lines = plain(model);

    return [fromBottom(lines, 5), fromBottom(lines, 4)];
  };

  it("shows the two rows of buttons", () => {
    expect(buttons(create())).toEqual([
      "| [Help ?] [Inspect i] [Backup b] [Repair r]               |",
      "| [Pause p] [Filter /] [Start s] [Quit q]                  |",
    ]);
  });

  it("says Restart while the server runs", () => {
    const model = create();

    model.setServerState(SupervisorState.Running, ADDRESS);

    expect(buttons(model)[1]).toContain("[Restart s]");
  });

  it("dims the start button while the server is between states", () => {
    for (const state of [SupervisorState.Starting, SupervisorState.Stopping]) {
      const model = create();

      model.setServerState(state);

      const line =
        fromBottom(renderConsole(model.snapshot(), COLOR_STYLE), 4) ?? "";

      expect(line).toContain(COLOR_STYLE.dim("s"));
      expect(line).not.toContain(COLOR_STYLE.bold(COLOR_STYLE.cyan("s")));
    }

    const stopped = create();

    expect(
      fromBottom(renderConsole(stopped.snapshot(), COLOR_STYLE), 4),
    ).toContain(COLOR_STYLE.bold(COLOR_STYLE.cyan("s")));
  });

  it("labels the pause button for what it will do", () => {
    const model = create();

    expect(buttons(model)[1]).toContain("[Pause p]");

    model.handleKey(type("p"));

    expect(buttons(model)[1]).toContain("[Resume p]");
  });
});

describe("renderConsole prompt", () => {
  const promptLine = (model: ConsoleModel): string =>
    fromBottom(plain(model), 2);

  it("shows the hint, a notice, and what is being typed", () => {
    const model = create();

    expect(promptLine(model)).toBe(
      "| > type a command...   press : to type                    |",
    );

    model.handleKey(type("x"));

    expect(promptLine(model)).toBe(
      `| > The server is not running.${" ".repeat(29)}|`,
    );

    model.handleKey(type("/"));
    model.handleKey(type("a"));

    expect(promptLine(model)).toBe(
      `| / a_   enter applies, esc cancels${" ".repeat(24)}|`,
    );

    model.handleKey({ name: "escape", ctrl: false });
    model.handleKey(type(":"));
    model.handleKey(type("s"));

    expect(promptLine(model)).toBe(`| > s_${" ".repeat(53)}|`);
  });

  it("uses a block cursor when unicode is allowed", () => {
    const model = create();

    model.handleKey(type(":"));

    expect(
      stripAnsi(fromBottom(renderConsole(model.snapshot(), COLOR_STYLE), 2)),
    ).toContain("> █");
  });
});

describe("renderConsole help panel", () => {
  it("replaces the log and says how to close it", () => {
    const model = create(80, 24);

    model.addLog(log("hidden behind the panel"));
    model.handleKey(type("?"));

    const lines = plain(model);

    expect(lines[5]).toContain(" Help");
    expect(lines[6]).toContain("s  start or restart");
    expect(lines.join("\n")).not.toContain("hidden behind the panel");
    expect(lines[17]).toContain("esc closes, up/down scrolls 1-11 of 13");
    expect(lines).toHaveLength(24);
  });

  it("cuts the panel to fit, and keeps the line that closes it", () => {
    const model = create(60, 16);

    model.handleKey(type("?"));

    const lines = plain(model);

    expect(lines).toHaveLength(16);
    expect(lines[5]).toContain(" Help");
    expect(lines[9]).toContain("esc closes, up/down scrolls 1-3 of 13");
    expect(lines[10]).toBe(`+${"-".repeat(58)}+`);
  });
});

describe("renderConsole panels and prompts", () => {
  const withData = (columns = 60, rows = 16): ConsoleModel => {
    const model = new ConsoleModel({
      version: "0.3.5",
      now: () => NOW,
      dataDir: "./data",
    });

    model.setSize(columns, rows);

    return model;
  };

  it("shows a report with its title and hint", () => {
    const model = withData(80, 24);

    model.showReport({ title: "Inspect", lines: ["first line", "second"] });

    const lines = plain(model);

    expect(lines[5]).toBe(`| Inspect${" ".repeat(70)}|`);
    expect(lines[6]).toBe(`| first line${" ".repeat(67)}|`);
    expect(lines[7]).toBe(`| second${" ".repeat(71)}|`);
    expect(lines[17]).toBe(`| esc closes${" ".repeat(67)}|`);
    expect(lines).toHaveLength(24);
  });

  it("cuts report lines wider than the panel", () => {
    const model = withData();

    model.showReport({ title: "Inspect", lines: ["x".repeat(200)] });

    const line = plain(model)[6] ?? "";

    expect(line).toHaveLength(60);
    expect(line.endsWith("~|")).toBe(true);
  });

  it("styles the panel title and hint", () => {
    const model = withData();

    model.showReport({ title: "Inspect", lines: ["body"] });

    const lines = renderConsole(model.snapshot(), COLOR_STYLE);

    expect(lines[5]).toContain(COLOR_STYLE.bold(" Inspect"));
    expect(lines[9]).toContain(COLOR_STYLE.dim(" esc closes"));
  });

  it("asks a confirmation with the default answer shown", () => {
    const model = withData();

    model.setServerState(SupervisorState.Running, ADDRESS);
    model.handleKey(type("k"));

    expect(fromBottom(plain(model), 2)).toBe(
      `| ? Kill the server without a clean shutdown? [y/N]${" ".repeat(8)}|`,
    );

    const colored = renderConsole(model.snapshot(), COLOR_STYLE);

    expect(fromBottom(colored, 2)).toContain(
      COLOR_STYLE.yellow("Kill the server without a clean shutdown?"),
    );
    expect(fromBottom(colored, 2)).toContain(COLOR_STYLE.dim(" [y/N]"));
  });

  it("styles the backup prompt", () => {
    const model = withData();

    model.handleKey(type("b"));

    expect(
      fromBottom(renderConsole(model.snapshot(), COLOR_STYLE), 2),
    ).toContain(COLOR_STYLE.bold(" Back up to: "));
  });

  it("shows the backup prompt with the suggested name", () => {
    const model = withData();

    model.handleKey(type("b"));

    expect(fromBottom(plain(model), 2)).toBe(
      "| Back up to: ./data-backup-19700101-012320_" + " ".repeat(15) + "|",
    );
  });
});
