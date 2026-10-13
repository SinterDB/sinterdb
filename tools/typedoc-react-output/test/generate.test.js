import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Application, LogLevel } from "typedoc";
import ts from "typescript";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures");
const plugin = join(here, "..", "src", "index.js");

const temporary = [];

afterAll(async () => {
  await Promise.all(
    temporary.map((path) => rm(path, { recursive: true, force: true })),
  );
});

/**
 * Runs TypeDoc with the plugin on one fixture and returns the output folder.
 *
 * @param {string} fixture
 * @param {object} [reactOutput]
 */
async function generate(fixture, reactOutput = {}) {
  const output = await mkdtemp(join(tmpdir(), `react-output-${fixture}-`));
  temporary.push(output);

  const app = await Application.bootstrapWithPlugins({
    entryPoints: [join(fixtures, fixture, "index.ts")],
    tsconfig: join(fixtures, "tsconfig.json"),
    plugin: [plugin],
    readme: "none",
    logLevel: LogLevel.Error,
    outputs: [{ name: "react", path: output }],
    reactOutput: {
      routeBase: "/api",
      features: { sourceLinks: false },
      ...reactOutput,
    },
  });

  // TypeDoc logs output errors instead of throwing; collect and rethrow them.
  const errors = [];
  const log = app.logger.log.bind(app.logger);
  app.logger.log = (message, level) => {
    if (level === LogLevel.Error) {
      errors.push(String(message));
    }
    log(message, level);
  };

  const project = await app.convert();
  expect(project).toBeDefined();
  await app.generateOutputs(project);

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  return output;
}

/** Imports a generated data file by compiling away its types. */
async function load(output, file) {
  const source = await readFile(join(output, "_generated", file), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });

  return import(
    `data:text/javascript;charset=utf-8,${encodeURIComponent(outputText)}`
  );
}

/** Type-checks the generated data files on their own. */
function typeErrors(output) {
  const files = ["model.ts", "project.ts", "search.ts", "config.ts"].map(
    (file) => join(output, "_generated", file),
  );
  const program = ts.createProgram(files, {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  });

  return ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    );
}

async function readPage(output, route) {
  return readFile(join(output, route, "page.tsx"), "utf8");
}

describe("a project with deprecations and @since tags", () => {
  let output;
  let project;
  let searchIndex;

  beforeAll(async () => {
    output = await generate("full");
    ({ project } = await load(output, "project.ts"));
    ({ searchIndex } = await load(output, "search.ts"));
  }, 120_000);

  it("writes a page per export plus the index and hierarchy", async () => {
    await expect(readPage(output, "classes/Store")).resolves.toContain(
      "ApiReflectionPage",
    );
    await expect(
      readPage(output, "interfaces/FindOptions"),
    ).resolves.toBeTruthy();
    await expect(readPage(output, "")).resolves.toContain("ApiIndexPage");
    await expect(readPage(output, "hierarchy")).resolves.toBeTruthy();
  });

  it("lists own, overload and inherited deprecations", () => {
    const byName = Object.fromEntries(
      project.deprecated.map((item) => [item.name, item]),
    );

    expect(byName.FindOptions).toMatchObject({
      href: "/api/interfaces/FindOptions",
      reason: "Use QueryOptions instead.",
      inheritedFrom: null,
    });
    expect(byName["Store.legacy"]).toMatchObject({
      href: "/api/classes/Store#legacy",
      inheritedFrom: null,
    });
    expect(byName["OldStore.size"]).toMatchObject({
      inheritedFrom: "OldStore",
    });
    expect(byName.Store).toBeUndefined();
    expect(byName["Store.query"]).toBeUndefined();
  });

  it("marks deprecated pages in the sidebar data", () => {
    const items = project.navigation.flatMap((group) => group.items);
    const flags = Object.fromEntries(
      items.map((item) => [item.name, item.deprecated]),
    );

    expect(flags).toMatchObject({
      FindOptions: true,
      OldStore: true,
      Store: false,
      QueryOptions: false,
    });
  });

  it("marks doc-comment links to deprecated targets", async () => {
    // QueryOptions: "Replaces {@link FindOptions}."
    expect(await readPage(output, "interfaces/QueryOptions")).toContain(
      '<a href="/api/interfaces/FindOptions" class="tdk-deprecated" title="Deprecated: Use QueryOptions instead.">FindOptions</a>',
    );
    // Links to targets that aren't deprecated stay plain.
    expect(await readPage(output, "interfaces/QueryOptions")).toContain(
      '<a href="/api/classes/Store#query">Store.query</a>',
    );
  });

  it("records what uses each type", async () => {
    const page = await readPage(output, "interfaces/FindOptions");

    expect(page).toMatch(/usedBy:\s*\[\s*\{\s*name: "Store\.find"/u);
    expect(await readPage(output, "classes/OldStore")).toMatch(/usedBy: \[\]/u);
  });

  it("collects the newest @since version", () => {
    expect(project.newIn.version).toBe("1.1.0");
    expect(project.newIn.items.map((item) => item.name).toSorted()).toEqual([
      "QueryOptions",
      "Store.query",
    ]);
  });

  it("indexes pages and members for search", () => {
    const query = searchIndex.find(
      (entry) => entry.parent === "Store" && entry.name === "query",
    );

    expect(query).toMatchObject({
      kind: "method",
      href: "/api/classes/Store#query",
      summary: "Queries things.",
      since: "1.1.0",
      deprecated: false,
    });
    expect(query.code).toContain("query(options?: QueryOptions)");
    expect(
      searchIndex.find((entry) => entry.name === "legacy")?.deprecated,
    ).toBe(true);
  });

  it("generates data that type-checks", () => {
    expect(typeErrors(output)).toEqual([]);
  });
});

describe("a project with no deprecations or @since tags", () => {
  let output;
  let project;

  beforeAll(async () => {
    output = await generate("plain");
    ({ project } = await load(output, "project.ts"));
  }, 120_000);

  it("writes empty lists, not missing ones", () => {
    expect(project.deprecated).toEqual([]);
    expect(project.newIn).toBeNull();
  });

  // An empty array used to be typed `never[]`, so any use of it failed.
  it("generates data that type-checks", () => {
    expect(typeErrors(output)).toEqual([]);
  });
});

describe("components.overrides", () => {
  it("copies the site's files over the theme and skips markdown", async () => {
    const overrides = await mkdtemp(join(tmpdir(), "react-output-overrides-"));
    temporary.push(overrides);
    await mkdir(overrides, { recursive: true });
    await writeFile(join(overrides, "utils.ts"), "// overridden\n");
    await writeFile(join(overrides, "README.md"), "# not copied\n");

    const output = await generate("plain", {
      components: { overrides },
    });
    const components = join(output, "_components");

    await expect(readFile(join(components, "utils.ts"), "utf8")).resolves.toBe(
      "// overridden\n",
    );
    await expect(readFile(join(components, "README.md"))).rejects.toThrow();
    await expect(readFile(join(components, "pages.tsx"))).resolves.toBeTruthy();
  }, 120_000);

  it("fails clearly when the folder doesn't exist", async () => {
    await expect(
      generate("plain", { components: { overrides: "./does-not-exist" } }),
    ).rejects.toThrow(/components\.overrides/u);
  }, 120_000);
});
