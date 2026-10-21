import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 338,
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
    [" extends ", "kw"],
    ["QueryBudgetOptions", "ref", "/docs/api/interfaces/QueryBudgetOptions"],
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
  hierarchy: {
    name: "QueryBudgetOptions",
    href: "/docs/api/interfaces/QueryBudgetOptions",
    kind: "interface",
    deprecated: false,
    current: false,
    children: [
      {
        name: "FindOptions",
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
          id: 341,
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
              line: 95,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L95",
            },
          ],
        },
        {
          id: 344,
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
              line: 104,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L104",
            },
          ],
        },
        {
          id: 347,
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
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/budget.ts#L28",
            },
          ],
        },
        {
          id: 346,
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
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/budget.ts#L22",
            },
          ],
        },
        {
          id: 345,
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
              line: 110,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L110",
            },
          ],
        },
        {
          id: 343,
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
              line: 102,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L102",
            },
          ],
        },
        {
          id: 342,
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
              line: 100,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L100",
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
      path: "packages/driver/src/collection.ts",
      line: 88,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L88",
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
