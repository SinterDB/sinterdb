import { generateReactOutput } from "./generator.js";
import {
  registerReactOutputOptions,
  resolveReactOutputOptions,
} from "./options.js";

/**
 * TypeDoc plugin entry point.
 *
 * @param {import("typedoc").Application} app
 */
export function load(app) {
  registerReactOutputOptions(app);

  app.outputs.addOutput("react", async (outputPath, project) => {
    const options = resolveReactOutputOptions({
      app,
      outputPath,
    });

    await generateReactOutput({
      project,
      options,
    });
  });
}
