import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 489,
  name: "SinterCompatibilityError",
  kind: "class",
  label: "Class",
  href: "/docs/api/classes/SinterCompatibilityError",
  since: null,
  description:
    "The server does not speak a compatible protocol version. Code INCOMPATIBLE_PROTOCOL.",
  badges: [],
  declaration: [
    ["class ", "kw"],
    ["SinterCompatibilityError", "name"],
    [" extends ", "kw"],
    ["SinterServerError", "ref", "/docs/api/classes/SinterServerError"],
  ],
  comment: {
    summary:
      "<p>The server does not speak a compatible protocol version. Code\n<code>INCOMPATIBLE_PROTOCOL</code>.</p>",
    short:
      "The server does not speak a compatible protocol version. Code <code>INCOMPATIBLE_PROTOCOL</code>.",
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
            name: "SinterServerError",
            href: "/docs/api/classes/SinterServerError",
            kind: "class",
            deprecated: false,
            current: false,
            children: [
              {
                name: "SinterCompatibilityError",
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
          id: 499,
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
              id: 500,
              code: [
                ["new ", "kw"],
                ["SinterCompatibilityError", "name"],
                ["(", "pn"],
                ["\n  "],
                ["message", "param"],
                [": ", "pn"],
                ["string", "prim"],
                [",", "pn"],
                ["\n  "],
                ["options", "param"],
                ["?: ", "pn"],
                [
                  "SinterServerErrorOptions",
                  "ref",
                  "/docs/api/interfaces/SinterServerErrorOptions",
                ],
                [",", "pn"],
                ["\n"],
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
                    [
                      "SinterServerErrorOptions",
                      "ref",
                      "/docs/api/interfaces/SinterServerErrorOptions",
                    ],
                  ],
                  comment: null,
                  members: [],
                },
              ],
              returns: null,
              sources: [
                {
                  path: "packages/driver/src/errors.ts",
                  line: 185,
                  url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/errors.ts#L185",
                },
              ],
            },
          ],
          members: [],
          relations: [
            {
              label: "Inherited from",
              name: "SinterServerError.constructor",
              href: "/docs/api/classes/SinterServerError#constructor",
            },
          ],
          sources: [
            {
              path: "packages/driver/src/errors.ts",
              line: 185,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/errors.ts#L185",
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
          id: 503,
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
            ['"INCOMPATIBLE_PROTOCOL"', "lit"],
          ],
          comment: {
            summary: "<p>Always <code>INCOMPATIBLE_PROTOCOL</code>.</p>",
            short: "Always <code>INCOMPATIBLE_PROTOCOL</code>.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [
            {
              label: "Overrides",
              name: "SinterServerError.code",
              href: "/docs/api/classes/SinterServerError#code",
            },
          ],
          sources: [
            {
              path: "packages/driver/src/errors.ts",
              line: 235,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/errors.ts#L235",
            },
          ],
        },
        {
          id: 507,
          name: "details",
          anchor: "details",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["details", "name"],
            [": ", "pn"],
            ["Document", "ref", "/docs/api/interfaces/Document"],
            [" | ", "pn"],
            ["undefined", "prim"],
          ],
          comment: {
            summary:
              "<p>Extra structured information from the server, if any.</p>",
            short: "Extra structured information from the server, if any.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [
            {
              label: "Inherited from",
              name: "SinterInsertManyError.details",
              href: "/docs/api/classes/SinterInsertManyError#details",
            },
          ],
          sources: [
            {
              path: "packages/driver/src/errors.ts",
              line: 183,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/errors.ts#L183",
            },
          ],
        },
        {
          id: 506,
          name: "retryable",
          anchor: "retryable",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["retryable", "name"],
            [": ", "pn"],
            ["boolean", "prim"],
          ],
          comment: {
            summary:
              "<p>Whether the server says the same request may succeed if retried. <code>false</code>\nunless stated.</p>",
            short:
              "Whether the server says the same request may succeed if retried. <code>false</code> unless stated.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [
            {
              label: "Inherited from",
              name: "SinterServerError.retryable",
              href: "/docs/api/classes/SinterServerError#retryable",
            },
          ],
          sources: [
            {
              path: "packages/driver/src/errors.ts",
              line: 181,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/errors.ts#L181",
            },
          ],
        },
        {
          id: 505,
          name: "serverErrorName",
          anchor: "server-error-name",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["serverErrorName", "name"],
            [": ", "pn"],
            ["string", "prim"],
            [" | ", "pn"],
            ["undefined", "prim"],
          ],
          comment: {
            summary:
              "<p>The server's name for the error, such as <code>DuplicateKey</code>.</p>",
            short:
              "The server's name for the error, such as <code>DuplicateKey</code>.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [
            {
              label: "Inherited from",
              name: "SinterInsertManyError.serverErrorName",
              href: "/docs/api/classes/SinterInsertManyError#server-error-name",
            },
          ],
          sources: [
            {
              path: "packages/driver/src/errors.ts",
              line: 176,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/errors.ts#L176",
            },
          ],
        },
        {
          id: 504,
          name: "wireCode",
          anchor: "wire-code",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["wireCode", "name"],
            [": ", "pn"],
            ["number", "prim"],
            [" | ", "pn"],
            ["undefined", "prim"],
          ],
          comment: {
            summary:
              "<p>The numeric error code from the wire protocol, if the server sent one.</p>",
            short:
              "The numeric error code from the wire protocol, if the server sent one.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [
            {
              label: "Inherited from",
              name: "SinterInsertManyError.wireCode",
              href: "/docs/api/classes/SinterInsertManyError#wire-code",
            },
          ],
          sources: [
            {
              path: "packages/driver/src/errors.ts",
              line: 174,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/errors.ts#L174",
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
        {
          anchor: "details",
          name: "details",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "retryable",
          name: "retryable",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "server-error-name",
          name: "serverErrorName",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "wire-code",
          name: "wireCode",
          kind: "property",
          deprecated: false,
        },
      ],
    },
  ],
  sources: [
    {
      path: "packages/driver/src/errors.ts",
      line: 233,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/errors.ts#L233",
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
