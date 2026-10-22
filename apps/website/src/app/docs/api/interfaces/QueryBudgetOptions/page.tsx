import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 199,
  name: "QueryBudgetOptions",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/QueryBudgetOptions",
  since: null,
  description:
    "Limits on what one server request may cost. Both are optional, and a request that passes a limit fails with a SinterServerError named OperationTimeLimitExceeded or ScanLimitExceeded.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["QueryBudgetOptions", "name"],
  ],
  comment: {
    summary:
      '<p>Limits on what one server request may cost. Both are optional, and a\nrequest that passes a limit fails with a <a href="/docs/api/classes/SinterServerError">SinterServerError</a> named\n<code>OperationTimeLimitExceeded</code> or <code>ScanLimitExceeded</code>.</p>\n<p>The limits apply to each round trip, not to the whole cursor: a cursor\nsends them again with every <code>getMore</code>, so each batch gets a fresh budget.</p>',
    short:
      'Limits on what one server request may cost. Both are optional, and a request that passes a limit fails with a <a href="/docs/api/classes/SinterServerError">SinterServerError</a> named <code>OperationTimeLimitExceeded</code> or <code>ScanLimitExceeded</code>.',
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [],
  hierarchy: {
    name: "QueryBudgetOptions",
    href: null,
    kind: "interface",
    deprecated: false,
    current: true,
    children: [
      {
        name: "AggregateOptions",
        href: "/docs/api/interfaces/AggregateOptions",
        kind: "interface",
        deprecated: false,
        current: false,
        children: [],
      },
      {
        name: "FindOneOptions",
        href: "/docs/api/interfaces/FindOneOptions",
        kind: "interface",
        deprecated: false,
        current: false,
        children: [],
      },
      {
        name: "FindOptions",
        href: "/docs/api/interfaces/FindOptions",
        kind: "interface",
        deprecated: false,
        current: false,
        children: [],
      },
      {
        name: "FindQueryOptions",
        href: "/docs/api/interfaces/FindQueryOptions",
        kind: "interface",
        deprecated: false,
        current: false,
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
          id: 201,
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
          relations: [],
          sources: [
            {
              path: "packages/driver/src/budget.ts",
              line: 28,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/budget.ts#L28",
            },
          ],
        },
        {
          id: 200,
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
          relations: [],
          sources: [
            {
              path: "packages/driver/src/budget.ts",
              line: 22,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/budget.ts#L22",
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
      path: "packages/driver/src/budget.ts",
      line: 11,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/budget.ts#L11",
    },
  ],
  usedBy: [
    {
      name: "AggregateCursor.constructor",
      href: "/docs/api/classes/AggregateCursor#constructor",
      kind: "constructor",
    },
    {
      name: "AggregateOptions",
      href: "/docs/api/interfaces/AggregateOptions",
      kind: "interface",
    },
    {
      name: "AggregateOptions.maxScanned",
      href: "/docs/api/interfaces/AggregateOptions#max-scanned",
      kind: "property",
    },
    {
      name: "AggregateOptions.maxTimeMS",
      href: "/docs/api/interfaces/AggregateOptions#max-time-ms",
      kind: "property",
    },
    {
      name: "FindOneOptions",
      href: "/docs/api/interfaces/FindOneOptions",
      kind: "interface",
    },
    {
      name: "FindOneOptions.maxScanned",
      href: "/docs/api/interfaces/FindOneOptions#max-scanned",
      kind: "property",
    },
    {
      name: "FindOneOptions.maxTimeMS",
      href: "/docs/api/interfaces/FindOneOptions#max-time-ms",
      kind: "property",
    },
    {
      name: "FindOptions",
      href: "/docs/api/interfaces/FindOptions",
      kind: "interface",
    },
    {
      name: "FindOptions.maxScanned",
      href: "/docs/api/interfaces/FindOptions#max-scanned",
      kind: "property",
    },
    {
      name: "FindOptions.maxTimeMS",
      href: "/docs/api/interfaces/FindOptions#max-time-ms",
      kind: "property",
    },
    {
      name: "FindQueryOptions",
      href: "/docs/api/interfaces/FindQueryOptions",
      kind: "interface",
    },
    {
      name: "FindQueryOptions.maxScanned",
      href: "/docs/api/interfaces/FindQueryOptions#max-scanned",
      kind: "property",
    },
    {
      name: "FindQueryOptions.maxTimeMS",
      href: "/docs/api/interfaces/FindQueryOptions#max-time-ms",
      kind: "property",
    },
    {
      name: "SinterCollection.countDocuments",
      href: "/docs/api/classes/SinterCollection#count-documents",
      kind: "method",
    },
    {
      name: "SinterCollection.distinct",
      href: "/docs/api/classes/SinterCollection#distinct",
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
