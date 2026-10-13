import { relativePrefix, serialize } from "./serialize.js";

export function renderHierarchyPageTemplate({
  nodes,
  componentsDirectory,
  generatedDirectory,
}) {
  const up = relativePrefix("hierarchy");

  return `import type { Metadata } from "next";

import { ApiHierarchyPage } from "${up}${componentsDirectory}/pages";
import type { ApiHierarchyNode } from "${up}${generatedDirectory}/model";

const nodes: readonly ApiHierarchyNode[] = ${serialize(nodes)};

export const metadata: Metadata = {
  title: "Hierarchy",
};

export default function Page() {
  return <ApiHierarchyPage nodes={nodes} />;
}
`;
}
