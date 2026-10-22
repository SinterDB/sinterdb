import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 202,
  name: "AggregateOptions",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/AggregateOptions",
  since: null,
  description: "Options for SinterCollection.aggregate.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["AggregateOptions", "name"],
    [" extends ", "kw"],
    ["QueryBudgetOptions", "ref", "/docs/api/interfaces/QueryBudgetOptions"],
  ],
  comment: {
    summary:
      '<p>Options for <a href="/docs/api/classes/SinterCollection#aggregate">SinterCollection.aggregate</a>.</p>',
    short:
      'Options for <a href="/docs/api/classes/SinterCollection#aggregate">SinterCollection.aggregate</a>.',
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
        name: "AggregateOptions",
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
          id: 203,
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
              path: "packages/driver/src/aggregation.ts",
              line: 143,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/aggregation.ts#L143",
            },
          ],
        },
        {
          id: 205,
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
          id: 204,
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
      path: "packages/driver/src/aggregation.ts",
      line: 139,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/aggregation.ts#L139",
    },
  ],
  usedBy: [
    {
      name: "SinterCollection.aggregate",
      href: "/docs/api/classes/SinterCollection#aggregate",
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
