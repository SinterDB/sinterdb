import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 1,
  name: "CustomId",
  kind: "class",
  label: "Class",
  href: "/docs/api/classes/CustomId",
  since: null,
  description: "",
  badges: [],
  declaration: [
    ["class ", "kw"],
    ["CustomId", "name"],
  ],
  comment: null,
  typeParameters: [],
  hierarchy: null,
  signatureSection: null,
  signatures: [],
  sections: [
    {
      id: "accessors",
      title: "Accessors",
      members: [
        {
          id: 13,
          name: "timestamp",
          anchor: "timestamp",
          kind: "accessor",
          deprecated: false,
          since: null,
          label: "Accessor",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 14,
              code: [
                ["get ", "kw"],
                ["timestamp", "name"],
                ["(): ", "pn"],
                ["Date", "ref"],
              ],
              comment: null,
              typeParameters: [],
              parameters: [],
              returns: {
                code: [["Date", "ref"]],
                html: null,
              },
              sources: [
                {
                  path: "packages/protocol/src/custom-id.ts",
                  line: 58,
                  url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L58",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/protocol/src/custom-id.ts",
              line: 58,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L58",
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
          id: 15,
          name: "equals",
          anchor: "equals",
          kind: "method",
          deprecated: false,
          since: null,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 16,
              code: [
                ["equals", "name"],
                ["(", "pn"],
                ["other", "param"],
                [": ", "pn"],
                ["CustomId", "ref", "/docs/api/classes/CustomId"],
                ["): ", "pn"],
                ["boolean", "prim"],
              ],
              comment: null,
              typeParameters: [],
              parameters: [
                {
                  name: "other",
                  code: [
                    ["other", "param"],
                    [": ", "pn"],
                    ["CustomId", "ref", "/docs/api/classes/CustomId"],
                  ],
                  comment: null,
                  members: [],
                },
              ],
              returns: {
                code: [["boolean", "prim"]],
                html: null,
              },
              sources: [
                {
                  path: "packages/protocol/src/custom-id.ts",
                  line: 68,
                  url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L68",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/protocol/src/custom-id.ts",
              line: 68,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L68",
            },
          ],
        },
        {
          id: 18,
          name: "toBytes",
          anchor: "to-bytes",
          kind: "method",
          deprecated: false,
          since: null,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 19,
              code: [
                ["toBytes", "name"],
                ["(): ", "pn"],
                ["Uint8Array", "ref"],
              ],
              comment: null,
              typeParameters: [],
              parameters: [],
              returns: {
                code: [["Uint8Array", "ref"]],
                html: null,
              },
              sources: [
                {
                  path: "packages/protocol/src/custom-id.ts",
                  line: 76,
                  url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L76",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/protocol/src/custom-id.ts",
              line: 76,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L76",
            },
          ],
        },
        {
          id: 20,
          name: "toHexString",
          anchor: "to-hex-string",
          kind: "method",
          deprecated: false,
          since: null,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 21,
              code: [
                ["toHexString", "name"],
                ["(): ", "pn"],
                ["string", "prim"],
              ],
              comment: null,
              typeParameters: [],
              parameters: [],
              returns: {
                code: [["string", "prim"]],
                html: null,
              },
              sources: [
                {
                  path: "packages/protocol/src/custom-id.ts",
                  line: 80,
                  url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L80",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/protocol/src/custom-id.ts",
              line: 80,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L80",
            },
          ],
        },
        {
          id: 24,
          name: "toJSON",
          anchor: "to-json",
          kind: "method",
          deprecated: false,
          since: null,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 25,
              code: [
                ["toJSON", "name"],
                ["(): ", "pn"],
                ["string", "prim"],
              ],
              comment: null,
              typeParameters: [],
              parameters: [],
              returns: {
                code: [["string", "prim"]],
                html: null,
              },
              sources: [
                {
                  path: "packages/protocol/src/custom-id.ts",
                  line: 90,
                  url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L90",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/protocol/src/custom-id.ts",
              line: 90,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L90",
            },
          ],
        },
        {
          id: 22,
          name: "toString",
          anchor: "to-string",
          kind: "method",
          deprecated: false,
          since: null,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 23,
              code: [
                ["toString", "name"],
                ["(): ", "pn"],
                ["string", "prim"],
              ],
              comment: null,
              typeParameters: [],
              parameters: [],
              returns: {
                code: [["string", "prim"]],
                html: null,
              },
              sources: [
                {
                  path: "packages/protocol/src/custom-id.ts",
                  line: 86,
                  url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L86",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/protocol/src/custom-id.ts",
              line: 86,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L86",
            },
          ],
        },
        {
          id: 4,
          name: "fromBytes",
          anchor: "from-bytes",
          kind: "method",
          deprecated: false,
          since: null,
          label: "Method",
          badges: ["static"],
          code: null,
          comment: null,
          signatures: [
            {
              id: 5,
              code: [
                ["static ", "kw"],
                ["fromBytes", "name"],
                ["(", "pn"],
                ["value", "param"],
                [": ", "pn"],
                ["Uint8Array", "ref"],
                ["): ", "pn"],
                ["CustomId", "ref", "/docs/api/classes/CustomId"],
              ],
              comment: null,
              typeParameters: [],
              parameters: [
                {
                  name: "value",
                  code: [
                    ["value", "param"],
                    [": ", "pn"],
                    ["Uint8Array", "ref"],
                  ],
                  comment: null,
                  members: [],
                },
              ],
              returns: {
                code: [["CustomId", "ref", "/docs/api/classes/CustomId"]],
                html: null,
              },
              sources: [
                {
                  path: "packages/protocol/src/custom-id.ts",
                  line: 23,
                  url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L23",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/protocol/src/custom-id.ts",
              line: 23,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L23",
            },
          ],
        },
        {
          id: 7,
          name: "fromHexString",
          anchor: "from-hex-string",
          kind: "method",
          deprecated: false,
          since: null,
          label: "Method",
          badges: ["static"],
          code: null,
          comment: null,
          signatures: [
            {
              id: 8,
              code: [
                ["static ", "kw"],
                ["fromHexString", "name"],
                ["(", "pn"],
                ["value", "param"],
                [": ", "pn"],
                ["string", "prim"],
                ["): ", "pn"],
                ["CustomId", "ref", "/docs/api/classes/CustomId"],
              ],
              comment: null,
              typeParameters: [],
              parameters: [
                {
                  name: "value",
                  code: [
                    ["value", "param"],
                    [": ", "pn"],
                    ["string", "prim"],
                  ],
                  comment: null,
                  members: [],
                },
              ],
              returns: {
                code: [["CustomId", "ref", "/docs/api/classes/CustomId"]],
                html: null,
              },
              sources: [
                {
                  path: "packages/protocol/src/custom-id.ts",
                  line: 37,
                  url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L37",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/protocol/src/custom-id.ts",
              line: 37,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L37",
            },
          ],
        },
        {
          id: 2,
          name: "generate",
          anchor: "generate",
          kind: "method",
          deprecated: false,
          since: null,
          label: "Method",
          badges: ["static"],
          code: null,
          comment: null,
          signatures: [
            {
              id: 3,
              code: [
                ["static ", "kw"],
                ["generate", "name"],
                ["(): ", "pn"],
                ["CustomId", "ref", "/docs/api/classes/CustomId"],
              ],
              comment: null,
              typeParameters: [],
              parameters: [],
              returns: {
                code: [["CustomId", "ref", "/docs/api/classes/CustomId"]],
                html: null,
              },
              sources: [
                {
                  path: "packages/protocol/src/custom-id.ts",
                  line: 13,
                  url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L13",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/protocol/src/custom-id.ts",
              line: 13,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L13",
            },
          ],
        },
      ],
    },
  ],
  toc: [
    {
      id: "accessors",
      title: "Accessors",
      items: [
        {
          anchor: "timestamp",
          name: "timestamp",
          kind: "accessor",
          deprecated: false,
        },
      ],
    },
    {
      id: "methods",
      title: "Methods",
      items: [
        {
          anchor: "equals",
          name: "equals",
          kind: "method",
          deprecated: false,
        },
        {
          anchor: "to-bytes",
          name: "toBytes",
          kind: "method",
          deprecated: false,
        },
        {
          anchor: "to-hex-string",
          name: "toHexString",
          kind: "method",
          deprecated: false,
        },
        {
          anchor: "to-json",
          name: "toJSON",
          kind: "method",
          deprecated: false,
        },
        {
          anchor: "to-string",
          name: "toString",
          kind: "method",
          deprecated: false,
        },
        {
          anchor: "from-bytes",
          name: "fromBytes",
          kind: "method",
          deprecated: false,
        },
        {
          anchor: "from-hex-string",
          name: "fromHexString",
          kind: "method",
          deprecated: false,
        },
        {
          anchor: "generate",
          name: "generate",
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
      path: "packages/protocol/src/custom-id.ts",
      line: 10,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/protocol/src/custom-id.ts#L10",
    },
  ],
  usedBy: [
    {
      name: "ComparableValue",
      href: "/docs/api/types/ComparableValue",
      kind: "type-alias",
    },
    {
      name: "DistinctValue",
      href: "/docs/api/types/DistinctValue",
      kind: "type-alias",
    },
    {
      name: "Filter",
      href: "/docs/api/types/Filter",
      kind: "type-alias",
    },
    {
      name: "Filter._id",
      href: "/docs/api/types/Filter#_id",
      kind: "property",
    },
    {
      name: "GroupValue",
      href: "/docs/api/types/GroupValue",
      kind: "type-alias",
    },
    {
      name: "InsertManyResult.insertedIds",
      href: "/docs/api/interfaces/InsertManyResult#inserted-ids",
      kind: "property",
    },
    {
      name: "InsertOneResult.insertedId",
      href: "/docs/api/interfaces/InsertOneResult#inserted-id",
      kind: "property",
    },
    {
      name: "OptionalId",
      href: "/docs/api/types/OptionalId",
      kind: "type-alias",
    },
    {
      name: "OptionalId._id",
      href: "/docs/api/types/OptionalId#_id",
      kind: "property",
    },
    {
      name: "ProjectedDocument",
      href: "/docs/api/types/ProjectedDocument",
      kind: "type-alias",
    },
    {
      name: "SinterInsertManyError.constructor",
      href: "/docs/api/classes/SinterInsertManyError#constructor",
      kind: "constructor",
    },
    {
      name: "SinterInsertManyError.insertedIds",
      href: "/docs/api/classes/SinterInsertManyError#inserted-ids",
      kind: "property",
    },
    {
      name: "UpdateResult.upsertedId",
      href: "/docs/api/interfaces/UpdateResult#upserted-id",
      kind: "property",
    },
    {
      name: "WithId",
      href: "/docs/api/types/WithId",
      kind: "type-alias",
    },
    {
      name: "WithId._id",
      href: "/docs/api/types/WithId#_id",
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
