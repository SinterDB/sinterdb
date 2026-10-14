import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 746,
  name: "SinterNamespaceError",
  kind: "class",
  label: "Class",
  href: "/docs/api/classes/SinterNamespaceError",
  since: null,
  description:
    "A database or collection name is invalid: empty, or containing forbidden characters. Code INVALID_CLIENT_OPTIONS.",
  badges: [],
  declaration: [
    ["class ", "kw"],
    ["SinterNamespaceError", "name"],
    [" extends ", "kw"],
    [
      "SinterClientOptionsError",
      "ref",
      "/docs/api/classes/SinterClientOptionsError",
    ],
  ],
  comment: {
    summary:
      "<p>A database or collection name is invalid: empty, or containing forbidden\ncharacters. Code <code>INVALID_CLIENT_OPTIONS</code>.</p>",
    short:
      "A database or collection name is invalid: empty, or containing forbidden characters. Code <code>INVALID_CLIENT_OPTIONS</code>.",
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [],
  hierarchy: {
    name: "Error",
    href: null,
    kind: null,
    deprecated: false,
    current: false,
    children: [
      {
        name: "SinterError",
        href: "/docs/api/classes/SinterError",
        kind: "class",
        deprecated: false,
        current: false,
        children: [
          {
            name: "SinterClientOptionsError",
            href: "/docs/api/classes/SinterClientOptionsError",
            kind: "class",
            deprecated: false,
            current: false,
            children: [
              {
                name: "SinterNamespaceError",
                href: null,
                kind: "class",
                deprecated: false,
                current: true,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  signatureSection: null,
  signatures: [],
  sections: [
    {
      id: "constructors",
      title: "Constructors",
      members: [
        {
          id: 756,
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
              id: 757,
              code: [
                ["new ", "kw"],
                ["SinterNamespaceError", "name"],
                ["(", "pn"],
                ["message", "param"],
                [": ", "pn"],
                ["string", "prim"],
                [", ", "pn"],
                ["options", "param"],
                ["?: ", "pn"],
                ["ErrorOptions", "ref"],
                [")", "pn"],
              ],
              comment: null,
              typeParameters: [],
              parameters: [
                {
                  name: "message",
                  code: [
                    ["message", "param"],
                    [": ", "pn"],
                    ["string", "prim"],
                  ],
                  comment: null,
                  members: [],
                },
                {
                  name: "options",
                  code: [
                    ["options", "param"],
                    ["?: ", "pn"],
                    ["ErrorOptions", "ref"],
                  ],
                  comment: null,
                  members: [],
                },
              ],
              returns: null,
              sources: [
                {
                  path: "packages/driver/src/errors.ts",
                  line: 87,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L87",
                },
              ],
            },
          ],
          members: [],
          relations: [
            {
              label: "Inherited from",
              name: "SinterClientOptionsError.constructor",
              href: "/docs/api/classes/SinterClientOptionsError#constructor",
            },
          ],
          sources: [
            {
              path: "packages/driver/src/errors.ts",
              line: 87,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L87",
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
          id: 760,
          name: "code",
          anchor: "code",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["code", "name"],
            [": ", "pn"],
            ["SinterErrorCode", "ref", "/docs/api/types/SinterErrorCode"],
          ],
          comment: {
            summary:
              '<p>A stable identifier for the kind of failure; see <a href="/docs/api/variables/SinterErrorCode">SinterErrorCode</a>.</p>',
            short:
              'A stable identifier for the kind of failure; see <a href="/docs/api/variables/SinterErrorCode">SinterErrorCode</a>.',
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [
            {
              label: "Inherited from",
              name: "SinterClientOptionsError.code",
              href: "/docs/api/classes/SinterClientOptionsError#code",
            },
          ],
          sources: [
            {
              path: "packages/driver/src/errors.ts",
              line: 58,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L58",
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
          anchor: "code",
          name: "code",
          kind: "property",
          deprecated: false,
        },
      ],
    },
  ],
  sources: [
    {
      path: "packages/driver/src/namespace.ts",
      line: 7,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/namespace.ts#L7",
    },
  ],
  usedBy: [],
};

export const metadata: Metadata = {
  title: page.name,
  description: page.description || undefined,
};

export default function Page() {
  return <ApiReflectionPage page={page} />;
}
