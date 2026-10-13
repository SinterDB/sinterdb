import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 194,
  name: "SinterServerInfo",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/SinterServerInfo",
  description:
    "What the server reported during the protocol handshake. Available from SinterClient.serverInfo once the client is connected.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["SinterServerInfo", "name"],
  ],
  comment: {
    summary:
      '<p>What the server reported during the protocol handshake. Available from\n<a href="/docs/api/classes/SinterClient#server-info">SinterClient.serverInfo</a> once the client is connected.</p>',
    short:
      'What the server reported during the protocol handshake. Available from <a href="/docs/api/classes/SinterClient#server-info">SinterClient.serverInfo</a> once the client is connected.',
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
          id: 198,
          name: "capabilities",
          anchor: "capabilities",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["capabilities", "name"],
            [": ", "pn"],
            ["readonly ", "kw"],
            ["string", "prim"],
            ["[]", "pn"],
          ],
          comment: {
            summary: "<p>The protocol capabilities the server advertised.</p>",
            short: "The protocol capabilities the server advertised.",
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
              line: 78,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L78",
            },
          ],
        },
        {
          id: 196,
          name: "product",
          anchor: "product",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["product", "name"],
            [": ", "pn"],
            ["string", "prim"],
          ],
          comment: {
            summary: "<p>The server's product name.</p>",
            short: "The server's product name.",
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
              line: 74,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L74",
            },
          ],
        },
        {
          id: 197,
          name: "productVersion",
          anchor: "product-version",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["productVersion", "name"],
            [": ", "pn"],
            ["string", "prim"],
          ],
          comment: {
            summary: "<p>The server's version.</p>",
            short: "The server's version.",
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
              line: 76,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L76",
            },
          ],
        },
        {
          id: 195,
          name: "protocolVersion",
          anchor: "protocol-version",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["protocolVersion", "name"],
            [": ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary: "<p>The wire protocol version both sides agreed on.</p>",
            short: "The wire protocol version both sides agreed on.",
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
              line: 72,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L72",
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
          anchor: "capabilities",
          name: "capabilities",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "product",
          name: "product",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "product-version",
          name: "productVersion",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "protocol-version",
          name: "protocolVersion",
          kind: "property",
          deprecated: false,
        },
      ],
    },
  ],
  sources: [
    {
      path: "packages/driver/src/client.ts",
      line: 70,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L70",
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
