import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 172,
  name: "SinterClientState",
  kind: "variable",
  label: "Variable",
  href: "/docs/api/variables/SinterClientState",
  description: "The lifecycle states of a SinterClient.",
  badges: [],
  declaration: [
    ["const ", "kw"],
    ["SinterClientState", "name"],
    [": {", "pn"],
    ["\n  "],
    ["readonly ", "kw"],
    ["Closed", "prop", "/docs/api/variables/SinterClientState#closed"],
    [": ", "pn"],
    ['"closed"', "lit"],
    [";", "pn"],
    ["\n  "],
    ["readonly ", "kw"],
    ["Closing", "prop", "/docs/api/variables/SinterClientState#closing"],
    [": ", "pn"],
    ['"closing"', "lit"],
    [";", "pn"],
    ["\n  "],
    ["readonly ", "kw"],
    ["Connected", "prop", "/docs/api/variables/SinterClientState#connected"],
    [": ", "pn"],
    ['"connected"', "lit"],
    [";", "pn"],
    ["\n  "],
    ["readonly ", "kw"],
    ["Connecting", "prop", "/docs/api/variables/SinterClientState#connecting"],
    [": ", "pn"],
    ['"connecting"', "lit"],
    [";", "pn"],
    ["\n  "],
    ["readonly ", "kw"],
    ["New", "prop", "/docs/api/variables/SinterClientState#new"],
    [": ", "pn"],
    ['"new"', "lit"],
    [";", "pn"],
    ["\n"],
    ["}", "pn"],
  ],
  comment: {
    summary:
      '<p>The lifecycle states of a <a href="/docs/api/classes/SinterClient">SinterClient</a>.</p>\n<p>A client moves from <code>new</code> to <code>connecting</code> to <code>connected</code>, and finally to\n<code>closing</code> and <code>closed</code>. A failed connection attempt returns it to <code>new</code>, so\n<code>connect()</code> can be called again. A closed client cannot be reused.</p>',
    short:
      'The lifecycle states of a <a href="/docs/api/classes/SinterClient">SinterClient</a>.',
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
      id: "type-declaration",
      title: "Properties",
      members: [
        {
          id: 178,
          name: "Closed",
          anchor: "closed",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["Closed", "name"],
            [": ", "pn"],
            ['"closed"', "lit"],
          ],
          comment: {
            summary: "<p>Closed for good; the client cannot be reused.</p>",
            short: "Closed for good; the client cannot be reused.",
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
              line: 135,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L135",
            },
          ],
        },
        {
          id: 177,
          name: "Closing",
          anchor: "closing",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["Closing", "name"],
            [": ", "pn"],
            ['"closing"', "lit"],
          ],
          comment: {
            summary: "<p><code>close()</code> is in progress.</p>",
            short: "<code>close()</code> is in progress.",
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
              line: 133,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L133",
            },
          ],
        },
        {
          id: 176,
          name: "Connected",
          anchor: "connected",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["Connected", "name"],
            [": ", "pn"],
            ['"connected"', "lit"],
          ],
          comment: {
            summary: "<p>Connected and ready for commands.</p>",
            short: "Connected and ready for commands.",
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
              line: 131,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L131",
            },
          ],
        },
        {
          id: 175,
          name: "Connecting",
          anchor: "connecting",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["Connecting", "name"],
            [": ", "pn"],
            ['"connecting"', "lit"],
          ],
          comment: {
            summary: "<p>A connection attempt is in progress.</p>",
            short: "A connection attempt is in progress.",
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
              line: 129,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L129",
            },
          ],
        },
        {
          id: 174,
          name: "New",
          anchor: "new",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["New", "name"],
            [": ", "pn"],
            ['"new"', "lit"],
          ],
          comment: {
            summary:
              "<p>Created, not yet connected. Also the state after a failed connection attempt.</p>",
            short:
              "Created, not yet connected. Also the state after a failed connection attempt.",
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
              line: 127,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L127",
            },
          ],
        },
      ],
    },
  ],
  toc: [
    {
      id: "type-declaration",
      title: "Properties",
      items: [
        {
          anchor: "closed",
          name: "Closed",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "closing",
          name: "Closing",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "connected",
          name: "Connected",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "connecting",
          name: "Connecting",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "new",
          name: "New",
          kind: "property",
          deprecated: false,
        },
      ],
    },
  ],
  sources: [
    {
      path: "packages/driver/src/client.ts",
      line: 125,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L125",
    },
    {
      path: "packages/driver/src/client.ts",
      line: 139,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L139",
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
