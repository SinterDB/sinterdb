import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 180,
  name: "SinterClientEvents",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/SinterClientEvents",
  since: null,
  description: "The events a SinterClient emits.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["SinterClientEvents", "name"],
  ],
  comment: {
    summary:
      '<p>The events a <a href="/docs/api/classes/SinterClient">SinterClient</a> emits.</p>\n<p>An <code>error</code> event is emitted only while at least one <code>error</code> listener is\nattached.</p>',
    short:
      'The events a <a href="/docs/api/classes/SinterClient">SinterClient</a> emits.',
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
          id: 183,
          name: "closed",
          anchor: "closed",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["closed", "name"],
            [": [", "pn"],
            ["client", "param"],
            [": ", "pn"],
            ["SinterClient", "ref", "/docs/api/classes/SinterClient"],
            ["]", "pn"],
          ],
          comment: {
            summary: "<p>Emitted after the client has closed.</p>",
            short: "Emitted after the client has closed.",
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
              line: 110,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/client.ts#L110",
            },
          ],
        },
        {
          id: 182,
          name: "connected",
          anchor: "connected",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["connected", "name"],
            [": [", "pn"],
            ["client", "param"],
            [": ", "pn"],
            ["SinterClient", "ref", "/docs/api/classes/SinterClient"],
            ["]", "pn"],
          ],
          comment: {
            summary:
              "<p>Emitted once the handshake has succeeded and the client is ready for\ncommands.</p>",
            short:
              "Emitted once the handshake has succeeded and the client is ready for commands.",
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
              line: 108,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/client.ts#L108",
            },
          ],
        },
        {
          id: 181,
          name: "connecting",
          anchor: "connecting",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["connecting", "name"],
            [": [", "pn"],
            ["client", "param"],
            [": ", "pn"],
            ["SinterClient", "ref", "/docs/api/classes/SinterClient"],
            ["]", "pn"],
          ],
          comment: {
            summary:
              "<p>Emitted when <code>connect()</code> starts a connection attempt.</p>",
            short:
              "Emitted when <code>connect()</code> starts a connection attempt.",
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
              line: 103,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/client.ts#L103",
            },
          ],
        },
        {
          id: 184,
          name: "error",
          anchor: "error",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["error", "name"],
            [": [", "pn"],
            ["error", "param"],
            [": ", "pn"],
            ["Error", "ref"],
            ["]", "pn"],
          ],
          comment: {
            summary:
              "<p>Emitted when the connection fails after it was established, such as a\nsocket error or an idle timeout.</p>",
            short:
              "Emitted when the connection fails after it was established, such as a socket error or an idle timeout.",
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
              line: 115,
              url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/client.ts#L115",
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
          anchor: "closed",
          name: "closed",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "connected",
          name: "connected",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "connecting",
          name: "connecting",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "error",
          name: "error",
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
      line: 101,
      url: "https://github.com/SinterDB/sinterdb/blob/v0.3.0/packages/driver/src/client.ts#L101",
    },
  ],
  usedBy: [
    {
      name: "SinterClient",
      href: "/docs/api/classes/SinterClient",
      kind: "class",
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
