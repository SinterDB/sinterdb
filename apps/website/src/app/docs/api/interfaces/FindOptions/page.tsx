import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 267,
  name: "FindOptions",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/FindOptions",
  since: null,
  description: "Options for SinterCollection.find.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["FindOptions", "name"],
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
      '<p>Options for <a href="/docs/api/classes/SinterCollection#find">SinterCollection.find</a>.</p>',
    short:
      'Options for <a href="/docs/api/classes/SinterCollection#find">SinterCollection.find</a>.',
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
          id: 270,
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
              path: "packages/driver/src/collection.ts",
              line: 75,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L75",
            },
          ],
        },
        {
          id: 273,
          name: "limit",
          anchor: "limit",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["limit", "name"],
            ["?: ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary: "<p>The maximum number of documents to return.</p>",
            short: "The maximum number of documents to return.",
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
              line: 84,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L84",
            },
          ],
        },
        {
          id: 274,
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
              '<p>The fields to return. See <a href="/docs/api/types/Projection">Projection</a>. It is applied after sorting,\nso a query can sort by a field it does not return. The cursor\'s result\ntype follows the projection when it is written inline.</p>',
            short:
              'The fields to return. See <a href="/docs/api/types/Projection">Projection</a>. It is applied after sorting, so a query can sort by a field it does not return. The cursor\'s result type follows the projection when it is written inline.',
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
              line: 90,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L90",
            },
          ],
        },
        {
          id: 272,
          name: "skip",
          anchor: "skip",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["skip", "name"],
            ["?: ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary:
              "<p>How many matching documents to skip, after sorting.</p>",
            short: "How many matching documents to skip, after sorting.",
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
              line: 82,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L82",
            },
          ],
        },
        {
          id: 271,
          name: "sort",
          anchor: "sort",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["sort", "name"],
            ["?: ", "pn"],
            ["Sort", "ref", "/docs/api/types/Sort"],
            ["<", "pn"],
            ["TDocument", "tp"],
            [">", "pn"],
          ],
          comment: {
            summary:
              "<p>Sort order as <code>[path, direction]</code> pairs, where direction is <code>1</code> for\nascending and <code>-1</code> for descending. Earlier pairs take priority.</p>",
            short:
              "Sort order as <code>[path, direction]</code> pairs, where direction is <code>1</code> for ascending and <code>-1</code> for descending. Earlier pairs take priority.",
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
              line: 80,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L80",
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
        {
          anchor: "limit",
          name: "limit",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "projection",
          name: "projection",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "skip",
          name: "skip",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "sort",
          name: "sort",
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
      line: 68,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L68",
    },
  ],
  usedBy: [
    {
      name: "SinterCollection.find",
      href: "/docs/api/classes/SinterCollection#find",
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
