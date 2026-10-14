import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 721,
  name: "IndexBoundInfo",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/IndexBoundInfo",
  since: null,
  description: "One end of an index range in an ExplainResult.",
  badges: ["beta"],
  declaration: [
    ["interface ", "kw"],
    ["IndexBoundInfo", "name"],
  ],
  comment: {
    summary:
      '<p>One end of an index range in an <a href="/docs/api/interfaces/ExplainResult">ExplainResult</a>.</p>',
    short:
      'One end of an index range in an <a href="/docs/api/interfaces/ExplainResult">ExplainResult</a>.',
    deprecated: null,
    modifiers: ["beta"],
    blocks: [],
  },
  typeParameters: [],
  hierarchy: null,
  signatureSection: null,
  signatures: [],
  sections: [
    {
      id: "properties",
      title: "Properties",
      members: [
        {
          id: 723,
          name: "inclusive",
          anchor: "inclusive",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: ["beta"],
          code: [
            ["readonly ", "kw"],
            ["inclusive", "name"],
            [": ", "pn"],
            ["boolean", "prim"],
          ],
          comment: {
            summary:
              "<p>Whether documents equal to the bound are included.</p>",
            short: "Whether documents equal to the bound are included.",
            deprecated: null,
            modifiers: ["beta"],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 64,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L64",
            },
          ],
        },
        {
          id: 722,
          name: "value",
          anchor: "value",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: ["beta"],
          code: [
            ["readonly ", "kw"],
            ["value", "name"],
            [": ", "pn"],
            ["DocumentValue", "ref"],
          ],
          comment: {
            summary: "<p>The bound value.</p>",
            short: "The bound value.",
            deprecated: null,
            modifiers: ["beta"],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 62,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L62",
            },
          ],
        },
      ],
    },
  ],
  toc: [
    {
      id: "properties",
      title: "Properties",
      items: [
        {
          anchor: "inclusive",
          name: "inclusive",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "value",
          name: "value",
          kind: "property",
          deprecated: false,
        },
      ],
    },
    {
      id: "used-by",
      title: "Used by",
      items: [],
    },
  ],
  sources: [
    {
      path: "packages/driver/src/indexes.ts",
      line: 60,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L60",
    },
  ],
  usedBy: [
    {
      name: "ExplainResult.lower",
      href: "/docs/api/interfaces/ExplainResult#lower",
      kind: "property",
    },
    {
      name: "ExplainResult.upper",
      href: "/docs/api/interfaces/ExplainResult#upper",
      kind: "property",
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
