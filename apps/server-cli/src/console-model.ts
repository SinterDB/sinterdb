import {
  LEVEL_FILTERS,
  LogBuffer,
  matchesFilter,
  type LevelFilter,
  type NumberedEntry,
} from "./log-buffer.js";
import type { LogEntry, LogLevel } from "./logger.js";
import {
  SupervisorState,
  type SupervisorAddress,
  type SupervisorExit,
} from "./supervisor.js";

/** A key press, reduced to what the console needs. */
export interface ConsoleKey {
  /**
   * `up`, `down`, `pageup`, `pagedown`, `home`, `end`, `return`, `escape`,
   * `backspace`, or the lower-case letter for a letter key.
   */
  readonly name: string;
  /** What the key types, when it types something printable. */
  readonly text?: string;
  readonly ctrl: boolean;
}

/** What the console wants done after a key. The terminal code does it. */
export type ConsoleEffect =
  | { readonly kind: "start" }
  | { readonly kind: "stop" }
  | { readonly kind: "restart" }
  | { readonly kind: "quit" };

export type ConsoleMode = "normal" | "filter" | "command";

export interface ConsoleOverlay {
  readonly title: string;
  readonly lines: readonly string[];
}

export const CONSOLE_HELP_LINES: readonly string[] = [
  "s  start or restart    x  stop          q  quit",
  "p  pause or resume     l  cycle level   f  follow",
  "/  filter by text      c  clear         :  command",
  "i  inspect   b  backup   r  repair   (coming soon)",
  "",
  "up down pgup pgdn home   scroll the log",
  "",
  "Commands (after :)",
  "start  stop  restart  quit  clear  help",
  "level all|warn|error   filter [text]",
  "",
  "esc closes this panel or cancels what you are typing.",
];

/** The smallest terminal the console draws in. */
export const MIN_COLUMNS = 60;
export const MIN_ROWS = 16;

/** Rows taken by everything except the log lines. */
export const CHROME_ROWS = 11;

/** Ops per second are averaged over this many milliseconds. */
export const RATE_WINDOW_MS = 5000;

export interface ConsoleModelOptions {
  /** The product version shown in the header. */
  readonly version: string;
  readonly now?: () => number;
  readonly logCapacity?: number;
}

export interface ConsoleSnapshot {
  readonly version: string;
  readonly columns: number;
  readonly rows: number;
  readonly server: SupervisorState;
  readonly address?: SupervisorAddress;
  /** Where the server keeps data: a directory, or `in memory`. */
  readonly storage?: string;
  /** Milliseconds since the server became ready, while it is up. */
  readonly uptimeMs?: number;
  /** How the server ended when it was not asked to stop. */
  readonly exit?: string;
  readonly commands: number;
  readonly failed: number;
  readonly active: number;
  readonly opsPerSecond: number;
  readonly paused: boolean;
  /** Entries that arrived since the pause. */
  readonly pendingWhilePaused: number;
  readonly level: LevelFilter;
  readonly search: string;
  /** Entries that match the filter. */
  readonly matched: number;
  /** Entries held, matching or not. */
  readonly total: number;
  /** Lines the pane is scrolled up from the newest. 0 follows the newest. */
  readonly offset: number;
  readonly lines: readonly NumberedEntry[];
  readonly mode: ConsoleMode;
  readonly input: string;
  readonly notice?: string;
  readonly overlay?: ConsoleOverlay;
}

/**
 * Everything the console knows, with no terminal in it. Supervisor events go
 * in through the `set…` and `addLog` methods, keys go in through
 * {@link ConsoleModel.handleKey}, and {@link ConsoleModel.snapshot} gives
 * what to draw. Tests drive it without a terminal.
 */
export class ConsoleModel {
  private readonly version: string;
  private readonly now: () => number;
  private readonly logs: LogBuffer;

  private columns = 80;
  private rows = 24;
  private server: SupervisorState = SupervisorState.Stopped;
  private address: SupervisorAddress | undefined;
  private storage: string | undefined;
  private startedAt: number | undefined;
  private exitText: string | undefined;
  private commands = 0;
  private failed = 0;
  private active = 0;
  private recent: number[] = [];
  private paused = false;
  private pausedAt = 0;
  private level: LevelFilter = "all";
  private search = "";
  private offset = 0;
  private mode: ConsoleMode = "normal";
  private input = "";
  private notice: string | undefined;
  private overlay: ConsoleOverlay | undefined;

  public constructor(options: ConsoleModelOptions) {
    this.version = options.version;
    this.now = options.now ?? Date.now;
    this.logs = new LogBuffer(options.logCapacity);
  }

  public setSize(columns: number, rows: number): void {
    this.columns = columns;
    this.rows = rows;
  }

  public get serverState(): SupervisorState {
    return this.server;
  }

  public get inputMode(): ConsoleMode {
    return this.mode;
  }

  /** Follows the supervisor. Call it on every `state` event. */
  public setServerState(
    state: SupervisorState,
    address?: SupervisorAddress,
  ): void {
    if (state === SupervisorState.Starting) {
      this.commands = 0;
      this.failed = 0;
      this.active = 0;
      this.recent = [];
      this.exitText = undefined;
      this.storage = undefined;
    }

    if (state === SupervisorState.Running && this.startedAt === undefined) {
      this.startedAt = this.now();
    }

    if (
      state === SupervisorState.Stopped ||
      state === SupervisorState.Crashed
    ) {
      this.startedAt = undefined;
      this.active = 0;
    }

    this.server = state;

    if (state === SupervisorState.Running) {
      this.address = address ?? this.address;
    } else if (state !== SupervisorState.Stopping) {
      this.address = undefined;
    }
  }

  /** Remembers how the server ended, when nobody asked it to stop. */
  public setExit(exit: SupervisorExit): void {
    this.exitText = exit.expected ? undefined : describeExit(exit);
  }

  /** Adds a line from the server and updates the counters. */
  public addLog(entry: LogEntry): void {
    this.logs.push(entry);

    if (entry.event === "server.started") {
      const where = entry.details?.["dataDirectory"];

      this.storage = typeof where === "string" ? where : "in memory";
    }

    if (entry.event === "operation") {
      this.commands += 1;
      this.recent.push(this.now());

      if (entry.details?.["ok"] === false) {
        this.failed += 1;
      }
    }

    if (
      (entry.event === "connection.opened" ||
        entry.event === "connection.closed") &&
      typeof entry.details?.["active"] === "number"
    ) {
      this.active = entry.details["active"];
    }

    if (
      this.offset > 0 &&
      !this.paused &&
      matchesFilter(entry, { level: this.level, search: this.search })
    ) {
      this.offset += 1;
    }
  }

  /** Adds a line written by the console itself, such as a failed start. */
  public note(level: LogLevel, message: string): void {
    this.addLog({
      timestamp: new Date(this.now()).toISOString(),
      level,
      event: "console",
      message,
    });
  }

  public handleKey(key: ConsoleKey): ConsoleEffect | undefined {
    this.notice = undefined;

    if (key.ctrl && key.name === "c") {
      return { kind: "quit" };
    }

    if (this.overlay !== undefined) {
      if (key.name === "escape" || key.text === "q" || key.text === "?") {
        this.overlay = undefined;
      }

      return undefined;
    }

    if (this.mode !== "normal") {
      return this.handleTyping(key);
    }

    switch (key.name) {
      case "up":
        this.scroll(1);
        return undefined;
      case "down":
        this.scroll(-1);
        return undefined;
      case "pageup":
        this.scroll(this.pageSize());
        return undefined;
      case "pagedown":
        this.scroll(-this.pageSize());
        return undefined;
      case "home":
        this.scroll(Number.MAX_SAFE_INTEGER);
        return undefined;
      case "end":
        this.offset = 0;
        return undefined;
    }

    switch (key.text) {
      case "?":
        this.overlay = { title: "Help", lines: CONSOLE_HELP_LINES };
        return undefined;
      case "p":
        this.togglePause();
        return undefined;
      case "l":
        this.cycleLevel();
        return undefined;
      case "f":
        this.offset = 0;
        return undefined;
      case "c":
        this.logs.clear();
        this.offset = 0;
        return undefined;
      case "/":
        this.mode = "filter";
        this.input = this.search;
        return undefined;
      case ":":
        this.mode = "command";
        this.input = "";
        return undefined;
      case "s":
        return this.server === SupervisorState.Running
          ? this.requestRestart()
          : this.requestStart();
      case "x":
        return this.requestStop();
      case "i":
        this.notice = "Inspect is not available yet.";
        return undefined;
      case "b":
        this.notice = "Backup is not available yet.";
        return undefined;
      case "r":
        this.notice = "Repair is not available yet.";
        return undefined;
      case "q":
        return { kind: "quit" };
      default:
        return undefined;
    }
  }

  public snapshot(): ConsoleSnapshot {
    const filter = { level: this.level, search: this.search };
    const upTo = this.paused ? this.pausedAt : undefined;
    const matching = this.logs.view(filter, upTo);
    const height = this.logHeight();
    const offset = Math.min(this.offset, Math.max(0, matching.length - height));
    const end = matching.length - offset;
    const now = this.now();
    const recent = this.recent.filter((time) => now - time < RATE_WINDOW_MS);

    return {
      version: this.version,
      columns: this.columns,
      rows: this.rows,
      server: this.server,
      ...(this.address === undefined ? {} : { address: this.address }),
      ...(this.storage === undefined ? {} : { storage: this.storage }),
      ...(this.startedAt === undefined
        ? {}
        : { uptimeMs: Math.max(0, now - this.startedAt) }),
      ...(this.exitText === undefined ? {} : { exit: this.exitText }),
      commands: this.commands,
      failed: this.failed,
      active: this.active,
      opsPerSecond: recent.length / (RATE_WINDOW_MS / 1000),
      paused: this.paused,
      pendingWhilePaused: this.paused
        ? this.logs.lastNumber - this.pausedAt
        : 0,
      level: this.level,
      search: this.search,
      matched: matching.length,
      total: this.logs.size,
      offset,
      lines: matching.slice(Math.max(0, end - height), end),
      mode: this.mode,
      input: this.input,
      ...(this.notice === undefined ? {} : { notice: this.notice }),
      ...(this.overlay === undefined ? {} : { overlay: this.overlay }),
    };
  }

  private logHeight(): number {
    return Math.max(1, this.rows - CHROME_ROWS);
  }

  private pageSize(): number {
    return Math.max(1, this.logHeight() - 1);
  }

  private scroll(lines: number): void {
    const matching = this.logs.view(
      { level: this.level, search: this.search },
      this.paused ? this.pausedAt : undefined,
    );
    const most = Math.max(0, matching.length - this.logHeight());

    this.offset = Math.max(0, Math.min(most, this.offset + lines));
  }

  private togglePause(): void {
    this.paused = !this.paused;
    this.pausedAt = this.logs.lastNumber;
    this.offset = 0;
  }

  private cycleLevel(): void {
    const next = LEVEL_FILTERS[
      (LEVEL_FILTERS.indexOf(this.level) + 1) % LEVEL_FILTERS.length
    ] as LevelFilter;

    this.setLevel(next);
  }

  private setLevel(level: LevelFilter): void {
    this.level = level;
    this.offset = 0;
  }

  private setSearch(search: string): void {
    this.search = search;
    this.offset = 0;
  }

  private handleTyping(key: ConsoleKey): ConsoleEffect | undefined {
    if (key.name === "escape") {
      this.mode = "normal";
      this.input = "";
      return undefined;
    }

    if (key.name === "backspace") {
      this.input = this.input.slice(0, -1);
      return undefined;
    }

    if (key.name === "return") {
      const text = this.input.trim();
      const mode = this.mode;

      this.mode = "normal";
      this.input = "";

      if (mode === "filter") {
        this.setSearch(text);
        return undefined;
      }

      return this.runCommand(text);
    }

    if (key.text !== undefined && !key.ctrl) {
      this.input += key.text;
    }

    return undefined;
  }

  private runCommand(text: string): ConsoleEffect | undefined {
    const [word = "", ...rest] = text.split(/\s+/);
    const argument = rest.join(" ");

    switch (word.toLowerCase()) {
      case "":
        return undefined;
      case "start":
        return this.requestStart();
      case "stop":
        return this.requestStop();
      case "restart":
        return this.requestRestart();
      case "quit":
      case "exit":
        return { kind: "quit" };
      case "clear":
        this.logs.clear();
        this.offset = 0;
        return undefined;
      case "help":
        this.overlay = { title: "Help", lines: CONSOLE_HELP_LINES };
        return undefined;
      case "filter":
        this.setSearch(argument);
        return undefined;
      case "level":
        if ((LEVEL_FILTERS as readonly string[]).includes(argument)) {
          this.setLevel(argument as LevelFilter);
        } else {
          this.notice = `Level must be ${LEVEL_FILTERS.join(", ")}.`;
        }

        return undefined;
      default:
        this.notice = `Unknown command "${word}". Press ? for help.`;
        return undefined;
    }
  }

  private requestStart(): ConsoleEffect | undefined {
    if (
      this.server === SupervisorState.Stopped ||
      this.server === SupervisorState.Crashed
    ) {
      return { kind: "start" };
    }

    this.notice =
      this.server === SupervisorState.Stopping
        ? "The server is still stopping."
        : this.server === SupervisorState.Starting
          ? "The server is already starting."
          : "The server is already running.";
    return undefined;
  }

  private requestStop(): ConsoleEffect | undefined {
    if (
      this.server === SupervisorState.Running ||
      this.server === SupervisorState.Starting
    ) {
      return { kind: "stop" };
    }

    this.notice =
      this.server === SupervisorState.Stopping
        ? "The server is already stopping."
        : "The server is not running.";
    return undefined;
  }

  private requestRestart(): ConsoleEffect | undefined {
    if (
      this.server === SupervisorState.Starting ||
      this.server === SupervisorState.Stopping
    ) {
      this.notice = "Wait for the server to finish first.";
      return undefined;
    }

    return { kind: "restart" };
  }
}

/** `exited with code 1`, or `ended by SIGKILL`. */
export function describeExit(exit: SupervisorExit): string {
  return exit.signal !== null
    ? `ended by ${exit.signal}`
    : `exited with code ${exit.code ?? "unknown"}`;
}
