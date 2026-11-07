import type { LogEntry } from "./logger.js";

/**
 * Which entries the log pane shows: `all`, `warn` (warnings and errors) or
 * `error` (errors only).
 */
export type LevelFilter = "all" | "warn" | "error";

export const LEVEL_FILTERS: readonly LevelFilter[] = ["all", "warn", "error"];

export interface LogFilter {
  readonly level: LevelFilter;
  /** Entries must contain this text, ignoring case. Empty matches all. */
  readonly search: string;
}

/** A log entry and its place in the order entries arrived. */
export interface NumberedEntry {
  /** 1 for the first entry ever pushed. It never repeats or goes back. */
  readonly number: number;
  readonly entry: LogEntry;
}

export const DEFAULT_LOG_CAPACITY = 1000;

/**
 * The newest log entries, up to a fixed number. When it is full the oldest
 * entry is dropped, so a server that runs for weeks never grows the console's
 * memory.
 */
export class LogBuffer {
  private readonly capacity: number;
  private entries: NumberedEntry[] = [];
  private pushed = 0;

  public constructor(capacity: number = DEFAULT_LOG_CAPACITY) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError("A log buffer needs a capacity of at least 1.");
    }

    this.capacity = capacity;
  }

  public get size(): number {
    return this.entries.length;
  }

  /** The number of the newest entry, or 0 when none was ever pushed. */
  public get lastNumber(): number {
    return this.pushed;
  }

  public push(entry: LogEntry): void {
    this.pushed += 1;
    this.entries.push({ number: this.pushed, entry });

    if (this.entries.length > this.capacity) {
      this.entries.shift();
    }
  }

  /** Forgets the entries it holds. Numbers keep counting. */
  public clear(): void {
    this.entries = [];
  }

  /**
   * The entries that match the filter, oldest first. With `upTo`, entries
   * that arrived after that number are left out, which is how a paused pane
   * stays still.
   */
  public view(filter: LogFilter, upTo?: number): NumberedEntry[] {
    return this.entries.filter(
      (item) =>
        (upTo === undefined || item.number <= upTo) &&
        matchesFilter(item.entry, filter),
    );
  }
}

export function matchesFilter(entry: LogEntry, filter: LogFilter): boolean {
  if (filter.level === "error" && entry.level !== "error") {
    return false;
  }

  if (filter.level === "warn" && entry.level === "info") {
    return false;
  }

  return (
    filter.search === "" ||
    entrySearchText(entry).includes(filter.search.toLowerCase())
  );
}

/** The lower-case text a search looks through. */
export function entrySearchText(entry: LogEntry): string {
  return `${entry.event} ${entry.message} ${
    entry.details === undefined ? "" : JSON.stringify(entry.details)
  }`.toLowerCase();
}
