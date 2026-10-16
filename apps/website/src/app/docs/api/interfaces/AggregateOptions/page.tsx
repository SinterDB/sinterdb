import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 199,
  name: "AggregateOptions",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/AggregateOptions",
  since: null,
  description: "Options for SinterCollection.aggregate.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["AggregateOptions", "name"],
  ],
  comment: {
    summary:
      '<p>Options for <a href="/docs/api/classes/SinterCollection#aggregate">SinterCollection.aggregate</a>.</p>',
    short:
      'Options for <a href="/docs/api/classes/SinterCollection#aggregate">SinterCollection.aggregate</a>.',
    deprecated: null,
    modifiers: [],
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
          id: 200,
          name: "batchSize",
          anchor: "batch-size",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["batchSize", "name"],
            ["?: ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary:
              "<p>How many documents the cursor fetches from the server per round trip.</p>",
            short:
              "How many documents the cursor fetches from the server per round trip.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/aggregation.ts",
              line: 54,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/aggregation.ts#L54",
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
          anchor: "batch-size",
          name: "batchSize",
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
      path: "packages/driver/src/aggregation.ts",
      line: 50,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/aggregation.ts#L50",
    },
  ],
  usedBy: [
    {
      name: "SinterCollection.aggregate",
      href: "/docs/api/classes/SinterCollection#aggregate",
      kind: "method",
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
