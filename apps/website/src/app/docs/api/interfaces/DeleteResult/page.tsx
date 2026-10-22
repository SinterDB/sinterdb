import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 860,
  name: "DeleteResult",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/DeleteResult",
  since: null,
  description: "The result of a delete.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["DeleteResult", "name"],
  ],
  comment: {
    summary: "<p>The result of a delete.</p>",
    short: "The result of a delete.",
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
          id: 861,
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
              "<p>Always <code>true</code>; a failed delete throws instead.</p>",
            short: "Always <code>true</code>; a failed delete throws instead.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/update.ts",
              line: 136,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/update.ts#L136",
            },
          ],
        },
        {
          id: 862,
          name: "deletedCount",
          anchor: "deleted-count",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["deletedCount", "name"],
            [": ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary: "<p>How many documents were deleted.</p>",
            short: "How many documents were deleted.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/update.ts",
              line: 138,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/update.ts#L138",
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
          anchor: "deleted-count",
          name: "deletedCount",
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
      path: "packages/driver/src/update.ts",
      line: 134,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/update.ts#L134",
    },
  ],
  usedBy: [
    {
      name: "SinterCollection.deleteMany",
      href: "/docs/api/classes/SinterCollection#delete-many",
      kind: "method",
    },
    {
      name: "SinterCollection.deleteOne",
      href: "/docs/api/classes/SinterCollection#delete-one",
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
