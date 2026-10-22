import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 430,
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
    [" extends ", "kw"],
    ["QueryBudgetOptions", "ref", "/docs/api/interfaces/QueryBudgetOptions"],
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
  hierarchy: {
    name: "QueryBudgetOptions",
    href: "/docs/api/interfaces/QueryBudgetOptions",
    kind: "interface",
    deprecated: false,
    current: false,
    children: [
      {
        name: "FindQueryOptions",
        href: null,
        kind: "interface",
        deprecated: false,
        current: true,
        children: [],
      },
    ],
  },
  signatureSection: null,
  signatures: [],
  sections: [
    {
      id: "properties",
      title: "Properties",
      members: [
        {
          id: 433,
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
              line: 25,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/cursor.ts#L25",
            },
          ],
        },
        {
          id: 436,
          name: "maxScanned",
          anchor: "max-scanned",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["maxScanned", "name"],
            ["?: ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary:
              "<p>The most documents the server may examine for the request, counting every\ndocument it reads, not only the ones it returns. An index lowers the\nnumber. A positive integer.</p>",
            short:
              "The most documents the server may examine for the request, counting every document it reads, not only the ones it returns. An index lowers the number. A positive integer.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [
            {
              label: "Inherited from",
              name: "QueryBudgetOptions.maxScanned",
              href: "/docs/api/interfaces/QueryBudgetOptions#max-scanned",
            },
          ],
          sources: [
            {
              path: "packages/driver/src/budget.ts",
              line: 28,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/budget.ts#L28",
            },
          ],
        },
        {
          id: 435,
          name: "maxTimeMS",
          anchor: "max-time-ms",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["maxTimeMS", "name"],
            ["?: ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary:
              "<p>The most milliseconds the server may spend on the request. The server\nlooks at the clock while it examines documents, so a limit can be passed\nby a little before the request stops, and a long sort or group is not\ninterrupted once its documents are read. A positive integer.</p>\n<p>This is separate from the client's <code>requestTimeoutMS</code>, which gives up\nwaiting for the answer. Keep <code>requestTimeoutMS</code> larger than <code>maxTimeMS</code>,\nor the client may stop waiting first.</p>",
            short:
              "The most milliseconds the server may spend on the request. The server looks at the clock while it examines documents, so a limit can be passed by a little before the request stops, and a long sort or group is not interrupted once its documents are read. A positive integer.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [
            {
              label: "Inherited from",
              name: "QueryBudgetOptions.maxTimeMS",
              href: "/docs/api/interfaces/QueryBudgetOptions#max-time-ms",
            },
          ],
          sources: [
            {
              path: "packages/driver/src/budget.ts",
              line: 22,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/budget.ts#L22",
            },
          ],
        },
        {
          id: 434,
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
              line: 27,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/cursor.ts#L27",
            },
          ],
        },
        {
          id: 432,
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
              line: 23,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/cursor.ts#L23",
            },
          ],
        },
        {
          id: 431,
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
              line: 21,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/cursor.ts#L21",
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
          anchor: "max-scanned",
          name: "maxScanned",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "max-time-ms",
          name: "maxTimeMS",
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
      line: 19,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/cursor.ts#L19",
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
