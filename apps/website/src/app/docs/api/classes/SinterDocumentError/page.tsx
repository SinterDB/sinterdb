import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 555,
  name: "SinterDocumentError",
  kind: "class",
  label: "Class",
  href: "/docs/api/classes/SinterDocumentError",
  since: null,
  description:
    "A request could not be encoded, so nothing was sent and the connection is unaffected. The usual causes are a value the database cannot store (such as undefined, a function, or a class instance like Map), a document nested more than 100 levels deep, or a request larger than 16 MiB. The cause says which. Code INVALID_DOCUMENT.",
  badges: [],
  declaration: [
    ["class ", "kw"],
    ["SinterDocumentError", "name"],
    [" extends ", "kw"],
    ["SinterError", "ref", "/docs/api/classes/SinterError"],
  ],
  comment: {
    summary:
      "<p>A request could not be encoded, so nothing was sent and the connection is\nunaffected. The usual causes are a value the database cannot store (such as\n<code>undefined</code>, a function, or a class instance like <code>Map</code>), a document nested\nmore than 100 levels deep, or a request larger than 16 MiB. The <code>cause</code> says\nwhich. Code <code>INVALID_DOCUMENT</code>.</p>",
    short:
      "A request could not be encoded, so nothing was sent and the connection is unaffected. The usual causes are a value the database cannot store (such as <code>undefined</code>, a function, or a class instance like <code>Map</code>), a document nested more than 100 levels deep, or a request larger than 16 MiB. The <code>cause</code> says which. Code <code>INVALID_DOCUMENT</code>.",
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
            name: "SinterDocumentError",
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
          id: 565,
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
              id: 566,
              code: [
                ["new ", "kw"],
                ["SinterDocumentError", "name"],
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
                  line: 100,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L100",
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
              line: 100,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L100",
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
          id: 569,
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
      line: 99,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L99",
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
