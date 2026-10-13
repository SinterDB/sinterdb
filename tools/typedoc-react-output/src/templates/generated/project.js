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
    newIn: model.newIn,
  };

  return `import type { ApiProject } from "./model";

export const project: ApiProject = ${JSON.stringify(project, null, 2)};
`;
}
