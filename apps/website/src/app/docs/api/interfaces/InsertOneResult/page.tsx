import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 352,
  name: "InsertOneResult",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/InsertOneResult",
  since: null,
  description: "The result of SinterCollection.insertOne.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["InsertOneResult", "name"],
  ],
  comment: {
    summary:
      '<p>The result of <a href="/docs/api/classes/SinterCollection#insert-one">SinterCollection.insertOne</a>.</p>',
    short:
      'The result of <a href="/docs/api/classes/SinterCollection#insert-one">SinterCollection.insertOne</a>.',
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
          id: 353,
          name: "acknowledged",
          anchor: "acknowledged",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["acknowledged", "name"],
            [": ", "pn"],
            ["true", "lit"],
          ],
          comment: {
            summary:
              "<p>Always <code>true</code>; a failed insert throws instead.</p>",
            short: "Always <code>true</code>; a failed insert throws instead.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/collection.ts",
              line: 116,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/collection.ts#L116",
            },
          ],
        },
        {
          id: 354,
          name: "insertedId",
          anchor: "inserted-id",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["insertedId", "name"],
            [": ", "pn"],
            ["CustomId", "ref", "/docs/api/classes/CustomId"],
          ],
          comment: {
            summary:
              "<p>The <code>_id</code> of the inserted document, whether supplied or generated.</p>",
            short:
              "The <code>_id</code> of the inserted document, whether supplied or generated.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/collection.ts",
              line: 118,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/collection.ts#L118",
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
          anchor: "acknowledged",
          name: "acknowledged",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "inserted-id",
          name: "insertedId",
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
      path: "packages/driver/src/collection.ts",
      line: 114,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/collection.ts#L114",
    },
  ],
  usedBy: [
    {
      name: "SinterCollection.insertOne",
      href: "/docs/api/classes/SinterCollection#insert-one",
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
