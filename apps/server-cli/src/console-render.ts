import {
  MIN_COLUMNS,
  MIN_ROWS,
  CHROME_ROWS,
  type ConsoleSnapshot,
} from "./console-model.js";
import { clock, type LogEntry } from "./logger.js";
import { SupervisorState } from "./supervisor.js";
import type { Style } from "./style.js";

/** A piece of a line: its plain text, and how to paint it. */
interface Segment {
  readonly text: string;
  readonly paint?: ((text: string) => string) | undefined;
}

interface Box {
  readonly topLeft: string;
  readonly topRight: string;
  readonly bottomLeft: string;
  readonly bottomRight: string;
  readonly across: string;
  readonly down: string;
  readonly teeLeft: string;
  readonly teeRight: string;
}

const UNICODE_BOX: Box = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  across: "─",
  down: "│",
  teeLeft: "├",
  teeRight: "┤",
};

const ASCII_BOX: Box = {
  topLeft: "+",
  topRight: "+",
  bottomLeft: "+",
  bottomRight: "+",
  across: "-",
  down: "|",
  teeLeft: "+",
  teeRight: "+",
};

/**
 * Draws the console as exactly `snapshot.rows` lines, none wider than
 * `snapshot.columns`: a box with a header, a stats row, the log, two rows of
 * buttons and a line for typing. It only builds text: moving the cursor and
 * writing to the terminal belong to the terminal code, so tests compare
 * plain strings.
 */
export function renderConsole(
  snapshot: ConsoleSnapshot,
  style: Style,
): string[] {
  const { columns, rows } = snapshot;

  if (columns < MIN_COLUMNS || rows < MIN_ROWS) {
    return tooSmall(snapshot, style);
  }

  const box = style.unicode ? UNICODE_BOX : ASCII_BOX;
  const inner = columns - 2;
  const height = rows - CHROME_ROWS;
  const edge = (text: string): string => style.dim(text);
  const row = (segments: readonly Segment[]): string =>
    `${edge(box.down)}${fit(segments, inner, true)}${edge(box.down)}`;
  const line = (left: string, right: string): string =>
    edge(`${left}${box.across.repeat(inner)}${right}`);
  const body =
    snapshot.overlay === undefined
      ? snapshot.lines.map((item) => logLine(item.entry, style))
      : overlayLines(snapshot, style);
  const padded = [
    ...body.slice(0, height),
    ...Array.from({ length: Math.max(0, height - body.length) }, () => []),
  ];
  const [firstButtons, secondButtons] = buttons(snapshot, style);

  return [
    line(box.topLeft, box.topRight),
    row(header(snapshot, style)),
    line(box.teeLeft, box.teeRight),
    row(stats(snapshot, style)),
    logTitle(snapshot, style, box),
    ...padded.map((segments) => row(segments)),
    line(box.teeLeft, box.teeRight),
    row(firstButtons),
    row(secondButtons),
    line(box.teeLeft, box.teeRight),
    row(prompt(snapshot, style)),
    line(box.bottomLeft, box.bottomRight),
  ];
}

function tooSmall(snapshot: ConsoleSnapshot, style: Style): string[] {
  const { columns, rows } = snapshot;
  const messages = [
    "Terminal too small",
    `Needs ${MIN_COLUMNS}x${MIN_ROWS}, this is ${columns}x${rows}`,
    "Make it larger, or press q to quit",
  ];

  return Array.from({ length: rows }, (_unused, index) =>
    fit(
      [
        {
          text: messages[index] ?? "",
          paint: index === 0 ? style.bold : style.dim,
        },
      ],
      columns,
    ),
  );
}

function header(snapshot: ConsoleSnapshot, style: Style): Segment[] {
  const dot = style.unicode ? "●" : "*";
  const [label, paint] = stateLook(snapshot, style);
  const segments: Segment[] = [
    { text: ` SinterDB v${snapshot.version}`, paint: style.bold },
    { text: `   ${dot} ${label}`, paint },
  ];

  if (snapshot.address !== undefined) {
    segments.push({ text: `   ${hostPort(snapshot.address)}` });

    if (snapshot.storage !== undefined) {
      segments.push({ text: `   ${snapshot.storage}`, paint: style.dim });
    }
  } else if (snapshot.exit !== undefined) {
    segments.push({ text: `   ${snapshot.exit}`, paint: style.red });
  }

  return segments;
}

/** `:27017` for this machine, `host:27017` otherwise. */
function hostPort(address: { host: string; port: number }): string {
  const local = ["127.0.0.1", "localhost", "::1"].includes(address.host);

  return `${local ? "" : address.host}:${address.port}`;
}

function stateLook(
  snapshot: ConsoleSnapshot,
  style: Style,
): [string, (text: string) => string] {
  switch (snapshot.server) {
    case SupervisorState.Running:
      return ["running", style.green];
    case SupervisorState.Starting:
      return ["starting", style.yellow];
    case SupervisorState.Stopping:
      return ["stopping", style.yellow];
    case SupervisorState.Crashed:
      return ["crashed", (text) => style.bold(style.red(text))];
    default:
      return ["stopped", style.dim];
  }
}

function stats(snapshot: ConsoleSnapshot, style: Style): Segment[] {
  const up =
    snapshot.uptimeMs === undefined ? "-" : formatUptime(snapshot.uptimeMs);
  const rate =
    snapshot.opsPerSecond >= 10
      ? String(Math.round(snapshot.opsPerSecond))
      : snapshot.opsPerSecond.toFixed(1);

  return [
    { text: " Uptime ", paint: style.dim },
    { text: up },
    { text: "   Conns ", paint: style.dim },
    { text: String(snapshot.active) },
    { text: "   Ops/s ", paint: style.dim },
    { text: rate },
    { text: "   Cmds ", paint: style.dim },
    { text: snapshot.commands.toLocaleString("en-US") },
    { text: "   Failed ", paint: style.dim },
    {
      text: String(snapshot.failed),
      paint: snapshot.failed > 0 ? style.yellow : undefined,
    },
  ];
}

/** `3725000` becomes `01:02:05`; a day or more shows `2d 01:02:05`. */
export function formatUptime(milliseconds: number): string {
  const total = Math.floor(milliseconds / 1000);
  const two = (value: number): string => String(value).padStart(2, "0");
  const days = Math.floor(total / 86_400);
  const clockText = `${two(Math.floor((total % 86_400) / 3600))}:${two(Math.floor((total % 3600) / 60))}:${two(total % 60)}`;

  return days > 0 ? `${days}d ${clockText}` : clockText;
}

/** `├─ Logs ──────── [follow] [all ▾] ─┤`, with the filter text when set. */
function logTitle(snapshot: ConsoleSnapshot, style: Style, box: Box): string {
  const arrow = style.unicode ? "▾" : "v";
  const tags = [
    snapshot.paused
      ? `[paused +${snapshot.pendingWhilePaused}]`
      : snapshot.offset > 0
        ? `[up ${snapshot.offset}]`
        : "[follow]",
    ...(snapshot.search === "" ? [] : [`[/${shorten(snapshot.search, 14)}]`]),
    `[${snapshot.level} ${arrow}]`,
  ].join(" ");
  const left = `${box.teeLeft}${box.across} Logs `;
  const right = ` ${tags} ${box.across}${box.teeRight}`;
  const fill = Math.max(1, snapshot.columns - left.length - right.length);

  return fit(
    [
      { text: left, paint: style.dim },
      { text: box.across.repeat(fill), paint: style.dim },
      { text: right, paint: style.dim },
    ],
    snapshot.columns,
  );
}

function shorten(text: string, length: number): string {
  return text.length <= length ? text : `${text.slice(0, length - 1)}~`;
}

const BADGES = { info: "INFO ", warn: "WARN ", error: "ERROR" } as const;

function logLine(entry: LogEntry, style: Style): Segment[] {
  const paint =
    entry.level === "error"
      ? (text: string) => style.bold(style.red(text))
      : entry.level === "warn"
        ? style.yellow
        : style.cyan;
  const [text, extra] = lineText(entry);

  return [
    { text: ` ${clock(entry.timestamp)} `, paint: style.dim },
    { text: BADGES[entry.level], paint },
    { text: ` ${text}` },
    { text: extra === "" ? "" : `  ${extra}`, paint: style.dim },
  ];
}

/**
 * What a log line says, and a dim note after it: the time a command took, or
 * the error. `insertOne app.users` and `2ms`; `conn #3 opened`.
 */
export function lineText(entry: LogEntry): [text: string, extra: string] {
  const details = entry.details;
  const error = errorText(details);

  if (
    entry.event === "operation" &&
    typeof details?.["durationMs"] === "number"
  ) {
    return [
      entry.message,
      [formatDuration(details["durationMs"]), error]
        .filter((part) => part !== "")
        .join("  "),
    ];
  }

  if (
    (entry.event === "connection.opened" ||
      entry.event === "connection.closed") &&
    typeof details?.["id"] === "number"
  ) {
    return [
      `conn #${details["id"]} ${entry.event.slice("connection.".length)}`,
      error,
    ];
  }

  return [entry.message, error];
}

function errorText(details: LogEntry["details"]): string {
  const error = details?.["error"];

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;

    return typeof message === "string" ? message : "";
  }

  return "";
}

/** `0.4ms`, `2ms`, `212ms`, `1.5s`. */
export function formatDuration(milliseconds: number): string {
  if (milliseconds >= 1000) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  }

  return milliseconds >= 10
    ? `${Math.round(milliseconds)}ms`
    : `${Number(milliseconds.toFixed(1))}ms`;
}

function overlayLines(snapshot: ConsoleSnapshot, style: Style): Segment[][] {
  const overlay = snapshot.overlay;

  if (overlay === undefined) {
    return [];
  }

  const height = snapshot.rows - CHROME_ROWS;
  const lines: Segment[][] = [
    [{ text: ` ${overlay.title}`, paint: style.bold }],
    [],
    ...overlay.lines.map((line): Segment[] => [{ text: `  ${line}` }]),
  ];

  while (lines.length < height - 1) {
    lines.push([]);
  }

  lines.length = Math.min(lines.length, height - 1);
  lines.push([{ text: "  Press esc to close.", paint: style.dim }]);

  return lines;
}

/** Two rows of `[Label key]` buttons. */
function buttons(
  snapshot: ConsoleSnapshot,
  style: Style,
): [Segment[], Segment[]] {
  const state = snapshot.server;
  const canStart =
    state === SupervisorState.Stopped ||
    state === SupervisorState.Crashed ||
    state === SupervisorState.Running;
  const first: Button[] = [
    ["Help", "?", true],
    ["Inspect", "i", true],
    ["Backup", "b", true],
    ["Repair", "r", true],
  ];
  const second: Button[] = [
    [snapshot.paused ? "Resume" : "Pause", "p", true],
    ["Filter", "/", true],
    [state === SupervisorState.Running ? "Restart" : "Start", "s", canStart],
    ["Quit", "q", true],
  ];

  return [buttonRow(first, style), buttonRow(second, style)];
}

type Button = [label: string, key: string, enabled: boolean];

function buttonRow(items: readonly Button[], style: Style): Segment[] {
  const segments: Segment[] = [{ text: " " }];

  for (const [label, key, enabled] of items) {
    segments.push(
      { text: "[", paint: style.dim },
      { text: `${label} `, paint: enabled ? undefined : style.dim },
      {
        text: key,
        paint: enabled ? (text) => style.bold(style.cyan(text)) : style.dim,
      },
      { text: "] ", paint: style.dim },
    );
  }

  return segments;
}

function prompt(snapshot: ConsoleSnapshot, style: Style): Segment[] {
  const cursor = style.unicode ? "█" : "_";

  if (snapshot.mode === "filter") {
    return [
      { text: " / ", paint: style.bold },
      { text: snapshot.input },
      { text: cursor, paint: style.dim },
      { text: "   enter applies, esc cancels", paint: style.dim },
    ];
  }

  if (snapshot.mode === "command") {
    return [
      { text: " > ", paint: style.bold },
      { text: snapshot.input },
      { text: cursor, paint: style.dim },
    ];
  }

  if (snapshot.notice !== undefined) {
    return [
      { text: " > ", paint: style.bold },
      { text: snapshot.notice, paint: style.yellow },
    ];
  }

  return [
    { text: " > ", paint: style.bold },
    {
      text: style.unicode ? "type a command…" : "type a command...",
      paint: style.dim,
    },
    { text: "   press : to type", paint: style.dim },
  ];
}

/**
 * Joins the segments into one line of at most `width` columns, cutting the
 * text (not the color codes) where it runs out and marking the cut. With
 * `pad`, spaces fill the line out to `width`.
 */
function fit(segments: readonly Segment[], width: number, pad = false): string {
  let used = 0;
  let line = "";

  for (const segment of segments) {
    const room = width - used;

    if (room <= 0) {
      break;
    }

    const text =
      segment.text.length <= room
        ? segment.text
        : `${segment.text.slice(0, Math.max(0, room - 1))}~`;

    line += segment.paint === undefined ? text : segment.paint(text);
    used += text.length;
  }

  return pad ? line + " ".repeat(Math.max(0, width - used)) : line;
}
