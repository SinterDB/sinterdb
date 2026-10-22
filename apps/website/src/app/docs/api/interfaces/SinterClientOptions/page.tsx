import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 185,
  name: "SinterClientOptions",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/SinterClientOptions",
  since: null,
  description:
    "Options for SinterClient. Every timeout is a whole number of milliseconds no greater than 2,147,483,647. An invalid value throws a SinterClientOptionsError.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["SinterClientOptions", "name"],
  ],
  comment: {
    summary:
      '<p>Options for <a href="/docs/api/classes/SinterClient">SinterClient</a>. Every timeout is a whole number of\nmilliseconds no greater than 2,147,483,647. An invalid value throws a\n<a href="/docs/api/classes/SinterClientOptionsError">SinterClientOptionsError</a>.</p>',
    short:
      'Options for <a href="/docs/api/classes/SinterClient">SinterClient</a>. Every timeout is a whole number of milliseconds no greater than 2,147,483,647. An invalid value throws a <a href="/docs/api/classes/SinterClientOptionsError">SinterClientOptionsError</a>.',
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [],
  hierarchy: null,
  signatureSection: null,
  signatures: [],
  sections: [
    {
      id: "properties",
      title: "Properties",
      members: [
        {
          id: 186,
          name: "connectTimeoutMS",
          anchor: "connect-timeout-ms",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["connectTimeoutMS", "name"],
            ["?: ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary:
              '<p>How long <code>connect()</code> may take, including the protocol handshake, before\nit fails with a <a href="/docs/api/classes/SinterConnectionTimeoutError">SinterConnectionTimeoutError</a>. Must be at least 1.\nDefaults to 10,000.</p>',
            short:
              'How long <code>connect()</code> may take, including the protocol handshake, before it fails with a <a href="/docs/api/classes/SinterConnectionTimeoutError">SinterConnectionTimeoutError</a>. Must be at least 1. Defaults to 10,000.',
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/client.ts",
              line: 52,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/client.ts#L52",
            },
          ],
        },
        {
          id: 187,
          name: "requestTimeoutMS",
          anchor: "request-timeout-ms",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["requestTimeoutMS", "name"],
            ["?: ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary:
              '<p>How long a single request may wait for its response before it fails with\na <a href="/docs/api/classes/SinterRequestTimeoutError">SinterRequestTimeoutError</a>. Must be at least 1. Defaults to\n10,000.</p>',
            short:
              'How long a single request may wait for its response before it fails with a <a href="/docs/api/classes/SinterRequestTimeoutError">SinterRequestTimeoutError</a>. Must be at least 1. Defaults to 10,000.',
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/client.ts",
              line: 58,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/client.ts#L58",
            },
          ],
        },
        {
          id: 188,
          name: "socketTimeoutMS",
          anchor: "socket-timeout-ms",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["socketTimeoutMS", "name"],
            ["?: ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary:
              '<p>How long the connection may be inactive before the socket is closed with\na <a href="/docs/api/classes/SinterSocketTimeoutError">SinterSocketTimeoutError</a>. 0, the default, disables the timeout.</p>',
            short:
              'How long the connection may be inactive before the socket is closed with a <a href="/docs/api/classes/SinterSocketTimeoutError">SinterSocketTimeoutError</a>. 0, the default, disables the timeout.',
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/client.ts",
              line: 63,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/client.ts#L63",
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
          anchor: "connect-timeout-ms",
          name: "connectTimeoutMS",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "request-timeout-ms",
          name: "requestTimeoutMS",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "socket-timeout-ms",
          name: "socketTimeoutMS",
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
      path: "packages/driver/src/client.ts",
      line: 46,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/client.ts#L46",
    },
  ],
  usedBy: [
    {
      name: "SinterClient.constructor",
      href: "/docs/api/classes/SinterClient#constructor",
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
