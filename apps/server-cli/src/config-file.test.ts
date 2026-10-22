import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  CONFIG_KEYS,
  ConfigFileError,
  applyConfigFile,
  defaultConfigPath,
  isConfigKey,
  parseConfigValue,
  readConfigFile,
  resolveConfigEntries,
  validateConfigValue,
  writeConfigFile,
} from "./config-file.js";

let directory = "";

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "sinterd-config-"));
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

function fileWith(content: string): string {
  const path = join(directory, "config.json");

  writeFileSync(path, content);

  return path;
}

describe("defaultConfigPath", () => {
  it("uses XDG_CONFIG_HOME when it is set", () => {
    expect(
      defaultConfigPath({ XDG_CONFIG_HOME: "/x" }, "linux", "/home/a"),
    ).toBe(join("/x", "sinterdb", "config.json"));
  });

  it("falls back to ~/.config", () => {
    expect(defaultConfigPath({}, "linux", "/home/a")).toBe(
      join("/home/a", ".config", "sinterdb", "config.json"),
    );
    expect(defaultConfigPath({ XDG_CONFIG_HOME: "" }, "darwin", "/h")).toBe(
      join("/h", ".config", "sinterdb", "config.json"),
    );
  });

  it("uses APPDATA on Windows", () => {
    expect(defaultConfigPath({ APPDATA: "/ad" }, "win32", "/h")).toBe(
      join("/ad", "sinterdb", "config.json"),
    );
    expect(defaultConfigPath({ APPDATA: "" }, "win32", "/h")).toBe(
      join("/h", "AppData", "Roaming", "sinterdb", "config.json"),
    );
    expect(defaultConfigPath({}, "win32", "/h")).toBe(
      join("/h", "AppData", "Roaming", "sinterdb", "config.json"),
    );
  });
});

describe("readConfigFile", () => {
  it("treats a missing file as an empty one", () => {
    expect(readConfigFile(join(directory, "nope.json"))).toEqual({
      path: join(directory, "nope.json"),
      exists: false,
      values: {},
    });
  });

  it("reads typed values", () => {
    const path = fileWith(
      '{"host":"0.0.0.0","port":5000,"dataDir":"d","reclaimLock":true}',
    );

    expect(readConfigFile(path)).toEqual({
      path,
      exists: true,
      values: { host: "0.0.0.0", port: 5000, dataDir: "d", reclaimLock: true },
    });
  });

  it("names the file when the JSON is invalid", () => {
    const path = fileWith("{nope");

    expect(() => readConfigFile(path)).toThrow(ConfigFileError);
    expect(() => readConfigFile(path)).toThrow(path);
    expect(() => readConfigFile(path)).toThrow(/not valid JSON/);
  });

  it("requires one object", () => {
    expect(() => readConfigFile(fileWith("[]"))).toThrow(/one JSON object/);
    expect(() => readConfigFile(fileWith("null"))).toThrow(/one JSON object/);
    expect(() => readConfigFile(fileWith('"x"'))).toThrow(/one JSON object/);
  });

  it("rejects an unknown key and lists the known ones", () => {
    expect(() => readConfigFile(fileWith('{"prot":1}'))).toThrow(
      /unknown setting "prot".*host, port, dataDir/,
    );
  });

  it("rejects a value of the wrong type", () => {
    expect(() => readConfigFile(fileWith('{"port":"4721"}'))).toThrow(
      /"port" must be a number; found "4721"/,
    );
    expect(() => readConfigFile(fileWith('{"reclaimLock":"true"}'))).toThrow(
      /must be a boolean/,
    );
    expect(() => readConfigFile(fileWith('{"host":1}'))).toThrow(
      /must be a string/,
    );
  });

  it("rejects a value the server would refuse", () => {
    expect(() => readConfigFile(fileWith('{"port":70000}'))).toThrow(
      /"port" is not valid.*between 0 and 65535/,
    );
    expect(() => readConfigFile(fileWith('{"checkpointKeep":1}'))).toThrow(
      /"checkpointKeep" is not valid/,
    );
  });

  it("reports a path that cannot be read as a file", () => {
    expect(() => readConfigFile(directory)).toThrow(/Cannot read the config/);
  });
});

describe("writeConfigFile", () => {
  it("writes pretty JSON in a fixed key order with a trailing newline", () => {
    const path = join(directory, "deep", "er", "config.json");

    writeConfigFile(path, { logOperations: true, port: 1, host: "h" });

    expect(readFileSync(path, "utf8")).toBe(
      '{\n  "host": "h",\n  "port": 1,\n  "logOperations": true\n}\n',
    );
  });

  it("leaves no temporary file behind", () => {
    writeConfigFile(join(directory, "config.json"), { port: 1 });

    expect(readdirSync(directory)).toEqual(["config.json"]);
  });

  it("reports a path it cannot write", () => {
    // A directory sits where the file should go, so the final rename fails.
    const path = join(directory, "config.json");

    mkdirSync(path);

    expect(() => writeConfigFile(path, { port: 1 })).toThrow(
      /Cannot write the config file/,
    );
    expect(readdirSync(directory)).toEqual(["config.json"]);
  });
});

describe("parseConfigValue", () => {
  it("keeps strings as typed", () => {
    expect(parseConfigValue("host", " h ")).toBe(" h ");
  });

  it("parses numbers", () => {
    expect(parseConfigValue("port", "4721")).toBe(4721);
    expect(() => parseConfigValue("port", "abc")).toThrow(/must be a number/);
    expect(() => parseConfigValue("port", "")).toThrow(/must be a number/);
    expect(() => parseConfigValue("port", "Infinity")).toThrow(
      /must be a number/,
    );
  });

  it("parses booleans exactly", () => {
    expect(parseConfigValue("reclaimLock", "true")).toBe(true);
    expect(parseConfigValue("reclaimLock", "false")).toBe(false);
    expect(() => parseConfigValue("reclaimLock", "yes")).toThrow(
      /"true" or "false"/,
    );
  });
});

describe("validateConfigValue", () => {
  it("uses the server's rules", () => {
    expect(() => validateConfigValue("port", 70_000)).toThrow(/port/);
    expect(() => validateConfigValue("host", "  ")).toThrow(/cannot be empty/);
    expect(() => validateConfigValue("dataDir", "")).toThrow(/cannot be empty/);
    expect(() => validateConfigValue("writeConcern", "fast")).toThrow(
      /write concern/,
    );
    expect(() => validateConfigValue("checkpointKeep", 1)).toThrow(/2 to 100/);
    expect(() => validateConfigValue("checkpointBytes", 0)).toThrow(/positive/);
    expect(() => validateConfigValue("checkpointInterval", 0)).toThrow(
      /1 to 2000000/,
    );
  });

  it("accepts a setting that needs a data directory on its own", () => {
    expect(() =>
      validateConfigValue("writeConcern", "journaled"),
    ).not.toThrow();
    expect(() => validateConfigValue("checkpointKeep", 3)).not.toThrow();
    expect(() => validateConfigValue("reclaimLock", true)).not.toThrow();
  });

  it("is not changed by the environment", () => {
    process.env["SINTERDB_DURABILITY"] = "fsync";

    try {
      expect(() =>
        validateConfigValue("writeConcern", "journaled"),
      ).not.toThrow();
    } finally {
      delete process.env["SINTERDB_DURABILITY"];
    }
  });
});

describe("resolveConfigEntries", () => {
  const entry = (
    entries: ReturnType<typeof resolveConfigEntries>,
    key: string,
  ) => entries.find((item) => item.key === key);

  it("lists every key with its default", () => {
    const entries = resolveConfigEntries({}, {});

    expect(entries.map((item) => item.key)).toEqual([...CONFIG_KEYS]);
    expect(entry(entries, "host")).toMatchObject({
      value: "127.0.0.1",
      source: "default",
    });
    expect(entry(entries, "port")).toMatchObject({
      value: "4721",
      source: "default",
    });
    expect(entry(entries, "dataDir")).toMatchObject({
      value: undefined,
      source: "unset",
    });
    expect(entry(entries, "checkpointKeep")).toMatchObject({ value: "2" });
    expect(entry(entries, "checkpointBytes")?.value).toBe("67108864");
  });

  it("puts flags before the environment before the file", () => {
    const file = { port: 3 };

    expect(resolveConfigEntries(file, {})[1]).toMatchObject({
      value: "3",
      source: "file",
    });
    expect(resolveConfigEntries(file, { SINTERDB_PORT: "2" })[1]).toMatchObject(
      { value: "2", source: "env", variable: "SINTERDB_PORT" },
    );
    expect(
      resolveConfigEntries(file, { SINTERDB_PORT: "2" }, { port: "1" })[1],
    ).toMatchObject({ value: "1", source: "flag" });
  });

  it("ignores a file value that needs a data directory when none is set", () => {
    const entries = resolveConfigEntries({ checkpointKeep: 5 }, {});

    expect(entry(entries, "checkpointKeep")).toMatchObject({
      value: "2",
      source: "default",
      note: expect.stringContaining("dataDir"),
    });
  });

  it("uses it once a data directory comes from any layer", () => {
    const keep = { checkpointKeep: 5 };

    expect(
      entry(
        resolveConfigEntries({ ...keep, dataDir: "d" }, {}),
        "checkpointKeep",
      ),
    ).toMatchObject({ value: "5", source: "file" });
    expect(
      entry(
        resolveConfigEntries(keep, { SINTERDB_DATA_DIR: "d" }),
        "checkpointKeep",
      ),
    ).toMatchObject({ value: "5", source: "file" });
    expect(
      entry(
        resolveConfigEntries(keep, {}, { dataDirectory: "d" }),
        "checkpointKeep",
      ),
    ).toMatchObject({ value: "5", source: "file" });
  });

  it("treats the deprecated durability mode as the write concern", () => {
    expect(
      entry(
        resolveConfigEntries(
          { dataDir: "d" },
          { SINTERDB_DURABILITY: "fsync" },
        ),
        "writeConcern",
      ),
    ).toMatchObject({
      value: "fsync",
      source: "env",
      variable: "SINTERDB_DURABILITY",
    });
    expect(
      entry(
        resolveConfigEntries({ dataDir: "d" }, {}, { durability: "buffered" }),
        "writeConcern",
      ),
    ).toMatchObject({ value: "buffered", source: "flag" });
  });
});

describe("applyConfigFile", () => {
  it("adds file values the other layers leave unset", () => {
    expect(
      applyConfigFile(
        {},
        { host: "h", port: 9, dataDir: "d", logOperations: true },
        {},
      ),
    ).toEqual({
      host: "h",
      port: 9,
      dataDirectory: "d",
      logOperations: true,
    });
  });

  it("maps every key to the server's own option name", () => {
    expect(
      applyConfigFile(
        {},
        {
          dataDir: "d",
          writeConcern: "memory",
          checkpointBytes: 5,
          checkpointInterval: 6,
          checkpointKeep: 7,
          reclaimLock: true,
        },
        {},
      ),
    ).toEqual({
      dataDirectory: "d",
      writeConcern: "memory",
      checkpointThresholdBytes: 5,
      checkpointIntervalSeconds: 6,
      checkpointKeep: 7,
      reclaimLock: true,
    });
  });

  it("never overrides a flag or an environment variable", () => {
    expect(
      applyConfigFile(
        { port: "1" },
        { port: 9, host: "h" },
        {
          SINTERDB_HOST: "e",
        },
      ),
    ).toEqual({ port: "1" });
  });

  it("skips settings that need a data directory when there is none", () => {
    expect(
      applyConfigFile({}, { checkpointKeep: 5, reclaimLock: true }, {}),
    ).toEqual({});
  });

  it("skips the write concern while the deprecated mode is set", () => {
    expect(
      applyConfigFile(
        { dataDirectory: "d", durability: "fsync" },
        { writeConcern: "memory" },
        {},
      ),
    ).toEqual({ dataDirectory: "d", durability: "fsync" });
    expect(
      applyConfigFile(
        { dataDirectory: "d" },
        { writeConcern: "memory" },
        { SINTERDB_DURABILITY: "fsync" },
      ),
    ).toEqual({ dataDirectory: "d" });
  });
});

describe("isConfigKey", () => {
  it("accepts only the known keys", () => {
    expect(isConfigKey("port")).toBe(true);
    expect(isConfigKey("durability")).toBe(false);
    expect(isConfigKey("toString")).toBe(false);
  });
});
