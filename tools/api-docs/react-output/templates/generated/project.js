/**
 * Project-wide data imported by every page: name, links and the sidebar.
 */
export function renderGeneratedProjectTemplate(model) {
  const project = {
    name: model.name,
    href: model.href,
    summary: model.summary,
    hierarchyHref: model.hierarchyHref,
    navigation: model.navigation,
    deprecated: model.deprecated,
  };

  return `import type { ApiProject } from "./model";

export const project = ${JSON.stringify(project, null, 2)} satisfies ApiProject;
`;
}
