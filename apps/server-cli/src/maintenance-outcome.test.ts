import type { RepairResult } from "@sinterdb-internal/server";
import { describe, expect, it, vi } from "vitest";

import { PLAIN_STYLE } from "./style.js";

const repair = vi.fn();

vi.mock("@sinterdb-internal/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@sinterdb-internal/server")>()),
  repairDataDirectory: (...arguments_: unknown[]) => repair(...arguments_),
}));

const { repairDirectory } = await import("./maintenance-command.js");

function result(overrides: Record<string, unknown>): RepairResult {
  return {
    apply: false,
    directory: "/data",
    actions: [],
    blocked: [],
    before: { recovery: { recoverable: true, problems: [] } },
    ...overrides,
  } as unknown as RepairResult;
}

const action = (
  allowed: boolean,
  applied = false,
): Record<string, unknown> => ({
  description: "Do a thing.",
  dataLoss: false,
  allowed,
  applied,
});

describe("repairDirectory", () => {
  it("is applicable when a dry run has a step that is allowed", () => {
    repair.mockReturnValue(result({ actions: [action(false), action(true)] }));

    expect(repairDirectory({ directory: "/data" }, PLAIN_STYLE)).toMatchObject({
      applicable: true,
      ok: false,
    });
  });

  it("is not applicable when every step needs a flag", () => {
    repair.mockReturnValue(result({ actions: [action(false)] }));

    expect(
      repairDirectory({ directory: "/data" }, PLAIN_STYLE).applicable,
    ).toBe(false);
  });

  it("is not applicable when there are no steps", () => {
    repair.mockReturnValue(result({}));

    expect(repairDirectory({ directory: "/data" }, PLAIN_STYLE)).toMatchObject({
      applicable: false,
      ok: true,
    });
  });

  it("is not applicable once the steps were applied", () => {
    repair.mockReturnValue(
      result({
        apply: true,
        actions: [action(true, true)],
        after: { recovery: { recoverable: true, problems: [] } },
      }),
    );

    expect(
      repairDirectory({ directory: "/data", apply: true }, PLAIN_STYLE),
    ).toMatchObject({ applicable: false, ok: true });
  });

  it("describes the result with the same words as the command", () => {
    repair.mockReturnValue(result({ actions: [action(true)] }));

    const outcome = repairDirectory({ directory: "/data" }, PLAIN_STYLE);

    expect(outcome.text).toContain("SinterDB repair (dry run)");
    expect(outcome.text).toContain("Steps it would take");
  });
});
