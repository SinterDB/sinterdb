import { StorageError, StorageErrorCode } from "../errors.js";

/**
 * A step that moves a data directory from one storage format version to the
 * next. Steps run when a directory is opened, before the log is read.
 */
export interface Migration {
  /** The format version this step reads. */
  readonly from: number;
  /** The format version it leaves behind. Always `from + 1`. */
  readonly to: number;
  /** A sentence for logs and error messages. */
  readonly description: string;
  /**
   * Rewrites whatever files need it. Leave this out when the new version only
   * adds something the old files can simply be read without.
   *
   * The step must be safe to run again on a directory it already changed
   * partway, because a crash can stop it before the manifest records that it
   * finished. It must not read or write the manifest.
   */
  readonly run?: (context: MigrationContext) => void;
}

export interface MigrationContext {
  /** The data directory being migrated. No server has it open. */
  readonly directory: string;
}

export interface MigrationEvent {
  readonly from: number;
  readonly to: number;
  readonly description: string;
}

export interface MigrationPlan {
  /** The format version this build writes. */
  readonly targetVersion: number;
  readonly migrations: readonly Migration[];
}

/**
 * Every format change this build can undo the need for. Add one entry whenever
 * `STORAGE_FORMAT_VERSION` goes up; a test fails if the chain has a gap.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    from: 1,
    to: 2,
    description:
      "Version 2 adds index definitions to the log and to snapshots. Version 1 files are read as they are.",
  },
  {
    from: 2,
    to: 3,
    description:
      "Version 3 lets an index definition cover several fields. Version 2 files are read as they are.",
  },
];

/**
 * The steps that take a directory from `from` to the plan's target, in order.
 * Throws when the chain is broken, so a missing step is found at the first
 * start instead of as damaged data later.
 */
export function planMigrations(
  from: number,
  plan: MigrationPlan,
): readonly Migration[] {
  const steps: Migration[] = [];
  let version = from;

  while (version < plan.targetVersion) {
    const step = plan.migrations.find(
      (candidate) => candidate.from === version,
    );

    if (step === undefined || step.to !== version + 1) {
      throw new StorageError(
        StorageErrorCode.UnsupportedFormat,
        `This version of SinterDB cannot upgrade a data directory from storage format version ${from}: there is no step from version ${version} to ${version + 1}. Open it with an older release that can upgrade it first.`,
      );
    }

    steps.push(step);
    version += 1;
  }

  return steps;
}

/** Checks a plan for steps that skip or repeat versions. Used by tests. */
export function validateMigrations(plan: MigrationPlan): string[] {
  const problems: string[] = [];
  const seen = new Set<number>();

  for (const step of plan.migrations) {
    if (step.to !== step.from + 1) {
      problems.push(
        `The step from ${step.from} to ${step.to} must move up by exactly one version.`,
      );
    }

    if (seen.has(step.from)) {
      problems.push(`There is more than one step from version ${step.from}.`);
    }

    seen.add(step.from);

    if (step.description.trim() === "") {
      problems.push(`The step from ${step.from} has no description.`);
    }
  }

  for (let version = 1; version < plan.targetVersion; version += 1) {
    if (!seen.has(version)) {
      problems.push(`There is no step from version ${version}.`);
    }
  }

  return problems;
}
