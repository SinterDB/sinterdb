import { backupText } from "./backup-command.js";
import { inspectDirectory, repairDirectory } from "./maintenance-command.js";
import { PLAIN_STYLE } from "./style.js";

/** What an action shows in the console's panel. */
export interface ActionReport {
  readonly title: string;
  readonly lines: readonly string[];
  /** A dry run whose steps can be carried out from the panel. */
  readonly applicable?: boolean;
}

/**
 * What the console can do to the data directory. Each action is the same
 * code that `sinterd inspect`, `sinterd backup` and `sinterd repair` run.
 * `width` is how wide the panel is, so long lines wrap to fit.
 */
export interface ConsoleActions {
  inspect(width: number): ActionReport;
  backup(to: string, width: number): ActionReport;
  repair(apply: boolean, width: number): ActionReport;
}

export function createConsoleActions(dataDirectory: string): ConsoleActions {
  const styleFor = (width: number): typeof PLAIN_STYLE => ({
    ...PLAIN_STYLE,
    width,
  });

  return {
    inspect: (width) =>
      attempt("Inspect", () => {
        const outcome = inspectDirectory(dataDirectory, styleFor(width));

        return { title: "Inspect", lines: toLines(outcome.text) };
      }),

    backup: (to, width) =>
      attempt("Backup", () => ({
        title: "Backup",
        lines: toLines(backupText(styleFor(width), dataDirectory, to)),
      })),

    repair: (apply, width) =>
      attempt("Repair", () => {
        const outcome = repairDirectory(
          { directory: dataDirectory, ...(apply ? { apply: true } : {}) },
          styleFor(width),
        );

        return {
          title: apply ? "Repair" : "Repair (dry run)",
          lines: toLines(outcome.text),
          applicable: outcome.applicable === true,
        };
      }),
  };
}

function toLines(text: string): string[] {
  return text.trimEnd().split("\n");
}

function attempt(title: string, run: () => ActionReport): ActionReport {
  try {
    return run();
  } catch (error: unknown) {
    return {
      title: `${title} failed`,
      lines: [error instanceof Error ? error.message : String(error)],
    };
  }
}
