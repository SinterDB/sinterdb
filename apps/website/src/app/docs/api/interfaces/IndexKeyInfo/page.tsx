import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 811,
  name: "IndexKeyInfo",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/IndexKeyInfo",
  since: null,
  description: "One field of an index and the order it is kept in.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["IndexKeyInfo", "name"],
  ],
  comment: {
    summary: "<p>One field of an index and the order it is kept in.</p>",
    short: "One field of an index and the order it is kept in.",
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
          id: 813,
          name: "direction",
          anchor: "direction",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["direction", "name"],
            [": ", "pn"],
            ["-1", "lit"],
            [" | ", "pn"],
            ["1", "lit"],
          ],
          comment: {
            summary:
              "<p><code>1</code> for ascending or <code>-1</code> for descending.</p>",
            short:
              "<code>1</code> for ascending or <code>-1</code> for descending.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 83,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L83",
            },
          ],
        },
        {
          id: 812,
          name: "field",
          anchor: "field",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["field", "name"],
            [": ", "pn"],
            ["string", "prim"],
          ],
          comment: {
            summary: "<p>The field path.</p>",
            short: "The field path.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 81,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L81",
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
          anchor: "direction",
          name: "direction",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "field",
          name: "field",
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
      line: 79,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L79",
    },
  ],
  usedBy: [
    {
      name: "IndexInfo.keys",
      href: "/docs/api/interfaces/IndexInfo#keys",
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
