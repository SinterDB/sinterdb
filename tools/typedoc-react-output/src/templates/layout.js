/**
 * Layout for the API route segment: loads the stylesheet and gives child
 * pages a title template.
 */
export function renderLayoutTemplate({
  componentsDirectory,
  generatedDirectory,
}) {
  return `import type { Metadata } from "next";
import type { ReactNode } from "react";

import { project } from "./${generatedDirectory}/project";
import "./${componentsDirectory}/api.css";

export const metadata: Metadata = {
  title: {
    default: project.name,
    template: \`%s · \${project.name}\`,
  },
};

export default function ApiLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
`;
}
