import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 784,
  name: "CreateIndexResult",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/CreateIndexResult",
  since: null,
  description: "The result of SinterCollection.createIndex.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["CreateIndexResult", "name"],
  ],
  comment: {
    summary:
      '<p>The result of <a href="/docs/api/classes/SinterCollection#create-index">SinterCollection.createIndex</a>.</p>',
    short:
      'The result of <a href="/docs/api/classes/SinterCollection#create-index">SinterCollection.createIndex</a>.',
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
          id: 785,
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
              "<p>Always <code>true</code>; a failed request throws instead.</p>",
            short: "Always <code>true</code>; a failed request throws instead.",
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
              line: 71,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/indexes.ts#L71",
            },
          ],
        },
        {
          id: 787,
          name: "created",
          anchor: "created",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["created", "name"],
            [": ", "pn"],
            ["boolean", "prim"],
          ],
          comment: {
            summary: "<p>False when an identical index already existed.</p>",
            short: "False when an identical index already existed.",
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
              line: 75,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/indexes.ts#L75",
            },
          ],
        },
        {
          id: 786,
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
            summary: "<p>The name of the index, whether new or existing.</p>",
            short: "The name of the index, whether new or existing.",
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
              line: 73,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/indexes.ts#L73",
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
          anchor: "created",
          name: "created",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "name",
          name: "name",
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
      line: 69,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/indexes.ts#L69",
    },
  ],
  usedBy: [
    {
      name: "SinterCollection.createIndex",
      href: "/docs/api/classes/SinterCollection#create-index",
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
