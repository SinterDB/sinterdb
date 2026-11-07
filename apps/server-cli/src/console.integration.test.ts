import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventEmitter } from "node:events";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { createConsoleActions } from "./console-actions.js";
import { runConsole } from "./console-terminal.js";
import { PLAIN_STYLE, stripAnsi } from "./style.js";
import { ServerSupervisor } from "./supervisor.js";

// The console against the real built `sinterd`, with a fake terminal. `pnpm
// build` must have run first, because the supervisor starts the file in dist.

const CLI = fileURLToPath(new URL("../dist/index.js", import.meta.url));

beforeAll(() => {
  if (!existsSync(CLI)) {
    throw new Error("The server CLI is not built. Run `pnpm build` first.");
  }
});

class Terminal extends EventEmitter {
  public columns = 100;
  public rows = 30;
  public readonly writes: string[] = [];

  public write(text: string): void {
    this.writes.push(text);
  }

  public setRawMode(): void {
    // A fake terminal has no mode to change.
  }

  public resume(): void {
    // Nothing is paused.
  }

  public pause(): void {
    // Nothing is paused.
  }

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

async function until(check: () => boolean, what: string): Promise<void> {
  const end = Date.now() + 15_000;

  while (!check()) {
    if (Date.now() > end) {
      throw new Error(`Timed out waiting for ${what}.`);
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

describe("the console with a real server", () => {
  it("starts the server, shows its log, restarts it and stops it on quit", async () => {
    const terminal = new Terminal();
    const supervisor = new ServerSupervisor({
      command: [process.execPath, CLI],
    });
    const finished = runConsole({
      supervisor,
      serverArguments: ["--no-ui", "--port", "0"],
      input: terminal,
      output: terminal,
      style: PLAIN_STYLE,
      version: "test",
      signals: new EventEmitter(),
    });
    const press = (text: string): boolean =>
      terminal.emit("keypress", text, { sequence: text });

    await until(() => terminal.screen.includes("* stopped"), "the first frame");
    press("s");
    await until(() => terminal.screen.includes("* running"), "running");

    const first = supervisor.address?.pid;

    expect(first).toBeTypeOf("number");
    expect(terminal.screen).toContain("SinterDB server is listening.");
    expect(terminal.screen).toMatch(/\* running\s+:\d+/);

    press("s");
    await until(
      () => supervisor.state === "running" && supervisor.address?.pid !== first,
      "the restarted server",
    );
    await until(
      () => terminal.screen.includes("stopped cleanly"),
      "the stop line",
    );

    const second = supervisor.address?.pid as number;

    press("q");
    press("y");
    await finished;

    expect(supervisor.state).toBe("stopped");
    expect(() => process.kill(second, 0)).toThrow();
    expect(terminal.writes.at(-1)).toBe("\u001B[?25h\u001B[?1049l");
  }, 30_000);

  it("inspects, backs up and kills with a real data directory", async () => {
    const root = mkdtempSync(join(tmpdir(), "sinterd-console-"));
    const data = join(root, "data");
    const backup = join(root, "backup");
    const terminal = new Terminal();
    const supervisor = new ServerSupervisor({
      command: [process.execPath, CLI],
    });
    const finished = runConsole({
      supervisor,
      serverArguments: ["--no-ui", "--port", "0", "--data-dir", data],
      input: terminal,
      output: terminal,
      style: PLAIN_STYLE,
      version: "test",
      data: { directory: data, actions: createConsoleActions(data) },
      signals: new EventEmitter(),
    });
    const press = (text: string | undefined, name?: string): boolean =>
      terminal.emit("keypress", text, {
        sequence: text,
        ...(name === undefined ? {} : { name }),
      });

    try {
      await until(() => terminal.screen.includes("* stopped"), "the frame");
      press("s");
      await until(() => terminal.screen.includes("* running"), "running");

      // Inspect works while the server runs.
      press("i");
      await until(
        () => terminal.screen.includes("SinterDB data directory"),
        "the inspection",
      );
      press(undefined, "escape");

      // Backup and repair need it stopped.
      press("b");
      await until(
        () =>
          terminal.screen.includes("Stop the server first (x), then back up."),
        "the refusal",
      );

      press("x");
      await until(() => terminal.screen.includes("* stopped"), "stopped");
      press("b");
      await until(() => terminal.screen.includes("Back up to:"), "the prompt");

      for (let index = 0; index < 200; index += 1) {
        press(undefined, "backspace");
      }

      for (const character of backup) {
        press(character);
      }

      press("\r", "return");
      await until(
        () => terminal.screen.includes("Backup written to"),
        "the backup",
      );
      expect(existsSync(join(backup, "manifest.json"))).toBe(true);
      press(undefined, "escape");

      press("r");
      await until(
        () => terminal.screen.includes("Nothing to repair"),
        "the repair plan",
      );
      press(undefined, "escape");

      press("s");
      await until(() => terminal.screen.includes("* running"), "running again");

      const pid = supervisor.address?.pid as number;

      press("k");
      press("y");
      await until(() => terminal.screen.includes("* stopped"), "killed");

      expect(() => process.kill(pid, 0)).toThrow();

      press("q");
      await finished;
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);
});
