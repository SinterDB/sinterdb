import { describe, expect, it } from "vitest";

import { CliUsageError, parseCliArguments, HELP_TEXT } from "./cli.js";

describe("parseCliArguments", () => {
  it("starts with environment-backed defaults", () => {
    expect(parseCliArguments([])).toEqual({
      kind: "start",
    });
  });

  it("parses host and port options", () => {
    expect(parseCliArguments(["--host", "0.0.0.0", "--port", "5000"])).toEqual({
      kind: "start",
      host: "0.0.0.0",
      port: "5000",
    });
  });

  it("parses the short port option", () => {
    expect(parseCliArguments(["-p", "6000"])).toEqual({
      kind: "start",
      port: "6000",
    });
  });

  it("parses --log-operations, and leaves it out when absent", () => {
    expect(parseCliArguments(["--log-operations"])).toEqual({
      kind: "start",
      logOperations: true,
    });
    expect(parseCliArguments([])).not.toHaveProperty("logOperations");
  });

  it("parses the help option", () => {
    expect(parseCliArguments(["--help"])).toEqual({
      kind: "help",
    });
  });

  it("parses the version option", () => {
    expect(parseCliArguments(["-v"])).toEqual({
      kind: "version",
    });
  });

  it("rejects unknown options", () => {
    expect(() => parseCliArguments(["--destroy-everything"])).toThrow(
      CliUsageError,
    );
  });

  it("rejects positional arguments", () => {
    expect(() => parseCliArguments(["unexpected"])).toThrow(CliUsageError);
  });

  it("rejects help and version together", () => {
    expect(() => parseCliArguments(["--help", "--version"])).toThrow(
      CliUsageError,
    );
  });

  it("parses the data directory and write concern options", () => {
    expect(
      parseCliArguments([
        "--data-dir",
        "/var/lib/sinterdb",
        "--write-concern",
        "journaled",
      ]),
    ).toEqual({
      kind: "start",
      dataDir: "/var/lib/sinterdb",
      writeConcern: "journaled",
    });
  });

  it("still parses the deprecated durability option", () => {
    expect(parseCliArguments(["--durability", "buffered"])).toEqual({
      kind: "start",
      durability: "buffered",
    });
  });

  it("parses the checkpoint schedule and retention options", () => {
    expect(
      parseCliArguments([
        "--checkpoint-interval",
        "30",
        "--checkpoint-keep",
        "3",
      ]),
    ).toEqual({
      kind: "start",
      checkpointInterval: "30",
      checkpointKeep: "3",
    });
  });

  it("parses the data directory on its own", () => {
    expect(parseCliArguments(["--data-dir", "./data"])).toEqual({
      kind: "start",
      dataDir: "./data",
    });
  });

  it("parses the checkpoint threshold", () => {
    expect(
      parseCliArguments([
        "--data-dir",
        "./data",
        "--checkpoint-bytes",
        "1048576",
      ]),
    ).toEqual({
      kind: "start",
      dataDir: "./data",
      checkpointBytes: "1048576",
    });
  });

  it("parses --reclaim-lock as a flag", () => {
    expect(
      parseCliArguments(["--data-dir", "./data", "--reclaim-lock"]),
    ).toEqual({
      kind: "start",
      dataDir: "./data",
      reclaimLock: true,
    });
    expect(parseCliArguments([])).not.toHaveProperty("reclaimLock");
    expect(() => parseCliArguments(["--reclaim-lock=yes"])).toThrow(
      CliUsageError,
    );
  });

  it("rejects storage options without values", () => {
    expect(() => parseCliArguments(["--data-dir"])).toThrow(CliUsageError);
    expect(() => parseCliArguments(["--durability"])).toThrow(CliUsageError);
    expect(() => parseCliArguments(["--write-concern"])).toThrow(CliUsageError);
    expect(() => parseCliArguments(["--checkpoint-interval"])).toThrow(
      CliUsageError,
    );
    expect(() => parseCliArguments(["--checkpoint-keep"])).toThrow(
      CliUsageError,
    );
  });

  it("documents every option and environment variable", () => {
    for (const text of [
      "--host",
      "-p, --port",
      "--data-dir",
      "--write-concern",
      "--durability",
      "--checkpoint-bytes",
      "--checkpoint-interval",
      "--checkpoint-keep",
      "SINTERDB_DATA_DIR",
      "SINTERDB_WRITE_CONCERN",
      "SINTERDB_DURABILITY",
      "SINTERDB_CHECKPOINT_BYTES",
      "SINTERDB_CHECKPOINT_INTERVAL",
      "SINTERDB_CHECKPOINT_KEEP",
      "flushed",
      "journaled",
      "memory",
    ]) {
      expect(HELP_TEXT).toContain(text);
    }
  });
});
