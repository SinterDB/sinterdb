import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 32,
  name: "SinterClient",
  kind: "class",
  label: "Class",
  href: "/docs/api/classes/SinterClient",
  description: "A connection to a SinterDB server.",
  badges: [],
  declaration: [
    ["class ", "kw"],
    ["SinterClient", "name"],
    [" extends ", "kw"],
    ["EventEmitter", "ref"],
    ["<", "pn"],
    ["SinterClientEvents", "ref", "/docs/api/interfaces/SinterClientEvents"],
    [">", "pn"],
  ],
  comment: {
    summary:
      '<p>A connection to a SinterDB server.</p>\n<p>Create a client from a <code>sinterdb://</code> connection string, call <code>connect()</code>,\nand then use <code>db()</code> to reach databases and collections. Commands sent\nbefore <code>connect()</code> completes throw a <a href="/docs/api/classes/SinterClientStateError">SinterClientStateError</a>. Call\n<code>close()</code> when finished.</p>',
    short: "A connection to a SinterDB server.",
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [],
  hierarchy: {
    name: "EventEmitter<SinterClientEvents>",
    href: null,
    kind: null,
    deprecated: false,
    current: false,
    children: [
      {
        name: "SinterClient",
        href: null,
        kind: "class",
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
      id: "constructors",
      title: "Constructors",
      members: [
        {
          id: 33,
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
              id: 34,
              code: [
                ["new ", "kw"],
                ["SinterClient", "name"],
                ["(", "pn"],
                ["connectionString", "param"],
                [": ", "pn"],
                ["string", "prim"],
                [", ", "pn"],
                ["options", "param"],
                ["?: ", "pn"],
                [
                  "SinterClientOptions",
                  "ref",
                  "/docs/api/interfaces/SinterClientOptions",
                ],
                [")", "pn"],
              ],
              comment: null,
              typeParameters: [],
              parameters: [
                {
                  name: "connectionString",
                  code: [
                    ["connectionString", "param"],
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
                      "SinterClientOptions",
                      "ref",
                      "/docs/api/interfaces/SinterClientOptions",
                    ],
                  ],
                  comment: null,
                  members: [],
                },
              ],
              returns: null,
              sources: [
                {
                  path: "packages/driver/src/client.ts",
                  line: 170,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L170",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/client.ts",
              line: 170,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L170",
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
          id: 38,
          name: "connectTimeoutMS",
          anchor: "connect-timeout-ms",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["connectTimeoutMS", "name"],
            [": ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary: "<p>The effective connect timeout in milliseconds.</p>",
            short: "The effective connect timeout in milliseconds.",
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
              line: 156,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L156",
            },
          ],
        },
        {
          id: 39,
          name: "requestTimeoutMS",
          anchor: "request-timeout-ms",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["requestTimeoutMS", "name"],
            [": ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary: "<p>The effective request timeout in milliseconds.</p>",
            short: "The effective request timeout in milliseconds.",
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
              line: 158,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L158",
            },
          ],
        },
        {
          id: 40,
          name: "socketTimeoutMS",
          anchor: "socket-timeout-ms",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["socketTimeoutMS", "name"],
            [": ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary:
              "<p>The effective idle socket timeout in milliseconds, or 0 when disabled.</p>",
            short:
              "The effective idle socket timeout in milliseconds, or 0 when disabled.",
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
              line: 162,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L162",
            },
          ],
        },
        {
          id: 37,
          name: "target",
          anchor: "target",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["target", "name"],
            [": ", "pn"],
            [
              "ParsedSinterConnectionString",
              "ref",
              "/docs/api/interfaces/ParsedSinterConnectionString",
            ],
          ],
          comment: {
            summary:
              "<p>The host, port and optional database parsed from the connection string.</p>",
            short:
              "The host, port and optional database parsed from the connection string.",
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
              line: 154,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L154",
            },
          ],
        },
      ],
    },
    {
      id: "accessors",
      title: "Accessors",
      members: [
        {
          id: 48,
          name: "connected",
          anchor: "connected",
          kind: "accessor",
          deprecated: false,
          label: "Accessor",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 49,
              code: [
                ["get ", "kw"],
                ["connected", "name"],
                ["(): ", "pn"],
                ["boolean", "prim"],
              ],
              comment: {
                summary:
                  "<p>Whether the client is connected and ready for commands.</p>",
                short:
                  "Whether the client is connected and ready for commands.",
                deprecated: null,
                modifiers: [],
                blocks: [],
              },
              typeParameters: [],
              parameters: [],
              returns: {
                code: [["boolean", "prim"]],
                html: null,
              },
              sources: [
                {
                  path: "packages/driver/src/client.ts",
                  line: 201,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L201",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/client.ts",
              line: 201,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L201",
            },
          ],
        },
        {
          id: 50,
          name: "serverInfo",
          anchor: "server-info",
          kind: "accessor",
          deprecated: false,
          label: "Accessor",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 51,
              code: [
                ["get ", "kw"],
                ["serverInfo", "name"],
                ["(): ", "pn"],
                [
                  "SinterServerInfo",
                  "ref",
                  "/docs/api/interfaces/SinterServerInfo",
                ],
                [" | ", "pn"],
                ["undefined", "prim"],
              ],
              comment: {
                summary:
                  "<p>What the server reported during the handshake, or <code>undefined</code> while the\nclient is not connected.</p>",
                short:
                  "What the server reported during the handshake, or <code>undefined</code> while the client is not connected.",
                deprecated: null,
                modifiers: [],
                blocks: [],
              },
              typeParameters: [],
              parameters: [],
              returns: {
                code: [
                  [
                    "SinterServerInfo",
                    "ref",
                    "/docs/api/interfaces/SinterServerInfo",
                  ],
                  [" | ", "pn"],
                  ["undefined", "prim"],
                ],
                html: null,
              },
              sources: [
                {
                  path: "packages/driver/src/client.ts",
                  line: 209,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L209",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/client.ts",
              line: 209,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L209",
            },
          ],
        },
        {
          id: 46,
          name: "state",
          anchor: "state",
          kind: "accessor",
          deprecated: false,
          label: "Accessor",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 47,
              code: [
                ["get ", "kw"],
                ["state", "name"],
                ["(): ", "pn"],
                [
                  "SinterClientState",
                  "ref",
                  "/docs/api/types/SinterClientState",
                ],
              ],
              comment: {
                summary: "<p>The current lifecycle state.</p>",
                short: "The current lifecycle state.",
                deprecated: null,
                modifiers: [],
                blocks: [],
              },
              typeParameters: [],
              parameters: [],
              returns: {
                code: [
                  [
                    "SinterClientState",
                    "ref",
                    "/docs/api/types/SinterClientState",
                  ],
                ],
                html: null,
              },
              sources: [
                {
                  path: "packages/driver/src/client.ts",
                  line: 196,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L196",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/client.ts",
              line: 196,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L196",
            },
          ],
        },
      ],
    },
    {
      id: "methods",
      title: "Methods",
      members: [
        {
          id: 66,
          name: "close",
          anchor: "close",
          kind: "method",
          deprecated: false,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 67,
              code: [
                ["close", "name"],
                ["(): ", "pn"],
                ["Promise", "ref"],
                ["<", "pn"],
                ["void", "prim"],
                [">", "pn"],
              ],
              comment: {
                summary:
                  "<p>Closes the connection. Requests still waiting for a response fail.\nClosing a closed client does nothing.</p>",
                short:
                  "Closes the connection. Requests still waiting for a response fail. Closing a closed client does nothing.",
                deprecated: null,
                modifiers: [],
                blocks: [],
              },
              typeParameters: [],
              parameters: [],
              returns: {
                code: [
                  ["Promise", "ref"],
                  ["<", "pn"],
                  ["void", "prim"],
                  [">", "pn"],
                ],
                html: null,
              },
              sources: [
                {
                  path: "packages/driver/src/client.ts",
                  line: 356,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L356",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/client.ts",
              line: 356,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L356",
            },
          ],
        },
        {
          id: 52,
          name: "connect",
          anchor: "connect",
          kind: "method",
          deprecated: false,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 53,
              code: [
                ["connect", "name"],
                ["(): ", "pn"],
                ["Promise", "ref"],
                ["<", "pn"],
                ["SinterClient", "ref", "/docs/api/classes/SinterClient"],
                [">", "pn"],
              ],
              comment: {
                summary:
                  '<p>Opens the connection and performs the protocol handshake.</p>\n<p>Calling <code>connect()</code> on a connected client resolves immediately, and\nconcurrent calls share one attempt. If the attempt fails, the client\nreturns to <code>new</code> and <code>connect()</code> may be tried again. A closed client\nrejects with a <a href="/docs/api/classes/SinterClientStateError">SinterClientStateError</a>.</p>',
                short:
                  "Opens the connection and performs the protocol handshake.",
                deprecated: null,
                modifiers: [],
                blocks: [],
              },
              typeParameters: [],
              parameters: [],
              returns: {
                code: [
                  ["Promise", "ref"],
                  ["<", "pn"],
                  ["SinterClient", "ref", "/docs/api/classes/SinterClient"],
                  [">", "pn"],
                ],
                html: "<p>This client, so calls can be chained.</p>",
              },
              sources: [
                {
                  path: "packages/driver/src/client.ts",
                  line: 223,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L223",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/client.ts",
              line: 223,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L223",
            },
          ],
        },
        {
          id: 63,
          name: "db",
          anchor: "db",
          kind: "method",
          deprecated: false,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 64,
              code: [
                ["db", "name"],
                ["(", "pn"],
                ["name", "param"],
                ["?: ", "pn"],
                ["string", "prim"],
                ["): ", "pn"],
                ["SinterDatabase", "ref", "/docs/api/classes/SinterDatabase"],
              ],
              comment: {
                summary:
                  "<p>Returns a handle to a database.</p>\n<p>The handle is created locally; no request is sent, and the database is\ncreated on the server by the first write. Without <code>name</code>, the database\nfrom the connection string is used.</p>",
                short: "Returns a handle to a database.",
                deprecated: null,
                modifiers: [],
                blocks: [
                  {
                    tag: "throws",
                    title: "Throws",
                    html: '<p><a href="/docs/api/classes/SinterNamespaceError">SinterNamespaceError</a> when neither is available, or when\nthe name is invalid.</p>',
                  },
                ],
              },
              typeParameters: [],
              parameters: [
                {
                  name: "name",
                  code: [
                    ["name", "param"],
                    ["?: ", "pn"],
                    ["string", "prim"],
                  ],
                  comment: {
                    summary:
                      "<p>The database name. Optional when the connection string\nnames one.</p>",
                    short:
                      "The database name. Optional when the connection string   names one.",
                    deprecated: null,
                    modifiers: [],
                    blocks: [],
                  },
                  members: [],
                },
              ],
              returns: {
                code: [
                  ["SinterDatabase", "ref", "/docs/api/classes/SinterDatabase"],
                ],
                html: null,
              },
              sources: [
                {
                  path: "packages/driver/src/client.ts",
                  line: 340,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L340",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/client.ts",
              line: 340,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L340",
            },
          ],
        },
        {
          id: 56,
          name: "executeCommand",
          anchor: "execute-command",
          kind: "method",
          deprecated: false,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 57,
              code: [
                ["executeCommand", "name"],
                ["(", "pn"],
                ["\n  "],
                ["database", "param"],
                [": ", "pn"],
                ["string", "prim"],
                [" | ", "pn"],
                ["undefined", "prim"],
                [",", "pn"],
                ["\n  "],
                ["command", "param"],
                [": ", "pn"],
                ["string", "prim"],
                [",", "pn"],
                ["\n  "],
                ["parameters", "param"],
                [": ", "pn"],
                ["Document", "ref", "/docs/api/interfaces/Document"],
                [",", "pn"],
                ["\n"],
                ["): ", "pn"],
                ["Promise", "ref"],
                ["<", "pn"],
                ["DocumentValue", "ref"],
                [">", "pn"],
              ],
              comment: {
                summary:
                  "<p>Sends a command by name and returns the raw result.</p>\n<p>This is the low-level entry point behind the collection and database\nmethods. Prefer those; the command names and parameters are part of the\nwire protocol, not of the typed API.</p>",
                short: "Sends a command by name and returns the raw result.",
                deprecated: null,
                modifiers: [],
                blocks: [],
              },
              typeParameters: [],
              parameters: [
                {
                  name: "database",
                  code: [
                    ["database", "param"],
                    [": ", "pn"],
                    ["string", "prim"],
                    [" | ", "pn"],
                    ["undefined", "prim"],
                  ],
                  comment: {
                    summary:
                      "<p>The database to run the command in, or <code>undefined</code> for\nserver-wide commands.</p>",
                    short:
                      "The database to run the command in, or <code>undefined</code> for   server-wide commands.",
                    deprecated: null,
                    modifiers: [],
                    blocks: [],
                  },
                  members: [],
                },
                {
                  name: "command",
                  code: [
                    ["command", "param"],
                    [": ", "pn"],
                    ["string", "prim"],
                  ],
                  comment: {
                    summary: "<p>The command name.</p>",
                    short: "The command name.",
                    deprecated: null,
                    modifiers: [],
                    blocks: [],
                  },
                  members: [],
                },
                {
                  name: "parameters",
                  code: [
                    ["parameters", "param"],
                    [": ", "pn"],
                    ["Document", "ref", "/docs/api/interfaces/Document"],
                  ],
                  comment: {
                    summary: "<p>The command parameters.</p>",
                    short: "The command parameters.",
                    deprecated: null,
                    modifiers: [],
                    blocks: [],
                  },
                  members: [],
                },
              ],
              returns: {
                code: [
                  ["Promise", "ref"],
                  ["<", "pn"],
                  ["DocumentValue", "ref"],
                  [">", "pn"],
                ],
                html: null,
              },
              sources: [
                {
                  path: "packages/driver/src/client.ts",
                  line: 299,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L299",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/client.ts",
              line: 299,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L299",
            },
          ],
        },
        {
          id: 61,
          name: "listDatabases",
          anchor: "list-databases",
          kind: "method",
          deprecated: false,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 62,
              code: [
                ["listDatabases", "name"],
                ["(): ", "pn"],
                ["Promise", "ref"],
                ["<", "pn"],
                ["string", "prim"],
                ["[]>", "pn"],
              ],
              comment: {
                summary:
                  "<p>Lists the names of the databases on the server.</p>",
                short: "Lists the names of the databases on the server.",
                deprecated: null,
                modifiers: [],
                blocks: [],
              },
              typeParameters: [],
              parameters: [],
              returns: {
                code: [
                  ["Promise", "ref"],
                  ["<", "pn"],
                  ["string", "prim"],
                  ["[]>", "pn"],
                ],
                html: null,
              },
              sources: [
                {
                  path: "packages/driver/src/client.ts",
                  line: 322,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L322",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/client.ts",
              line: 322,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L322",
            },
          ],
        },
        {
          id: 54,
          name: "ping",
          anchor: "ping",
          kind: "method",
          deprecated: false,
          label: "Method",
          badges: [],
          code: null,
          comment: null,
          signatures: [
            {
              id: 55,
              code: [
                ["ping", "name"],
                ["(): ", "pn"],
                ["Promise", "ref"],
                ["<", "pn"],
                [
                  "SinterPingResult",
                  "ref",
                  "/docs/api/interfaces/SinterPingResult",
                ],
                [">", "pn"],
              ],
              comment: {
                summary:
                  "<p>Sends a ping to the server and measures the round trip.</p>",
                short:
                  "Sends a ping to the server and measures the round trip.",
                deprecated: null,
                modifiers: [],
                blocks: [],
              },
              typeParameters: [],
              parameters: [],
              returns: {
                code: [
                  ["Promise", "ref"],
                  ["<", "pn"],
                  [
                    "SinterPingResult",
                    "ref",
                    "/docs/api/interfaces/SinterPingResult",
                  ],
                  [">", "pn"],
                ],
                html: null,
              },
              sources: [
                {
                  path: "packages/driver/src/client.ts",
                  line: 267,
                  url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L267",
                },
              ],
            },
          ],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/client.ts",
              line: 267,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L267",
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
        {
          anchor: "target",
          name: "target",
          kind: "property",
          deprecated: false,
        },
      ],
    },
    {
      id: "accessors",
      title: "Accessors",
      items: [
        {
          anchor: "connected",
          name: "connected",
          kind: "accessor",
          deprecated: false,
        },
        {
          anchor: "server-info",
          name: "serverInfo",
          kind: "accessor",
          deprecated: false,
        },
        {
          anchor: "state",
          name: "state",
          kind: "accessor",
          deprecated: false,
        },
      ],
    },
    {
      id: "methods",
      title: "Methods",
      items: [
        {
          anchor: "close",
          name: "close",
          kind: "method",
          deprecated: false,
        },
        {
          anchor: "connect",
          name: "connect",
          kind: "method",
          deprecated: false,
        },
        {
          anchor: "db",
          name: "db",
          kind: "method",
          deprecated: false,
        },
        {
          anchor: "execute-command",
          name: "executeCommand",
          kind: "method",
          deprecated: false,
        },
        {
          anchor: "list-databases",
          name: "listDatabases",
          kind: "method",
          deprecated: false,
        },
        {
          anchor: "ping",
          name: "ping",
          kind: "method",
          deprecated: false,
        },
      ],
    },
  ],
  sources: [
    {
      path: "packages/driver/src/client.ts",
      line: 150,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/client.ts#L150",
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
