import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 740,
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
          id: 743,
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
              "<p><code>1</code> for ascending or <code>-1</code> for descending, for the first field.</p>",
            short:
              "<code>1</code> for ascending or <code>-1</code> for descending, for the first field.",
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
              line: 95,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L95",
            },
          ],
        },
        {
          id: 742,
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
            summary:
              "<p>The first indexed field path. Use <code>keys</code> for a compound index.</p>",
            short:
              "The first indexed field path. Use <code>keys</code> for a compound index.",
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
              line: 93,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L93",
            },
          ],
        },
        {
          id: 744,
          name: "keys",
          anchor: "keys",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["keys", "name"],
            [": ", "pn"],
            ["readonly ", "kw"],
            ["IndexKeyInfo", "ref", "/docs/api/interfaces/IndexKeyInfo"],
            ["[]", "pn"],
          ],
          comment: {
            summary:
              "<p>Every indexed field in order. One entry unless the index is compound.</p>",
            short:
              "Every indexed field in order. One entry unless the index is compound.",
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
              line: 97,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L97",
            },
          ],
        },
        {
          id: 741,
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
              line: 91,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L91",
            },
          ],
        },
        {
          id: 746,
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
              line: 101,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L101",
            },
          ],
        },
        {
          id: 745,
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
              line: 99,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L99",
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
          anchor: "keys",
          name: "keys",
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
      line: 89,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L89",
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
