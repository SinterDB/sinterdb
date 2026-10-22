import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 179,
  name: "SinterClientState",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/SinterClientState",
  since: null,
  description: "A value of SinterClientState.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["SinterClientState", "name"],
    [" = ", "pn"],
    ["typeof ", "kw"],
    ["SinterClientState", "ref", "/docs/api/variables/SinterClientState"],
    ["[", "pn"],
    ["keyof typeof ", "kw"],
    ["SinterClientState", "ref", "/docs/api/variables/SinterClientState"],
    ["]", "pn"],
  ],
  comment: {
    summary:
      '<p>A value of <a href="/docs/api/variables/SinterClientState">SinterClientState</a>.</p>',
    short:
      'A value of <a href="/docs/api/variables/SinterClientState">SinterClientState</a>.',
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [],
  hierarchy: null,
  signatureSection: null,
  signatures: [],
  sections: [],
  toc: [
    {
      id: "used-by",
      title: "Used by",
      items: [],
    },
  ],
  sources: [
    {
      path: "packages/driver/src/client.ts",
      line: 125,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/client.ts#L125",
    },
    {
      path: "packages/driver/src/client.ts",
      line: 139,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/client.ts#L139",
    },
  ],
  usedBy: [
    {
      name: "SinterClient.state",
      href: "/docs/api/classes/SinterClient#state",
      kind: "accessor",
    },
  ],
};

export const metadata: Metadata = {
  title: page.name,
  description: page.description || undefined,
};

export default function Page() {
  return <ApiReflectionPage page={page} />;
}
