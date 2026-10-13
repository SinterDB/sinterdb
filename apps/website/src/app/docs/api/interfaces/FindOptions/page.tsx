import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 259,
  name: "FindOptions",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/FindOptions",
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
          id: 261,
          name: "batchSize",
          anchor: "batch-size",
          kind: "property",
          deprecated: false,
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
              line: 53,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L53",
            },
          ],
        },
        {
          id: 264,
          name: "limit",
          anchor: "limit",
          kind: "property",
          deprecated: false,
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
              line: 62,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L62",
            },
          ],
        },
        {
          id: 263,
          name: "skip",
          anchor: "skip",
          kind: "property",
          deprecated: false,
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
              line: 60,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L60",
            },
          ],
        },
        {
          id: 262,
          name: "sort",
          anchor: "sort",
          kind: "property",
          deprecated: false,
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
              line: 58,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L58",
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
  ],
  sources: [
    {
      path: "packages/driver/src/collection.ts",
      line: 49,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L49",
    },
  ],
} satisfies ApiPage;

export const metadata: Metadata = {
  title: page.name,
  description: page.description || undefined,
};

export default function Page() {
  return <ApiReflectionPage page={page} />;
}
