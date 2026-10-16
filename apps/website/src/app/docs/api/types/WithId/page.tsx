import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 320,
  name: "WithId",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/WithId",
  since: null,
  description: "A document as stored and returned: _id is always present.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["WithId", "name"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [" extends ", "kw"],
    ["object", "prim"],
    ["> = ", "pn"],
    ["Omit", "ref"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [", ", "pn"],
    ['"_id"', "lit"],
    ["> & { ", "pn"],
    ["readonly ", "kw"],
    ["_id", "prop", "/docs/api/types/WithId#_id"],
    [": ", "pn"],
    ["CustomId", "ref", "/docs/api/classes/CustomId"],
    [" }", "pn"],
  ],
  comment: {
    summary:
      "<p>A document as stored and returned: <code>_id</code> is always present.</p>",
    short:
      "A document as stored and returned: <code>_id</code> is always present.",
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
      ],
      comment: null,
    },
  ],
  hierarchy: null,
  signatureSection: null,
  signatures: [],
  sections: [
    {
      id: "type-declaration",
      title: "Properties",
      members: [
        {
          id: 322,
          name: "_id",
          anchor: "_id",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["_id", "name"],
            [": ", "pn"],
            ["CustomId", "ref", "/docs/api/classes/CustomId"],
          ],
          comment: {
            summary: "<p>The document's <code>_id</code>.</p>",
            short: "The document's <code>_id</code>.",
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
              line: 54,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L54",
            },
          ],
        },
      ],
    },
  ],
  toc: [
    {
      id: "type-declaration",
      title: "Properties",
      items: [
        {
          anchor: "_id",
          name: "_id",
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
      line: 52,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/collection.ts#L52",
    },
  ],
  usedBy: [
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
      name: "ProjectedDocument",
      href: "/docs/api/types/ProjectedDocument",
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
