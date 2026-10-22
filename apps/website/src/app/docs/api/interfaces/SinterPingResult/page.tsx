import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 189,
  name: "SinterPingResult",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/SinterPingResult",
  since: null,
  description: "The result of SinterClient.ping.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["SinterPingResult", "name"],
  ],
  comment: {
    summary:
      '<p>The result of <a href="/docs/api/classes/SinterClient#ping">SinterClient.ping</a>.</p>',
    short:
      'The result of <a href="/docs/api/classes/SinterClient#ping">SinterClient.ping</a>.',
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
          id: 190,
          name: "ok",
          anchor: "ok",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["ok", "name"],
            [": ", "pn"],
            ["true", "lit"],
          ],
          comment: {
            summary:
              "<p>Always <code>true</code>; a failed ping throws instead.</p>",
            short: "Always <code>true</code>; a failed ping throws instead.",
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
              line: 84,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L84",
            },
          ],
        },
        {
          id: 192,
          name: "receivedAt",
          anchor: "received-at",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["receivedAt", "name"],
            [": ", "pn"],
            ["Date", "ref"],
          ],
          comment: {
            summary:
              "<p>When the server received the ping, by the server's clock.</p>",
            short: "When the server received the ping, by the server's clock.",
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
              line: 88,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L88",
            },
          ],
        },
        {
          id: 193,
          name: "roundTripTimeMS",
          anchor: "round-trip-time-ms",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["roundTripTimeMS", "name"],
            [": ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary:
              "<p>The measured round trip, in milliseconds, with sub-millisecond precision.</p>",
            short:
              "The measured round trip, in milliseconds, with sub-millisecond precision.",
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
              line: 92,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L92",
            },
          ],
        },
        {
          id: 191,
          name: "sentAt",
          anchor: "sent-at",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["sentAt", "name"],
            [": ", "pn"],
            ["Date", "ref"],
          ],
          comment: {
            summary: "<p>When the client sent the ping.</p>",
            short: "When the client sent the ping.",
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
              line: 86,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L86",
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
          anchor: "ok",
          name: "ok",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "received-at",
          name: "receivedAt",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "round-trip-time-ms",
          name: "roundTripTimeMS",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "sent-at",
          name: "sentAt",
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
      line: 82,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L82",
    },
  ],
  usedBy: [
    {
      name: "SinterClient.ping",
      href: "/docs/api/classes/SinterClient#ping",
      kind: "method",
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
