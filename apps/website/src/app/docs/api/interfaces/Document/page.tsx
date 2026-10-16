import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 26,
  name: "Document",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/Document",
  since: null,
  description: "",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["Document", "name"],
  ],
  comment: null,
  typeParameters: [],
  hierarchy: null,
  signatureSection: null,
  signatures: [],
  sections: [
    {
      id: "index-signatures",
      title: "Index signature",
      members: [
        {
          id: 27,
          name: "[key]",
          anchor: "index-signature",
          kind: "index-signature",
          deprecated: false,
          since: null,
          label: "Index Signature",
          badges: [],
          code: [
            ["[", "pn"],
            ["key", "param"],
            [": ", "pn"],
            ["string", "prim"],
            ["]: ", "pn"],
            ["DocumentValue", "ref"],
          ],
          comment: null,
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/protocol/src/document.ts",
              line: 4,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/protocol/src/document.ts#L4",
            },
          ],
        },
      ],
    },
  ],
  toc: [
    {
      id: "index-signatures",
      title: "Index signature",
      items: [
        {
          anchor: "index-signature",
          name: "[key]",
          kind: "index-signature",
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
      path: "packages/protocol/src/document.ts",
      line: 3,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/protocol/src/document.ts#L3",
    },
  ],
  usedBy: [
    {
      name: "AggregateCursor",
      href: "/docs/api/classes/AggregateCursor",
      kind: "class",
    },
    {
      name: "AggregateCursor.constructor",
      href: "/docs/api/classes/AggregateCursor#constructor",
      kind: "constructor",
    },
    {
      name: "CursorExecutor",
      href: "/docs/api/types/CursorExecutor",
      kind: "type-alias",
    },
    {
      name: "FindCursor",
      href: "/docs/api/classes/FindCursor",
      kind: "class",
    },
    {
      name: "FindCursor.constructor",
      href: "/docs/api/classes/FindCursor#constructor",
      kind: "constructor",
    },
    {
      name: "FindOneOptions",
      href: "/docs/api/interfaces/FindOneOptions",
      kind: "interface",
    },
    {
      name: "FindOptions",
      href: "/docs/api/interfaces/FindOptions",
      kind: "interface",
    },
    {
      name: "FindQueryOptions.projection",
      href: "/docs/api/interfaces/FindQueryOptions#projection",
      kind: "property",
    },
    {
      name: "IndexDefinition",
      href: "/docs/api/types/IndexDefinition",
      kind: "type-alias",
    },
    {
      name: "SinterClient.executeCommand",
      href: "/docs/api/classes/SinterClient#execute-command",
      kind: "method",
    },
    {
      name: "SinterCollection",
      href: "/docs/api/classes/SinterCollection",
      kind: "class",
    },
    {
      name: "SinterCollection.aggregate",
      href: "/docs/api/classes/SinterCollection#aggregate",
      kind: "method",
    },
    {
      name: "SinterCollection.constructor",
      href: "/docs/api/classes/SinterCollection#constructor",
      kind: "constructor",
    },
    {
      name: "SinterCompatibilityError.details",
      href: "/docs/api/classes/SinterCompatibilityError#details",
      kind: "property",
    },
    {
      name: "SinterDatabase.collection",
      href: "/docs/api/classes/SinterDatabase#collection",
      kind: "method",
    },
    {
      name: "SinterInsertManyError.details",
      href: "/docs/api/classes/SinterInsertManyError#details",
      kind: "property",
    },
    {
      name: "SinterServerError.details",
      href: "/docs/api/classes/SinterServerError#details",
      kind: "property",
    },
    {
      name: "SinterServerErrorOptions.details",
      href: "/docs/api/interfaces/SinterServerErrorOptions#details",
      kind: "property",
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
