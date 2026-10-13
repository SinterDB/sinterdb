/**
 * Options the components read at render time.
 */
export function renderGeneratedConfigTemplate(options) {
  const config = {
    routeBase: options.routeBase,
    colorScheme: options.theme.colorScheme,
    features: options.features,
  };

  return `export const config = ${JSON.stringify(config, null, 2)} as const;
`;
}
