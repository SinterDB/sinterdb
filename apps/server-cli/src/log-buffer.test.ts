import { describe, expect, it } from "vitest";

import {
  LogBuffer,
  entrySearchText,
  matchesFilter,
  type LogFilter,
} from "./log-buffer.js";
import type { LogEntry, LogLevel } from "./logger.js";

function entry(
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

const ALL: LogFilter = { level: "all", search: "" };

describe("LogBuffer", () => {
  it("keeps entries in the order they arrived", () => {
    const buffer = new LogBuffer(10);

    buffer.push(entry("a"));
    buffer.push(entry("b"));

    expect(buffer.view(ALL).map((item) => item.entry.message)).toEqual([
      "a",
      "b",
    ]);
    expect(buffer.view(ALL).map((item) => item.number)).toEqual([1, 2]);
    expect(buffer.size).toBe(2);
    expect(buffer.lastNumber).toBe(2);
  });

  it("drops the oldest entry when it is full", () => {
    const buffer = new LogBuffer(3);

    for (const message of ["a", "b", "c", "d", "e"]) {
      buffer.push(entry(message));
    }

    expect(buffer.size).toBe(3);
    expect(buffer.view(ALL).map((item) => item.entry.message)).toEqual([
      "c",
      "d",
      "e",
    ]);
    expect(buffer.lastNumber).toBe(5);
  });

  it("keeps a capacity of exactly one entry", () => {
    const buffer = new LogBuffer(1);

    buffer.push(entry("a"));
    buffer.push(entry("b"));

    expect(buffer.view(ALL).map((item) => item.entry.message)).toEqual(["b"]);
  });

  it("refuses a capacity that is not a positive whole number", () => {
    expect(() => new LogBuffer(0)).toThrow(RangeError);
    expect(() => new LogBuffer(1.5)).toThrow(RangeError);
    expect(() => new LogBuffer(Number.NaN)).toThrow(RangeError);
  });

  it("clears its entries but keeps counting", () => {
    const buffer = new LogBuffer(5);

    buffer.push(entry("a"));
    buffer.clear();
    buffer.push(entry("b"));

    expect(buffer.view(ALL).map((item) => item.number)).toEqual([2]);
    expect(buffer.size).toBe(1);
  });

  it("leaves out entries after a number, which keeps a paused pane still", () => {
    const buffer = new LogBuffer(5);

    for (const message of ["a", "b", "c"]) {
      buffer.push(entry(message));
    }

    expect(buffer.view(ALL, 2).map((item) => item.entry.message)).toEqual([
      "a",
      "b",
    ]);
    expect(buffer.view(ALL, 0)).toEqual([]);
  });

  it("filters by level and by text together", () => {
    const buffer = new LogBuffer(10);

    buffer.push(entry("alpha", "info"));
    buffer.push(entry("alpha two", "warn"));
    buffer.push(entry("beta", "warn"));
    buffer.push(entry("alpha three", "error"));

    const messages = (filter: LogFilter): string[] =>
      buffer.view(filter).map((item) => item.entry.message);

    expect(messages({ level: "warn", search: "" })).toEqual([
      "alpha two",
      "beta",
      "alpha three",
    ]);
    expect(messages({ level: "error", search: "" })).toEqual(["alpha three"]);
    expect(messages({ level: "warn", search: "alpha" })).toEqual([
      "alpha two",
      "alpha three",
    ]);
  });
});

describe("matchesFilter", () => {
  it("ignores case in the search", () => {
    expect(
      matchesFilter(entry("Hello"), { level: "all", search: "HELLO" }),
    ).toBe(true);
    expect(
      matchesFilter(entry("Hello"), { level: "all", search: "nope" }),
    ).toBe(false);
  });

  it("looks in the event and the details too", () => {
    const item = entry("m", "info", "operation", { command: "insertOne" });

    expect(matchesFilter(item, { level: "all", search: "operation" })).toBe(
      true,
    );
    expect(matchesFilter(item, { level: "all", search: "insertone" })).toBe(
      true,
    );
  });

  it("builds search text from the event, message and details", () => {
    expect(entrySearchText(entry("Msg", "info", "Ev", { a: 1 }))).toBe(
      'ev msg {"a":1}',
    );
    expect(entrySearchText(entry("Msg", "info", "Ev"))).toBe("ev msg ");
  });
});
