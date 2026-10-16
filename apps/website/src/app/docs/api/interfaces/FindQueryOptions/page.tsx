import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 390,
  name: "FindQueryOptions",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/FindQueryOptions",
  since: null,
  description:
    "The query parts of a find that are sent with the first request.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["FindQueryOptions", "name"],
  ],
  comment: {
    summary:
      "<p>The query parts of a find that are sent with the first request.</p>",
    short: "The query parts of a find that are sent with the first request.",
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
          id: 393,
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
              path: "packages/driver/src/cursor.ts",
              line: 24,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L24",
            },
          ],
        },
        {
          id: 394,
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
            ["Document", "ref", "/docs/api/interfaces/Document"],
          ],
          comment: {
            summary: "<p>Which fields to return.</p>",
            short: "Which fields to return.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/cursor.ts",
              line: 26,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L26",
            },
          ],
        },
        {
          id: 392,
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
            summary: "<p>How many matching documents to skip.</p>",
            short: "How many matching documents to skip.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/cursor.ts",
              line: 22,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L22",
            },
          ],
        },
        {
          id: 391,
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
            ["readonly ", "kw"],
            ["(", "pn"],
            ["readonly ", "kw"],
            ["[", "pn"],
            ["string", "prim"],
            [", ", "pn"],
            ["SortDirection", "ref", "/docs/api/types/SortDirection"],
            ["])[]", "pn"],
          ],
          comment: {
            summary:
              "<p>Sort order as <code>[path, direction]</code> pairs.</p>",
            short: "Sort order as <code>[path, direction]</code> pairs.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/cursor.ts",
              line: 20,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L20",
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
      path: "packages/driver/src/cursor.ts",
      line: 18,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/cursor.ts#L18",
    },
  ],
  usedBy: [
    {
      name: "FindCursor.constructor",
      href: "/docs/api/classes/FindCursor#constructor",
      kind: "constructor",
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
