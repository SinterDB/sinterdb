import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 450,
  name: "SinterClientOptionsError",
  kind: "class",
  label: "Class",
  href: "/docs/api/classes/SinterClientOptionsError",
  since: null,
  description:
    "A client option or a database or collection name is invalid. Code INVALID_CLIENT_OPTIONS.",
  badges: [],
  declaration: [
    ["class ", "kw"],
    ["SinterClientOptionsError", "name"],
    [" extends ", "kw"],
    ["SinterError", "ref", "/docs/api/classes/SinterError"],
  ],
  comment: {
    summary:
      "<p>A client option or a database or collection name is invalid. Code\n<code>INVALID_CLIENT_OPTIONS</code>.</p>",
    short:
      "A client option or a database or collection name is invalid. Code <code>INVALID_CLIENT_OPTIONS</code>.",
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
            href: null,
            kind: "class",
            deprecated: false,
            current: true,
            children: [
              {
                name: "SinterNamespaceError",
                href: "/docs/api/classes/SinterNamespaceError",
                kind: "class",
                deprecated: false,
                current: false,
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
          id: 460,
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
              id: 461,
              code: [
                ["new ", "kw"],
                ["SinterClientOptionsError", "name"],
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
              label: "Overrides",
              name: "SinterError.constructor",
              href: "/docs/api/classes/SinterError#constructor",
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
          id: 464,
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
              name: "SinterError.code",
              href: "/docs/api/classes/SinterError#code",
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
    {
      id: "used-by",
      title: "Used by",
      items: [],
    },
  ],
  sources: [
    {
      path: "packages/driver/src/errors.ts",
      line: 86,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L86",
    },
  ],
  usedBy: [
    {
      name: "SinterNamespaceError",
      href: "/docs/api/classes/SinterNamespaceError",
      kind: "class",
    },
    {
      name: "SinterNamespaceError.code",
      href: "/docs/api/classes/SinterNamespaceError#code",
      kind: "property",
    },
    {
      name: "SinterNamespaceError.constructor",
      href: "/docs/api/classes/SinterNamespaceError#constructor",
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
