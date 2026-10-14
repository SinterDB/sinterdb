import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 459,
  name: "SinterConnectionTimeoutError",
  kind: "class",
  label: "Class",
  href: "/docs/api/classes/SinterConnectionTimeoutError",
  since: null,
  description: "Connecting took longer than connectTimeoutMS.",
  badges: [],
  declaration: [
    ["class ", "kw"],
    ["SinterConnectionTimeoutError", "name"],
    [" extends ", "kw"],
    ["SinterConnectionError", "ref", "/docs/api/classes/SinterConnectionError"],
  ],
  comment: {
    summary:
      "<p>Connecting took longer than <code>connectTimeoutMS</code>.</p>",
    short: "Connecting took longer than <code>connectTimeoutMS</code>.",
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
            href: "/docs/api/classes/SinterConnectionError",
            kind: "class",
            deprecated: false,
            current: false,
            children: [
              {
                name: "SinterConnectionTimeoutError",
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
          id: 469,
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
              id: 470,
              code: [
                ["new ", "kw"],
                ["SinterConnectionTimeoutError", "name"],
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
              label: "Inherited from",
              name: "SinterConnectionError.constructor",
              href: "/docs/api/classes/SinterConnectionError#constructor",
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
          id: 473,
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
            ['"CONNECTION_TIMEOUT"', "lit"],
          ],
          comment: {
            summary: "<p>Always <code>CONNECTION_TIMEOUT</code>.</p>",
            short: "Always <code>CONNECTION_TIMEOUT</code>.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [
            {
              label: "Overrides",
              name: "SinterConnectionError.code",
              href: "/docs/api/classes/SinterConnectionError#code",
            },
          ],
          sources: [
            {
              path: "packages/driver/src/errors.ts",
              line: 134,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L134",
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
      line: 132,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L132",
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
