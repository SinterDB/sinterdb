#!/usr/bin/env node

import { BACKUP_HELP_TEXT, BackupUsageError } from "./backup-command.js";
import { CliUsageError, HELP_TEXT } from "./cli.js";
import { CONFIG_HELP_TEXT, ConfigUsageError } from "./config-command.js";
import { logError } from "./logger.js";
import { main } from "./main.js";
import {
  MAINTENANCE_HELP_TEXT,
  MaintenanceUsageError,
} from "./maintenance-command.js";
import { createStyle, styleHelp } from "./style.js";

function reportUsageError(message: string, help: string): void {
  const style = createStyle(process.stderr);

  process.stderr.write(
    `${style.bold(style.red("error:"))} ${message}\n\n${styleHelp(help, style)}`,
  );
  process.exitCode = 2;
}

try {
  await main();
} catch (error: unknown) {
  if (error instanceof CliUsageError) {
    reportUsageError(error.message, HELP_TEXT);
  } else if (error instanceof BackupUsageError) {
    reportUsageError(error.message, BACKUP_HELP_TEXT);
  } else if (error instanceof MaintenanceUsageError) {
    reportUsageError(error.message, MAINTENANCE_HELP_TEXT);
  } else if (error instanceof ConfigUsageError) {
    reportUsageError(error.message, CONFIG_HELP_TEXT);
  } else {
    logError("server.start_failed", "SinterDB server failed to start.", error);
    process.exitCode = 1;
  }
}
