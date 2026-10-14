import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 346,
  name: "SinterDatabase",
  kind: "class",
  label: "Class",
  href: "/docs/api/classes/SinterDatabase",
  since: null,
  description: "A handle to a database on a server.",
  badges: [],
  declaration: [
    ["class ", "kw"],
    ["SinterDatabase", "name"],
  ],
  comment: {
    summary:
      '<p>A handle to a database on a server.</p>\n<p>Get one from <a href="/docs/api/classes/SinterClient#db">SinterClient.db</a>.</p>',
    short: "A handle to a database on a server.",
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
      id: "constructors",
      title: "Constructors",
      members: [
        {
          id: 347,
          name: "constructor",
          anchor: "constructor",
          kind: "constructor",
          deprecated: false,
          since: null,
          label: "Constructor",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 348,
              code: [
                ["new ", "kw"],
                ["SinterDatabase", "name"],
                ["(", "pn"],
                ["client", "param"],
                [": ", "pn"],
                ["SinterClient", "ref", "/docs/api/classes/SinterClient"],
                [", ", "pn"],
                ["name", "param"],
                [": ", "pn"],
                ["string", "prim"],
                [")", "pn"],
              ],
              comment: null,
              typeParameters: [],
              parameters: [
                {
                  name: "client",
                  code: [
                    ["client", "param"],
                    [": ", "pn"],
                    ["SinterClient", "ref", "/docs/api/classes/SinterClient"],
                  ],
                  comment: {
                    summary: "<p>The client this database belongs to.</p>",
                    short: "The client this database belongs to.",
                    deprecated: null,
                    modifiers: [],
                    blocks: [],
                  },
                  members: [],
                },
                {
                  name: "name",
                  code: [
                    ["name", "param"],
                    [": ", "pn"],
                    ["string", "prim"],
                  ],
                  comment: null,
                  members: [],
                },
              ],
              returns: null,
              sources: [
                {
                  path: "packages/driver/src/database.ts",
                  line: 16,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/database.ts#L16",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/database.ts",
              line: 16,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/database.ts#L16",
            },
          ],
        },
      ],
    },
    {
      id: "properties",
      title: "Properties",
      members: [
        {
          id: 351,
          name: "client",
          anchor: "client",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["client", "name"],
            [": ", "pn"],
            ["SinterClient", "ref", "/docs/api/classes/SinterClient"],
          ],
          comment: {
            summary: "<p>The client this database belongs to.</p>",
            short: "The client this database belongs to.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/database.ts",
              line: 18,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/database.ts#L18",
            },
          ],
        },
        {
          id: 352,
          name: "name",
          anchor: "name",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["name", "name"],
            [": ", "pn"],
            ["string", "prim"],
          ],
          comment: {
            summary: "<p>The database name.</p>",
            short: "The database name.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/database.ts",
              line: 14,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/database.ts#L14",
            },
          ],
        },
      ],
    },
    {
      id: "methods",
      title: "Methods",
      members: [
        {
          id: 353,
          name: "collection",
          anchor: "collection",
          kind: "method",
          deprecated: false,
          since: null,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 354,
              code: [
                ["collection", "name"],
                ["<", "pn"],
                ["TDocument", "tp"],
                [" extends ", "kw"],
                ["object", "prim"],
                [" = ", "pn"],
                ["Document", "ref", "/docs/api/interfaces/Document"],
                [">(", "pn"],
                ["\n  "],
                ["name", "param"],
                [": ", "pn"],
                ["string", "prim"],
                [",", "pn"],
                ["\n"],
                ["): ", "pn"],
                [
                  "SinterCollection",
                  "ref",
                  "/docs/api/classes/SinterCollection",
                ],
                ["<", "pn"],
                ["TDocument", "tp"],
                [">", "pn"],
              ],
              comment: {
                summary:
                  "<p>Returns a handle to a collection. No request is sent; the collection is\ncreated by the first write.</p>",
                short:
                  "Returns a handle to a collection. No request is sent; the collection is created by the first write.",
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
                  comment: {
                    summary:
                      "<p>The shape of the documents, used for\ntype-checking.</p>",
                    short:
                      "The shape of the documents, used for   type-checking.",
                    deprecated: null,
                    modifiers: [],
                    blocks: [],
                  },
                },
              ],
              parameters: [
                {
                  name: "name",
                  code: [
                    ["name", "param"],
                    [": ", "pn"],
                    ["string", "prim"],
                  ],
                  comment: {
                    summary: "<p>The collection name.</p>",
                    short: "The collection name.",
                    deprecated: null,
                    modifiers: [],
                    blocks: [],
                  },
                  members: [],
                },
              ],
              returns: {
                code: [
                  [
                    "SinterCollection",
                    "ref",
                    "/docs/api/classes/SinterCollection",
                  ],
                  ["<", "pn"],
                  ["TDocument", "tp"],
                  [">", "pn"],
                ],
                html: null,
              },
              sources: [
                {
                  path: "packages/driver/src/database.ts",
                  line: 33,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/database.ts#L33",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/database.ts",
              line: 33,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/database.ts#L33",
            },
          ],
        },
        {
          id: 357,
          name: "listCollections",
          anchor: "list-collections",
          kind: "method",
          deprecated: false,
          since: null,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 358,
              code: [
                ["listCollections", "name"],
                ["(): ", "pn"],
                ["Promise", "ref"],
                ["<", "pn"],
                ["string", "prim"],
                ["[]>", "pn"],
              ],
              comment: {
                summary:
                  "<p>Lists the names of the collections in this database.</p>",
                short: "Lists the names of the collections in this database.",
                deprecated: null,
                modifiers: [],
                blocks: [],
              },
              typeParameters: [],
              parameters: [],
              returns: {
                code: [
                  ["Promise", "ref"],
                  ["<", "pn"],
                  ["string", "prim"],
                  ["[]>", "pn"],
                ],
                html: null,
              },
              sources: [
                {
                  path: "packages/driver/src/database.ts",
                  line: 40,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/database.ts#L40",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/database.ts",
              line: 40,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/database.ts#L40",
            },
          ],
        },
      ],
    },
  ],
  toc: [
    {
      id: "constructors",
      title: "Constructors",
      items: [
        {
          anchor: "constructor",
          name: "constructor",
          kind: "constructor",
          deprecated: false,
        },
      ],
    },
    {
      id: "properties",
      title: "Properties",
      items: [
        {
          anchor: "client",
          name: "client",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "name",
          name: "name",
          kind: "property",
          deprecated: false,
        },
      ],
    },
    {
      id: "methods",
      title: "Methods",
      items: [
        {
          anchor: "collection",
          name: "collection",
          kind: "method",
          deprecated: false,
        },
        {
          anchor: "list-collections",
          name: "listCollections",
          kind: "method",
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
      path: "packages/driver/src/database.ts",
      line: 12,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/database.ts#L12",
    },
  ],
  usedBy: [
    {
      name: "SinterClient.db",
      href: "/docs/api/classes/SinterClient#db",
      kind: "method",
    },
    {
      name: "SinterCollection.constructor",
      href: "/docs/api/classes/SinterCollection#constructor",
      kind: "constructor",
    },
    {
      name: "SinterCollection.database",
      href: "/docs/api/classes/SinterCollection#database",
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
