import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 469,
  name: "SinterClientStateError",
  kind: "class",
  label: "Class",
  href: "/docs/api/classes/SinterClientStateError",
  since: null,
  description:
    "A command was used in the wrong client state: CLIENT_NOT_CONNECTED before connect(), or CLIENT_CLOSED after close().",
  badges: [],
  declaration: [
    ["class ", "kw"],
    ["SinterClientStateError", "name"],
    [" extends ", "kw"],
    ["SinterError", "ref", "/docs/api/classes/SinterError"],
  ],
  comment: {
    summary:
      "<p>A command was used in the wrong client state: <code>CLIENT_NOT_CONNECTED</code> before\n<code>connect()</code>, or <code>CLIENT_CLOSED</code> after <code>close()</code>.</p>",
    short:
      "A command was used in the wrong client state: <code>CLIENT_NOT_CONNECTED</code> before <code>connect()</code>, or <code>CLIENT_CLOSED</code> after <code>close()</code>.",
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
            name: "SinterClientStateError",
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
  signatureSection: null,
  signatures: [],
  sections: [
    {
      id: "constructors",
      title: "Constructors",
      members: [
        {
          id: 479,
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
              id: 480,
              code: [
                ["new ", "kw"],
                ["SinterClientStateError", "name"],
                ["(", "pn"],
                ["\n  "],
                ["code", "param"],
                [": ", "pn"],
                ['"CLIENT_CLOSED"', "lit"],
                [" | ", "pn"],
                ['"CLIENT_NOT_CONNECTED"', "lit"],
                [",", "pn"],
                ["\n  "],
                ["message", "param"],
                [": ", "pn"],
                ["string", "prim"],
                [",", "pn"],
                ["\n  "],
                ["options", "param"],
                ["?: ", "pn"],
                ["ErrorOptions", "ref"],
                [",", "pn"],
                ["\n"],
                [")", "pn"],
              ],
              comment: null,
              typeParameters: [],
              parameters: [
                {
                  name: "code",
                  code: [
                    ["code", "param"],
                    [": ", "pn"],
                    ['"CLIENT_CLOSED"', "lit"],
                    [" | ", "pn"],
                    ['"CLIENT_NOT_CONNECTED"', "lit"],
                  ],
                  comment: null,
                  members: [],
                },
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
                  line: 110,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L110",
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
              line: 110,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L110",
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
  ],
  sources: [
    {
      path: "packages/driver/src/errors.ts",
      line: 109,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L109",
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
