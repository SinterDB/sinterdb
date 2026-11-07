import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SERVER_PORT,
  SERVER_ENVIRONMENT_VARIABLES,
} from "@sinterdb-internal/server";
import { describe, expect, it } from "vitest";

import { parseCliArguments } from "./cli.js";
import { shouldOpenConsole } from "./console-launch.js";

// The Dockerfile, the Compose example, and docs/docker.md must agree with each
// other and with the server. CI builds the image and runs it for real
// (packages/driver/src/docker.integration.test.ts); these checks run anywhere,
// including machines without Docker.

function read(path: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../${path}`, import.meta.url)),
    "utf8",
  );
}

const dockerfile = read("Dockerfile");
const compose = read("examples/docker/compose.yaml");
const guide = read("docs/docker.md");
const rootPackage = JSON.parse(read("package.json")) as {
  packageManager: string;
};

function runtimeStage(): string {
  const index = dockerfile.lastIndexOf("AS runtime");

  expect(index).toBeGreaterThan(0);

  return dockerfile.slice(index);
}

function environmentOfRuntimeStage(): Map<string, string> {
  const block = /^ENV ((?:.*\\\n)*.*)$/m.exec(runtimeStage());

  expect(block).not.toBeNull();

  const pairs = (block?.[1] ?? "").replaceAll("\\\n", " ").trim().split(/\s+/);

  return new Map(
    pairs.map((pair) => {
      const [name, ...value] = pair.split("=");

      return [name as string, value.join("=")];
    }),
  );
}

describe("Dockerfile", () => {
  it("installs the pnpm version the repository pins", () => {
    const pinned = /^pnpm@(.+)$/.exec(rootPackage.packageManager)?.[1];
    const used = /^ARG PNPM_VERSION=(.+)$/m.exec(dockerfile)?.[1];

    expect(pinned).toBeDefined();
    expect(used).toBe(pinned);
  });

  it("builds on the Node.js major the packages require", () => {
    const argument = /^ARG NODE_VERSION=(\d+)$/m.exec(dockerfile)?.[1];
    const requirement = /^>=(\d+)\./.exec(
      (
        JSON.parse(read("apps/server-cli/package.json")) as {
          engines: { node: string };
        }
      ).engines.node,
    )?.[1];

    expect(argument).toBeDefined();
    expect(Number(argument)).toBeGreaterThanOrEqual(Number(requirement));
  });

  it("configures the server only through variables the server reads", () => {
    const environment = environmentOfRuntimeStage();
    const configured = [...environment.keys()].filter((name) =>
      name.startsWith("SINTERDB_"),
    );

    expect(configured.length).toBeGreaterThan(0);

    for (const name of configured) {
      expect(Object.values(SERVER_ENVIRONMENT_VARIABLES)).toContain(name);
    }
  });

  it("listens on all interfaces, on the default port, and stores data in the volume", () => {
    const environment = environmentOfRuntimeStage();

    expect(environment.get("SINTERDB_HOST")).toBe("0.0.0.0");
    expect(Number(environment.get("SINTERDB_PORT"))).toBe(DEFAULT_SERVER_PORT);
    expect(runtimeStage()).toContain(`EXPOSE ${DEFAULT_SERVER_PORT}`);

    const dataDirectory = environment.get("SINTERDB_DATA_DIR");

    expect(dataDirectory).toBe("/data");
    expect(runtimeStage()).toContain(`VOLUME ${dataDirectory}`);
  });

  it("takes over the lock a killed container leaves in the volume", () => {
    expect(environmentOfRuntimeStage().get("SINTERDB_RECLAIM_LOCK")).toBe(
      "true",
    );
    expect(guide).toContain("SINTERDB_RECLAIM_LOCK");
  });

  it("never opens the console, even with docker run -it", () => {
    const command = parseCliArguments([]);

    if (command.kind !== "start") {
      throw new Error("Expected a start command.");
    }

    expect(
      shouldOpenConsole({
        command,
        environment: {
          TERM: "xterm",
          ...Object.fromEntries(environmentOfRuntimeStage()),
        },
        file: {},
        interactive: true,
      }),
    ).toBe(false);
  });

  it("does not run the server as root, and the data directory belongs to that user", () => {
    expect(runtimeStage()).toMatch(/^USER node$/m);
    expect(runtimeStage()).toContain("chown node:node /data");
  });

  it("has a health check and runs the bundled server directly", () => {
    expect(runtimeStage()).toMatch(/^HEALTHCHECK /m);
    expect(runtimeStage()).toContain('ENTRYPOINT ["node", "/app/index.js"]');
  });
});

describe("examples/docker/compose.yaml", () => {
  it("publishes the server on localhost only", () => {
    const ports = [...compose.matchAll(/^\s+- "([^"]*:\d+)"\s*$/gm)].map(
      (match) => match[1] as string,
    );

    expect(ports).toHaveLength(1);
    expect(ports[0]).toMatch(
      new RegExp(
        `^127\\.0\\.0\\.1:\\$\\{[A-Z_]+:-${DEFAULT_SERVER_PORT}\\}:${DEFAULT_SERVER_PORT}$`,
      ),
    );
  });

  it("mounts a named volume at the image's data directory", () => {
    expect(compose).toMatch(/^\s+- sinterdb-data:\/data\s*$/m);
    expect(compose).toMatch(/^volumes:\n\s+sinterdb-data:/m);
  });

  it("builds the Dockerfile at the root of the repository", () => {
    expect(compose).toMatch(/context: \.\.\/\.\.$/m);
    expect(compose).toMatch(/dockerfile: Dockerfile$/m);
  });

  it("gives the server longer to stop than it needs to", () => {
    const seconds = Number(/stop_grace_period: (\d+)s/.exec(compose)?.[1]);

    // The server force-closes connections after five seconds.
    expect(seconds).toBeGreaterThan(5);
  });
});

describe("docs/docker.md", () => {
  it("mentions the same values the image uses", () => {
    expect(guide).toContain("`/data`");
    expect(guide).toContain(`\`${DEFAULT_SERVER_PORT}\``);
    expect(guide).toContain("`0.0.0.0`");
    expect(guide).toContain("user id `1000`");
  });

  it("publishes ports on 127.0.0.1 in every docker run command", () => {
    const publishes = [...guide.matchAll(/--publish (\S+)/g)].map(
      (match) => match[1] as string,
    );

    expect(publishes.length).toBeGreaterThan(0);

    for (const publish of publishes) {
      expect(publish.startsWith("127.0.0.1:")).toBe(true);
    }
  });

  it("only uses environment variables the server reads", () => {
    for (const match of guide.matchAll(/SINTERDB_[A-Z_]+/g)) {
      expect([
        ...Object.values(SERVER_ENVIRONMENT_VARIABLES),
        "SINTERDB_PUBLISH_PORT",
      ]).toContain(match[0]);
    }
  });
});
