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

/**
 * Draws the console as exactly `snapshot.rows` lines, none wider than
 * `snapshot.columns`. It only builds text: moving the cursor and writing to
 * the terminal belong to the terminal code, so tests compare plain strings.
 */
export function renderConsole(
  snapshot: ConsoleSnapshot,
  style: Style,
): string[] {
  const { columns, rows } = snapshot;

  if (columns < MIN_COLUMNS || rows < MIN_ROWS) {
    return tooSmall(snapshot, style);
  }

  const height = rows - CHROME_ROWS;
  const body =
    snapshot.overlay === undefined
      ? snapshot.lines.map((item) => logLine(item.entry, columns, style))
      : overlayLines(snapshot, style);
  const padded = [
    ...body.slice(0, height),
    ...Array.from({ length: Math.max(0, height - body.length) }, () => ""),
  ];

  return [
    header(snapshot, style),
    stats(snapshot, style),
    rule(snapshot, style),
    ...padded,
    fill(style.symbols.rule, columns, style),
    buttons(snapshot, style),
    prompt(snapshot, style),
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

function header(snapshot: ConsoleSnapshot, style: Style): string {
  const dot = style.unicode ? "●" : "*";
  const [label, paint] = stateLook(snapshot, style);
  const segments: Segment[] = [
    { text: ` SinterDB ${snapshot.version}  `, paint: style.bold },
    { text: `${dot} ${label}`, paint },
  ];

  if (snapshot.address !== undefined) {
    segments.push(
      { text: `  ${snapshot.address.host}:${snapshot.address.port}` },
      { text: `  pid ${snapshot.address.pid}`, paint: style.dim },
    );
  } else if (snapshot.exit !== undefined) {
    segments.push({ text: `  ${snapshot.exit}`, paint: style.red });
  }

  return fit(segments, snapshot.columns);
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

function stats(snapshot: ConsoleSnapshot, style: Style): string {
  const up =
    snapshot.uptimeMs === undefined ? "-" : formatUptime(snapshot.uptimeMs);
  const rate =
    snapshot.opsPerSecond >= 10
      ? String(Math.round(snapshot.opsPerSecond))
      : snapshot.opsPerSecond.toFixed(1);

  return fit(
    [
      { text: " up ", paint: style.dim },
      { text: up },
      { text: "   connections ", paint: style.dim },
      { text: String(snapshot.active) },
      { text: "   commands ", paint: style.dim },
      { text: snapshot.commands.toLocaleString("en-US") },
      { text: ` (${rate}/s)`, paint: style.dim },
      { text: "   failed ", paint: style.dim },
      {
        text: String(snapshot.failed),
        paint: snapshot.failed > 0 ? style.yellow : undefined,
      },
    ],
    snapshot.columns,
  );
}

/** `3725000` becomes `01:02:05`; a day or more shows `2d 01:02:05`. */
export function formatUptime(milliseconds: number): string {
  const total = Math.floor(milliseconds / 1000);
  const two = (value: number): string => String(value).padStart(2, "0");
  const days = Math.floor(total / 86_400);
  const clockText = `${two(Math.floor((total % 86_400) / 3600))}:${two(Math.floor((total % 3600) / 60))}:${two(total % 60)}`;

  return days > 0 ? `${days}d ${clockText}` : clockText;
}

function rule(snapshot: ConsoleSnapshot, style: Style): string {
  const parts = [
    snapshot.paused
      ? `paused (+${snapshot.pendingWhilePaused})`
      : snapshot.offset > 0
        ? `scrolled up ${snapshot.offset}`
        : "following",
    `level ${snapshot.level}`,
    ...(snapshot.search === "" ? [] : [`filter "${snapshot.search}"`]),
    `${snapshot.matched}/${snapshot.total}`,
  ];
  const bar = style.symbols.rule;
  const label = ` Log ${bar} ${parts.join(` ${bar} `)} `;

  return fit(
    [
      { text: bar, paint: style.dim },
      { text: label, paint: style.bold },
      {
        text: bar.repeat(Math.max(0, snapshot.columns - label.length - 1)),
        paint: style.dim,
      },
    ],
    snapshot.columns,
  );
}

function fill(character: string, width: number, style: Style): string {
  return style.dim(character.repeat(width));
}

const BADGES = { info: "INFO ", warn: "WARN ", error: "ERROR" } as const;

function logLine(entry: LogEntry, columns: number, style: Style): string {
  const paint =
    entry.level === "error"
      ? (text: string) => style.bold(style.red(text))
      : entry.level === "warn"
        ? style.yellow
        : style.cyan;

  return fit(
    [
      { text: ` ${clock(entry.timestamp)}  `, paint: style.dim },
      { text: BADGES[entry.level], paint },
      { text: `  ${entry.event}`, paint: style.bold },
      { text: `  ${entry.message}` },
      { text: detailsSummary(entry), paint: style.dim },
    ],
    columns,
  );
}

/** ` name=value` for each simple detail, and the error message. */
export function detailsSummary(entry: LogEntry): string {
  const details = entry.details;

  if (details === undefined) {
    return "";
  }

  const pairs: string[] = [];

  for (const [key, value] of Object.entries(details)) {
    if (key === "error" && typeof value === "object" && value !== null) {
      const message = (value as { message?: unknown }).message;

      pairs.push(`error=${typeof message === "string" ? message : "?"}`);
    } else if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      pairs.push(`${key}=${String(value)}`);
    }
  }

  return pairs.length === 0 ? "" : `  ${pairs.join(" ")}`;
}

function overlayLines(snapshot: ConsoleSnapshot, style: Style): string[] {
  const overlay = snapshot.overlay;

  if (overlay === undefined) {
    return [];
  }

  const height = snapshot.rows - CHROME_ROWS;
  const lines = [
    fit([{ text: ` ${overlay.title}`, paint: style.bold }], snapshot.columns),
    "",
    ...overlay.lines.map((line) =>
      fit([{ text: `  ${line}` }], snapshot.columns),
    ),
  ];

  while (lines.length < height - 1) {
    lines.push("");
  }

  lines.length = Math.min(lines.length, height - 1);
  lines.push(
    fit(
      [{ text: "  Press esc to close.", paint: style.dim }],
      snapshot.columns,
    ),
  );

  return lines;
}

function buttons(snapshot: ConsoleSnapshot, style: Style): string {
  const state = snapshot.server;
  const canStart =
    state === SupervisorState.Stopped || state === SupervisorState.Crashed;
  const canStop =
    state === SupervisorState.Running || state === SupervisorState.Starting;
  const canRestart =
    state !== SupervisorState.Starting && state !== SupervisorState.Stopping;
  const items: [key: string, label: string, enabled: boolean][] = [
    ["s", "Start", canStart],
    ["x", "Stop", canStop],
    ["r", "Restart", canRestart],
    ["p", snapshot.paused ? "Resume" : "Pause", true],
    ["l", "Level", true],
    ["/", "Filter", true],
    ["?", "Help", true],
    ["q", "Quit", true],
  ];

  // On a narrow terminal, drop the less important buttons before cutting
  // the row. The keys still work.
  const width = (list: typeof items): number =>
    1 +
    list.reduce((sum, [key, label]) => sum + key.length + label.length + 3, 0);
  let shown = items;

  for (const droppable of ["l", "p", "/"]) {
    if (width(shown) > snapshot.columns) {
      shown = shown.filter(([key]) => key !== droppable);
    }
  }

  const segments: Segment[] = [{ text: " " }];

  for (const [key, label, enabled] of shown) {
    segments.push(
      {
        text: key,
        paint: enabled ? (text) => style.bold(style.cyan(text)) : style.dim,
      },
      { text: ` ${label}  `, paint: enabled ? undefined : style.dim },
    );
  }

  return fit(segments, snapshot.columns);
}

function prompt(snapshot: ConsoleSnapshot, style: Style): string {
  const cursor = style.unicode ? "▌" : "_";

  if (snapshot.mode === "filter") {
    return fit(
      [
        { text: " Filter: ", paint: style.bold },
        { text: snapshot.input },
        { text: cursor, paint: style.dim },
        { text: "   enter applies, esc cancels", paint: style.dim },
      ],
      snapshot.columns,
    );
  }

  if (snapshot.mode === "command") {
    return fit(
      [
        { text: " > ", paint: style.bold },
        { text: snapshot.input },
        { text: cursor, paint: style.dim },
      ],
      snapshot.columns,
    );
  }

  if (snapshot.notice !== undefined) {
    return fit(
      [{ text: ` ${snapshot.notice}`, paint: style.yellow }],
      snapshot.columns,
    );
  }

  return fit(
    [
      {
        text: " Press : for commands, / to filter, ? for help",
        paint: style.dim,
      },
    ],
    snapshot.columns,
  );
}

/**
 * Joins the segments into one line of at most `width` columns, cutting the
 * text (not the color codes) where it runs out and marking the cut.
 */
function fit(segments: readonly Segment[], width: number): string {
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

  return line;
}
