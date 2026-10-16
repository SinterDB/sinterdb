import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 772,
  name: "IndexDefinitionOptions",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/IndexDefinitionOptions",
  since: null,
  description: "The options every index definition accepts.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["IndexDefinitionOptions", "name"],
  ],
  comment: {
    summary: "<p>The options every index definition accepts.</p>",
    short: "The options every index definition accepts.",
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
          id: 775,
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
            ["?: ", "pn"],
            ["string", "prim"],
          ],
          comment: {
            summary:
              "<p>Defaults to the fields and directions, such as <code>email_1</code> or\n<code>country_1_age_-1</code>.</p>",
            short:
              "Defaults to the fields and directions, such as <code>email_1</code> or <code>country_1_age_-1</code>.",
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
              line: 31,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L31",
            },
          ],
        },
        {
          id: 774,
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
            ["?: ", "pn"],
            ["boolean", "prim"],
          ],
          comment: {
            summary:
              "<p>Documents without the field are left out, so they never conflict. A\ncompound index leaves out only the documents that have none of its fields.</p>",
            short:
              "Documents without the field are left out, so they never conflict. A compound index leaves out only the documents that have none of its fields.",
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
              line: 26,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L26",
            },
          ],
        },
        {
          id: 773,
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
            ["?: ", "pn"],
            ["boolean", "prim"],
          ],
          comment: {
            summary:
              "<p>At most one document may hold a given value, or a given combination of\nvalues for a compound index, or lack the field.</p>",
            short:
              "At most one document may hold a given value, or a given combination of values for a compound index, or lack the field.",
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
              line: 21,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L21",
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
      line: 16,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L16",
    },
  ],
  usedBy: [
    {
      name: "IndexDefinition",
      href: "/docs/api/types/IndexDefinition",
      kind: "type-alias",
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
