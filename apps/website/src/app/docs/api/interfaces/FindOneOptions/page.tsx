import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 263,
  name: "FindOneOptions",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/FindOneOptions",
  since: null,
  description: "Options for SinterCollection.findOne.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["FindOneOptions", "name"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [" extends ", "kw"],
    ["object", "prim"],
    [" = ", "pn"],
    ["Document", "ref", "/docs/api/interfaces/Document"],
    [", ", "pn"],
    ["TProjection", "tp"],
    [" extends ", "kw"],
    ["Projection", "ref", "/docs/api/types/Projection"],
    ["<", "pn"],
    ["TDocument", "tp"],
    ["> | ", "pn"],
    ["undefined", "prim"],
    [" = ", "pn"],
    ["undefined", "prim"],
    [">", "pn"],
  ],
  comment: {
    summary:
      '<p>Options for <a href="/docs/api/classes/SinterCollection#find-one">SinterCollection.findOne</a>.</p>',
    short:
      'Options for <a href="/docs/api/classes/SinterCollection#find-one">SinterCollection.findOne</a>.',
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [
    {
      name: "TDocument",
      code: [
        ["TDocument", "tp"],
        [" extends ", "kw"],
        ["object", "prim"],
        [" = ", "pn"],
        ["Document", "ref", "/docs/api/interfaces/Document"],
      ],
      comment: null,
    },
    {
      name: "TProjection",
      code: [
        ["TProjection", "tp"],
        [" extends ", "kw"],
        ["Projection", "ref", "/docs/api/types/Projection"],
        ["<", "pn"],
        ["TDocument", "tp"],
        ["> | ", "pn"],
        ["undefined", "prim"],
        [" = ", "pn"],
        ["undefined", "prim"],
      ],
      comment: null,
    },
  ],
  hierarchy: null,
  signatureSection: null,
  signatures: [],
  sections: [
    {
      id: "properties",
      title: "Properties",
      members: [
        {
          id: 266,
          name: "projection",
          anchor: "projection",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["projection", "name"],
            ["?: ", "pn"],
            ["TProjection", "tp"],
          ],
          comment: {
            summary:
              '<p>The fields to return. See <a href="/docs/api/types/Projection">Projection</a>. The result type follows the\nprojection when it is written inline.</p>',
            short:
              'The fields to return. See <a href="/docs/api/types/Projection">Projection</a>. The result type follows the projection when it is written inline.',
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
              line: 64,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L64",
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
          anchor: "projection",
          name: "projection",
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
      line: 56,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L56",
    },
  ],
  usedBy: [
    {
      name: "SinterCollection.findOne",
      href: "/docs/api/classes/SinterCollection#find-one",
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
