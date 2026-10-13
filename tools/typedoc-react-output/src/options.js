import { ParameterType } from "typedoc";

const DEFAULT_REACT_OUTPUT_OPTIONS = {
  framework: "next",
  routeBase: "/docs/api",
  cleanOutput: true,
  repository: null,
  generated: {
    directory: "_generated",
  },
  components: {
    directory: "_components",
    overrides: null,
  },
  declarations: {
    enabled: true,
    directory: "_types",
    moduleName: null,
  },
  features: {
    hierarchy: true,
    navigation: true,
    pageNavigation: true,
    sourceLinks: true,
    comments: true,
    externalInherited: false,
  },
  theme: {
    name: "default",
    colorScheme: "dark",
    codeThemes: {
      light: "github-light-default",
      dark: "github-dark-default",
    },
  },
};

export function registerReactOutputOptions(app) {
  app.options.addDeclaration({
    name: "reactOutput",
    help: "Configuration for the React output generator.",
    type: ParameterType.Object,
    defaultValue: {},
  });
}

/**
 * @typedef {ReturnType<typeof resolveReactOutputOptions>} ReactOutputOptions
 */

/**
 * @param {{ app: import("typedoc").Application; outputPath: string }} input
 */
export function resolveReactOutputOptions({ app, outputPath }) {
  const input = app.options.getValue("reactOutput") ?? {};
  const theme = { ...DEFAULT_REACT_OUTPUT_OPTIONS.theme, ...input.theme };

  return {
    outputPath,
    framework: input.framework ?? DEFAULT_REACT_OUTPUT_OPTIONS.framework,
    routeBase: input.routeBase ?? DEFAULT_REACT_OUTPUT_OPTIONS.routeBase,
    cleanOutput: input.cleanOutput ?? DEFAULT_REACT_OUTPUT_OPTIONS.cleanOutput,
    repository: input.repository ?? DEFAULT_REACT_OUTPUT_OPTIONS.repository,
    // TypeDoc's own option, so a release can pin source links to its tag.
    revision: app.options.getValue("gitRevision") || null,
    generated: {
      ...DEFAULT_REACT_OUTPUT_OPTIONS.generated,
      ...input.generated,
    },
    components: {
      ...DEFAULT_REACT_OUTPUT_OPTIONS.components,
      ...input.components,
    },
    declarations: {
      ...DEFAULT_REACT_OUTPUT_OPTIONS.declarations,
      ...input.declarations,
    },
    features: {
      ...DEFAULT_REACT_OUTPUT_OPTIONS.features,
      ...input.features,
    },
    theme: {
      ...theme,
      codeThemes: {
        ...DEFAULT_REACT_OUTPUT_OPTIONS.theme.codeThemes,
        ...input.theme?.codeThemes,
      },
    },
  };
}
