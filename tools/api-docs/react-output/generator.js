import { cp, mkdir, rm, stat } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { generateDeclarations } from "./declarations/index.js";
import { writeFormatted } from "./format.js";
import { ModelContext } from "./model/context.js";
import { createMarkdownRenderer } from "./model/markdown.js";
import { createProjectModel } from "./model/project.js";
import { SourceResolver } from "./model/source.js";
import { renderGeneratedConfigTemplate } from "./templates/generated/config.js";
import { renderGeneratedModelTemplate } from "./templates/generated/model.js";
import { renderGeneratedProjectTemplate } from "./templates/generated/project.js";
import { renderHierarchyPageTemplate } from "./templates/hierarchy-page.js";
import { renderIndexPageTemplate } from "./templates/index-page.js";
import { renderLayoutTemplate } from "./templates/layout.js";
import { renderReflectionPageTemplate } from "./templates/reflection-page.js";

const THEMES_DIRECTORY = join(
  dirname(fileURLToPath(import.meta.url)),
  "themes",
);

/**
 * Writes a Next.js App Router segment:
 *
 * ```text
 * layout.tsx, page.tsx          index and shared layout
 * <kind>/<name>/page.tsx        one page per export
 * hierarchy/page.tsx            inheritance overview
 * _components/                  themes/<theme.name>, then components.overrides
 * _generated/                   model types, project data, config
 * _types/                       optional standalone declarations
 * ```
 *
 * @param {{
 *   project: import("typedoc").ProjectReflection;
 *   options: import("./options.js").ReactOutputOptions;
 * }} input
 */
export async function generateReactOutput({ project, options }) {
  const themeDirectory = join(THEMES_DIRECTORY, options.theme.name);

  if (!(await isDirectory(themeDirectory))) {
    throw new Error(
      `reactOutput: unknown theme "${options.theme.name}" (looked in ${themeDirectory})`,
    );
  }

  const ctx = new ModelContext({
    project,
    options,
    markdown: await createMarkdownRenderer(options.theme.codeThemes),
    sources: new SourceResolver({
      repository: options.repository,
      revision: options.revision,
      enabled: options.features.sourceLinks,
    }),
  });

  const model = createProjectModel(ctx);
  const output = options.outputPath;
  const directories = {
    componentsDirectory: options.components.directory,
    generatedDirectory: options.generated.directory,
  };

  if (options.cleanOutput) {
    await rm(output, { recursive: true, force: true });
  }

  await mkdir(join(output, options.generated.directory), { recursive: true });
  await copyComponents(themeDirectory, options, output);

  await Promise.all([
    write(
      output,
      `${options.generated.directory}/model.ts`,
      renderGeneratedModelTemplate(),
    ),
    write(
      output,
      `${options.generated.directory}/project.ts`,
      renderGeneratedProjectTemplate(model),
    ),
    write(
      output,
      `${options.generated.directory}/config.ts`,
      renderGeneratedConfigTemplate(options),
    ),
    write(output, "layout.tsx", renderLayoutTemplate(directories)),
    write(
      output,
      "page.tsx",
      renderIndexPageTemplate({ groups: model.index, ...directories }),
    ),
    options.features.hierarchy &&
      write(
        output,
        "hierarchy/page.tsx",
        renderHierarchyPageTemplate({ nodes: model.hierarchy, ...directories }),
      ),
    ...model.pages.map(({ route, page }) =>
      write(
        output,
        `${route}/page.tsx`,
        renderReflectionPageTemplate({ route, page, ...directories }),
      ),
    ),
    generateDeclarations({ outputPath: output, options }),
  ]);
}

/**
 * Copies the theme, then the site's own versions of any theme files on top.
 * The overrides live outside the output folder, so `cleanOutput` never
 * deletes them.
 */
async function copyComponents(themeDirectory, options, output) {
  const target = join(output, options.components.directory);

  await cp(themeDirectory, target, { recursive: true });

  if (!options.components.overrides) {
    return;
  }

  const overrides = resolve(options.components.overrides);

  if (!(await isDirectory(overrides))) {
    throw new Error(
      `reactOutput: components.overrides "${options.components.overrides}" is not a directory (looked in ${overrides})`,
    );
  }

  await cp(overrides, target, {
    recursive: true,
    filter: (source) => !/\.md$/iu.test(basename(source)),
  });
}

function write(root, path, contents) {
  return writeFormatted(join(root, path), contents);
}

async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}
