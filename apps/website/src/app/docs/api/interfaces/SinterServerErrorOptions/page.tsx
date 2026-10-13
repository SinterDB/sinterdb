import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 617,
  name: "SinterServerErrorOptions",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/SinterServerErrorOptions",
  description: "Details a server error response can carry.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["SinterServerErrorOptions", "name"],
    [" extends ", "kw"],
    ["ErrorOptions", "ref"],
  ],
  comment: {
    summary: "<p>Details a server error response can carry.</p>",
    short: "Details a server error response can carry.",
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [],
  hierarchy: {
    name: "ErrorOptions",
    href: null,
    kind: null,
    deprecated: false,
    current: false,
    children: [
      {
        name: "SinterServerErrorOptions",
        href: null,
        kind: "interface",
        deprecated: false,
        current: true,
        children: [],
      },
    ],
  },
  signatureSection: null,
  signatures: [],
  sections: [
    {
      id: "properties",
      title: "Properties",
      members: [
        {
          id: 621,
          name: "details",
          anchor: "details",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["details", "name"],
            ["?: ", "pn"],
            ["Document", "ref", "/docs/api/interfaces/Document"],
          ],
          comment: {
            summary: "<p>Extra structured information from the server.</p>",
            short: "Extra structured information from the server.",
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
              line: 47,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L47",
            },
          ],
        },
        {
          id: 620,
          name: "retryable",
          anchor: "retryable",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["retryable", "name"],
            ["?: ", "pn"],
            ["boolean", "prim"],
          ],
          comment: {
            summary:
              "<p>Whether the server says the same request may succeed if retried.</p>",
            short:
              "Whether the server says the same request may succeed if retried.",
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
              line: 45,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L45",
            },
          ],
        },
        {
          id: 619,
          name: "serverErrorName",
          anchor: "server-error-name",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["serverErrorName", "name"],
            ["?: ", "pn"],
            ["string", "prim"],
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
          relations: [],
          sources: [
            {
              path: "packages/driver/src/errors.ts",
              line: 43,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L43",
            },
          ],
        },
        {
          id: 618,
          name: "wireCode",
          anchor: "wire-code",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["wireCode", "name"],
            ["?: ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary: "<p>The numeric error code from the wire protocol.</p>",
            short: "The numeric error code from the wire protocol.",
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
              line: 41,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L41",
            },
          ],
        },
      ],
    },
  ],
  toc: [
    {
      id: "properties",
      title: "Properties",
      items: [
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
      line: 39,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/errors.ts#L39",
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
