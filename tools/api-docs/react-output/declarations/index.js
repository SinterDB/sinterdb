import { join } from "node:path";

import { writeFormatted } from "../format.js";

import { renderModelDeclarations } from "./model.js";
import { renderModuleDeclarations } from "./modules.js";
import { renderRendererDeclarations } from "./renderer.js";

/**
 * @param {{
 *   outputPath: string;
 *   options: {
 *     declarations: {
 *       enabled: boolean;
 *       directory: string;
 *       moduleName: string | null;
 *     };
 *   };
 * }} inputs
 */
export async function generateDeclarations({ outputPath, options }) {
  const declarationOptions = options.declarations;

  if (!declarationOptions.enabled) {
    return;
  }

  const directory = join(outputPath, declarationOptions.directory);

  const files = [
    writeFormatted(join(directory, "model.d.ts"), renderModelDeclarations()),
    writeFormatted(
      join(directory, "renderer.d.ts"),
      renderRendererDeclarations(),
    ),
    writeFormatted(join(directory, "index.d.ts"), renderIndexDeclarations()),
  ];

  const modules = renderModuleDeclarations({
    moduleName: declarationOptions.moduleName,
  });

  if (modules) {
    files.push(writeFormatted(join(directory, "modules.d.ts"), modules));
  }

  await Promise.all(files);
}

function renderIndexDeclarations() {
  return `export * from "./model";
export * from "./renderer";`;
}
