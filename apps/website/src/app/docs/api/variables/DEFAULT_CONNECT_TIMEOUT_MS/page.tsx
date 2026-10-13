import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 29,
  name: "DEFAULT_CONNECT_TIMEOUT_MS",
  kind: "variable",
  label: "Variable",
  href: "/docs/api/variables/DEFAULT_CONNECT_TIMEOUT_MS",
  description: "The default connectTimeoutMS: 10 seconds.",
  badges: [],
  declaration: [
    ["const ", "kw"],
    ["DEFAULT_CONNECT_TIMEOUT_MS", "name"],
    [": ", "pn"],
    ["10000", "lit"],
  ],
  comment: {
    summary: "<p>The default <code>connectTimeoutMS</code>: 10 seconds.</p>",
    short: "The default <code>connectTimeoutMS</code>: 10 seconds.",
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [],
  hierarchy: null,
  signatureSection: null,
  signatures: [],
  sections: [],
  toc: [],
  sources: [
    {
      path: "packages/driver/src/client.ts",
      line: 31,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L31",
    },
  ],
} satisfies ApiPage;

export const metadata: Metadata = {
  title: page.name,
  description: page.description || undefined,
};

export default function Page() {
  return <ApiReflectionPage page={page} />;
}
