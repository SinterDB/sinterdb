import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 311,
  name: "DEFAULT_SINTERDB_PORT",
  kind: "variable",
  label: "Variable",
  href: "/docs/api/variables/DEFAULT_SINTERDB_PORT",
  since: null,
  description:
    "The port used when a connection string does not name one: 4721.",
  badges: [],
  declaration: [
    ["const ", "kw"],
    ["DEFAULT_SINTERDB_PORT", "name"],
    [": ", "pn"],
    ["4721", "lit"],
  ],
  comment: {
    summary:
      "<p>The port used when a connection string does not name one: 4721.</p>",
    short: "The port used when a connection string does not name one: 4721.",
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
      path: "packages/driver/src/connection-string.ts",
      line: 5,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/connection-string.ts#L5",
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
