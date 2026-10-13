import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 511,
  name: "SinterInsertManyError",
  kind: "class",
  label: "Class",
  href: "/docs/api/classes/SinterInsertManyError",
  description:
    "insertMany failed partway. The documents before failedIndex were inserted and stay committed.",
  badges: [],
  declaration: [
    ["class ", "kw"],
    ["SinterInsertManyError", "name"],
    [" extends ", "kw"],
    ["SinterServerError", "ref", "/docs/api/classes/SinterServerError"],
  ],
  comment: {
    summary:
      "<p><code>insertMany</code> failed partway. The documents before <code>failedIndex</code> were\ninserted and stay committed.</p>",
    short:
      "<code>insertMany</code> failed partway. The documents before <code>failedIndex</code> were inserted and stay committed.",
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
        deprecated: true,
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
                name: "SinterInsertManyError",
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
          id: 521,
          name: "constructor",
          anchor: "constructor",
          kind: "constructor",
          deprecated: false,
          label: "Constructor",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 522,
              code: [
                ["new ", "kw"],
                ["SinterInsertManyError", "name"],
                ["(", "pn"],
                ["\n  "],
                ["serverError", "param"],
                [": ", "pn"],
                [
                  "SinterServerError",
                  "ref",
                  "/docs/api/classes/SinterServerError",
                ],
                [",", "pn"],
                ["\n  "],
                ["failedIndex", "param"],
                [": ", "pn"],
                ["number", "prim"],
                [",", "pn"],
                ["\n  "],
                ["insertedIds", "param"],
                [": ", "pn"],
                ["readonly ", "kw"],
                ["CustomId", "ref", "/docs/api/classes/CustomId"],
                ["[],", "pn"],
                ["\n"],
                [")", "pn"],
              ],
              comment: null,
              typeParameters: [],
              parameters: [
                {
                  name: "serverError",
                  code: [
                    ["serverError", "param"],
                    [": ", "pn"],
                    [
                      "SinterServerError",
                      "ref",
                      "/docs/api/classes/SinterServerError",
                    ],
                  ],
                  comment: null,
                  members: [],
                },
                {
                  name: "failedIndex",
                  code: [
                    ["failedIndex", "param"],
                    [": ", "pn"],
                    ["number", "prim"],
                  ],
                  comment: null,
                  members: [],
                },
                {
                  name: "insertedIds",
                  code: [
                    ["insertedIds", "param"],
                    [": ", "pn"],
                    ["readonly ", "kw"],
                    ["CustomId", "ref", "/docs/api/classes/CustomId"],
                    ["[]", "pn"],
                  ],
                  comment: null,
                  members: [],
                },
              ],
              returns: null,
              sources: [
                {
                  path: "packages/driver/src/errors.ts",
                  line: 207,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L207",
                },
              ],
            },
          ],
          members: [],
          relations: [
            {
              label: "Overrides",
              name: "SinterServerError.constructor",
              href: "/docs/api/classes/SinterServerError#constructor",
            },
          ],
          sources: [
            {
              path: "packages/driver/src/errors.ts",
              line: 207,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L207",
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
          id: 532,
          name: "code",
          anchor: "code",
          kind: "property",
          deprecated: false,
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
              name: "SinterServerError.code",
              href: "/docs/api/classes/SinterServerError#code",
            },
          ],
          sources: [
            {
              path: "packages/driver/src/errors.ts",
              line: 60,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L60",
            },
          ],
        },
        {
          id: 531,
          name: "details",
          anchor: "details",
          kind: "property",
          deprecated: false,
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
              name: "SinterServerError.details",
              href: "/docs/api/classes/SinterServerError#details",
            },
          ],
          sources: [
            {
              path: "packages/driver/src/errors.ts",
              line: 185,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L185",
            },
          ],
        },
        {
          id: 526,
          name: "failedIndex",
          anchor: "failed-index",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["failedIndex", "name"],
            [": ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary:
              "<p>The position, in the input array, of the document that failed.</p>",
            short:
              "The position, in the input array, of the document that failed.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/errors.ts",
              line: 203,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L203",
            },
          ],
        },
        {
          id: 527,
          name: "insertedIds",
          anchor: "inserted-ids",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["insertedIds", "name"],
            [": ", "pn"],
            ["readonly ", "kw"],
            ["CustomId", "ref", "/docs/api/classes/CustomId"],
            ["[]", "pn"],
          ],
          comment: {
            summary:
              "<p>The <code>_id</code> of every document that was inserted before the failure.</p>",
            short:
              "The <code>_id</code> of every document that was inserted before the failure.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/errors.ts",
              line: 205,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L205",
            },
          ],
        },
        {
          id: 530,
          name: "retryable",
          anchor: "retryable",
          kind: "property",
          deprecated: false,
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
              line: 183,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L183",
            },
          ],
        },
        {
          id: 529,
          name: "serverErrorName",
          anchor: "server-error-name",
          kind: "property",
          deprecated: false,
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
              name: "SinterServerError.serverErrorName",
              href: "/docs/api/classes/SinterServerError#server-error-name",
            },
          ],
          sources: [
            {
              path: "packages/driver/src/errors.ts",
              line: 178,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L178",
            },
          ],
        },
        {
          id: 528,
          name: "wireCode",
          anchor: "wire-code",
          kind: "property",
          deprecated: false,
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
              name: "SinterServerError.wireCode",
              href: "/docs/api/classes/SinterServerError#wire-code",
            },
          ],
          sources: [
            {
              path: "packages/driver/src/errors.ts",
              line: 176,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L176",
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
          anchor: "failed-index",
          name: "failedIndex",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "inserted-ids",
          name: "insertedIds",
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
      line: 201,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L201",
    },
  ],
} satisfies ApiPage;

export const metadata: Metadata = {
  title: page.name,
  description: page.description || undefined,
};

export default function Page() {
  return <ApiReflectionPage page={page} />;
}
