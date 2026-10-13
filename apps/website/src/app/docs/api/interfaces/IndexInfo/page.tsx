import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 685,
  name: "IndexInfo",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/IndexInfo",
  since: null,
  description:
    "A description of an index, as returned by SinterCollection.indexes.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["IndexInfo", "name"],
  ],
  comment: {
    summary:
      '<p>A description of an index, as returned by <a href="/docs/api/classes/SinterCollection#indexes">SinterCollection.indexes</a>.</p>',
    short:
      'A description of an index, as returned by <a href="/docs/api/classes/SinterCollection#indexes">SinterCollection.indexes</a>.',
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
          id: 688,
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
              line: 48,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L48",
            },
          ],
        },
        {
          id: 687,
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
            summary: "<p>The indexed field path.</p>",
            short: "The indexed field path.",
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
              line: 46,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L46",
            },
          ],
        },
        {
          id: 686,
          name: "name",
          anchor: "name",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["name", "name"],
            [": ", "pn"],
            ["string", "prim"],
          ],
          comment: {
            summary: "<p>The index name.</p>",
            short: "The index name.",
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
              line: 44,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L44",
            },
          ],
        },
        {
          id: 690,
          name: "sparse",
          anchor: "sparse",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["sparse", "name"],
            [": ", "pn"],
            ["boolean", "prim"],
          ],
          comment: {
            summary:
              "<p>Whether documents without the field are left out of the index.</p>",
            short:
              "Whether documents without the field are left out of the index.",
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
              line: 52,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L52",
            },
          ],
        },
        {
          id: 689,
          name: "unique",
          anchor: "unique",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["unique", "name"],
            [": ", "pn"],
            ["boolean", "prim"],
          ],
          comment: {
            summary: "<p>Whether the index rejects duplicate values.</p>",
            short: "Whether the index rejects duplicate values.",
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
              line: 50,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L50",
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
        {
          anchor: "name",
          name: "name",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "sparse",
          name: "sparse",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "unique",
          name: "unique",
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
      line: 42,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L42",
    },
  ],
  usedBy: [
    {
      name: "SinterCollection.indexes",
      href: "/docs/api/classes/SinterCollection#indexes",
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
