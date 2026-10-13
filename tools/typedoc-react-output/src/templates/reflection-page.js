import { relativePrefix, serialize } from "./serialize.js";

export function renderReflectionPageTemplate({
  route,
  page,
  componentsDirectory,
  generatedDirectory,
}) {
  const up = relativePrefix(route);

  return `import type { Metadata } from "next";

import { ApiReflectionPage } from "${up}${componentsDirectory}/pages";
import type { ApiPage } from "${up}${generatedDirectory}/model";

const page: ApiPage = ${serialize(page)};

export const metadata: Metadata = {
  title: page.name,
  description: page.description || undefined,
};

export default function Page() {
  return <ApiReflectionPage page={page} />;
}
`;
}
