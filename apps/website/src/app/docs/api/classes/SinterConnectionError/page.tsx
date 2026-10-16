import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 470,
  name: "SinterConnectionError",
  kind: "class",
  label: "Class",
  href: "/docs/api/classes/SinterConnectionError",
  since: null,
  description:
    "The connection could not be established or was lost. Code CONNECTION_FAILED.",
  badges: [],
  declaration: [
    ["class ", "kw"],
    ["SinterConnectionError", "name"],
    [" extends ", "kw"],
    ["SinterError", "ref", "/docs/api/classes/SinterError"],
  ],
  comment: {
    summary:
      "<p>The connection could not be established or was lost. Code\n<code>CONNECTION_FAILED</code>.</p>",
    short:
      "The connection could not be established or was lost. Code <code>CONNECTION_FAILED</code>.",
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
            name: "SinterConnectionError",
            href: null,
            kind: "class",
            deprecated: false,
            current: true,
            children: [
              {
                name: "SinterConnectionTimeoutError",
                href: "/docs/api/classes/SinterConnectionTimeoutError",
                kind: "class",
                deprecated: false,
                current: false,
                children: [],
              },
              {
                name: "SinterSocketTimeoutError",
                href: "/docs/api/classes/SinterSocketTimeoutError",
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
          id: 480,
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
              id: 481,
              code: [
                ["new ", "kw"],
                ["SinterConnectionError", "name"],
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
                  line: 126,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L126",
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
              line: 126,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L126",
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
          id: 484,
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
      line: 125,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L125",
    },
  ],
  usedBy: [
    {
      name: "SinterConnectionTimeoutError",
      href: "/docs/api/classes/SinterConnectionTimeoutError",
      kind: "class",
    },
    {
      name: "SinterConnectionTimeoutError.code",
      href: "/docs/api/classes/SinterConnectionTimeoutError#code",
      kind: "property",
    },
    {
      name: "SinterConnectionTimeoutError.constructor",
      href: "/docs/api/classes/SinterConnectionTimeoutError#constructor",
      kind: "constructor",
    },
    {
      name: "SinterSocketTimeoutError",
      href: "/docs/api/classes/SinterSocketTimeoutError",
      kind: "class",
    },
    {
      name: "SinterSocketTimeoutError.code",
      href: "/docs/api/classes/SinterSocketTimeoutError#code",
      kind: "property",
    },
    {
      name: "SinterSocketTimeoutError.constructor",
      href: "/docs/api/classes/SinterSocketTimeoutError#constructor",
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
