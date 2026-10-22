import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 30,
  name: "DEFAULT_REQUEST_TIMEOUT_MS",
  kind: "variable",
  label: "Variable",
  href: "/docs/api/variables/DEFAULT_REQUEST_TIMEOUT_MS",
  since: null,
  description: "The default requestTimeoutMS: 10 seconds.",
  badges: [],
  declaration: [
    ["const ", "kw"],
    ["DEFAULT_REQUEST_TIMEOUT_MS", "name"],
    [": ", "pn"],
    ["10000", "lit"],
  ],
  comment: {
    summary: "<p>The default <code>requestTimeoutMS</code>: 10 seconds.</p>",
    short: "The default <code>requestTimeoutMS</code>: 10 seconds.",
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
      line: 33,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/client.ts#L33",
    },
  ],
  usedBy: [],
};

export const metadata: Metadata = {
  title: page.name,
  description: page.description || undefined,
};

export default function Page() {
  return <ApiReflectionPage page={page} />;
}
