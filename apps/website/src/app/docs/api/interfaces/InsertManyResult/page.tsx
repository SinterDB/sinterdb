import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 309,
  name: "InsertManyResult",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/InsertManyResult",
  since: null,
  description: "The result of SinterCollection.insertMany.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["InsertManyResult", "name"],
  ],
  comment: {
    summary:
      '<p>The result of <a href="/docs/api/classes/SinterCollection#insert-many">SinterCollection.insertMany</a>.</p>',
    short:
      'The result of <a href="/docs/api/classes/SinterCollection#insert-many">SinterCollection.insertMany</a>.',
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
          id: 310,
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
              line: 122,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L122",
            },
          ],
        },
        {
          id: 311,
          name: "insertedCount",
          anchor: "inserted-count",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["insertedCount", "name"],
            [": ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary: "<p>How many documents were inserted.</p>",
            short: "How many documents were inserted.",
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
              line: 124,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L124",
            },
          ],
        },
        {
          id: 312,
          name: "insertedIds",
          anchor: "inserted-ids",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["insertedIds", "name"],
            [": ", "pn"],
            ["readonly ", "kw"],
            ["CustomId", "ref", "/docs/api/classes/CustomId"],
            ["[]", "pn"],
          ],
          comment: {
            summary:
              "<p>The <code>_id</code> of every inserted document, in input order.</p>",
            short:
              "The <code>_id</code> of every inserted document, in input order.",
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
              line: 126,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L126",
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
          anchor: "inserted-count",
          name: "insertedCount",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "inserted-ids",
          name: "insertedIds",
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
      line: 120,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L120",
    },
  ],
  usedBy: [
    {
      name: "SinterCollection.insertMany",
      href: "/docs/api/classes/SinterCollection#insert-many",
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
