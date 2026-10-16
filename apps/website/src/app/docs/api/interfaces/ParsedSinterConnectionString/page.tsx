import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 333,
  name: "ParsedSinterConnectionString",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/ParsedSinterConnectionString",
  since: null,
  description:
    "A parsed sinterdb:// connection string, available as SinterClient.target.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["ParsedSinterConnectionString", "name"],
  ],
  comment: {
    summary:
      '<p>A parsed <code>sinterdb://</code> connection string, available as <a href="/docs/api/classes/SinterClient#target">SinterClient.target</a>.</p>',
    short:
      'A parsed <code>sinterdb://</code> connection string, available as <a href="/docs/api/classes/SinterClient#target">SinterClient.target</a>.',
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
          id: 336,
          name: "database",
          anchor: "database",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["database", "name"],
            ["?: ", "pn"],
            ["string", "prim"],
          ],
          comment: {
            summary: "<p>The database named in the path, if any.</p>",
            short: "The database named in the path, if any.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/connection-string.ts",
              line: 19,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/connection-string.ts#L19",
            },
          ],
        },
        {
          id: 334,
          name: "host",
          anchor: "host",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["host", "name"],
            [": ", "pn"],
            ["string", "prim"],
          ],
          comment: {
            summary: "<p>The server host.</p>",
            short: "The server host.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/connection-string.ts",
              line: 13,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/connection-string.ts#L13",
            },
          ],
        },
        {
          id: 335,
          name: "port",
          anchor: "port",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["port", "name"],
            [": ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary:
              '<p>The server port; <a href="/docs/api/variables/DEFAULT_SINTERDB_PORT">DEFAULT_SINTERDB_PORT</a> when the string has none.</p>',
            short:
              'The server port; <a href="/docs/api/variables/DEFAULT_SINTERDB_PORT">DEFAULT_SINTERDB_PORT</a> when the string has none.',
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/connection-string.ts",
              line: 17,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/connection-string.ts#L17",
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
          anchor: "database",
          name: "database",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "host",
          name: "host",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "port",
          name: "port",
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
      path: "packages/driver/src/connection-string.ts",
      line: 11,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/connection-string.ts#L11",
    },
  ],
  usedBy: [
    {
      name: "SinterClient.target",
      href: "/docs/api/classes/SinterClient#target",
      kind: "property",
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
