import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 710,
  name: "ExplainResult",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/ExplainResult",
  since: null,
  description:
    "The query plan the server reports for a find. The shape is experimental and may change in any release; see docs/compatibility.md.",
  badges: ["beta"],
  declaration: [
    ["interface ", "kw"],
    ["ExplainResult", "name"],
  ],
  comment: {
    summary:
      "<p>The query plan the server reports for a find. The shape is experimental and\nmay change in any release; see docs/compatibility.md.</p>",
    short:
      "The query plan the server reports for a find. The shape is experimental and may change in any release; see docs/compatibility.md.",
    deprecated: null,
    modifiers: ["beta"],
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
          id: 716,
          name: "access",
          anchor: "access",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: ["beta"],
          code: [
            ["readonly ", "kw"],
            ["access", "name"],
            ["?: ", "pn"],
            ['"equality"', "lit"],
            [" | ", "pn"],
            ['"in"', "lit"],
            [" | ", "pn"],
            ['"range"', "lit"],
          ],
          comment: {
            summary:
              "<p>How the index is read: by equality, by a list of values, or by a range.</p>",
            short:
              "How the index is read: by equality, by a list of values, or by a range.",
            deprecated: null,
            modifiers: ["beta"],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 141,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L141",
            },
          ],
        },
        {
          id: 720,
          name: "documents",
          anchor: "documents",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: ["beta"],
          code: [
            ["readonly ", "kw"],
            ["documents", "name"],
            [": ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary: "<p>How many documents the collection holds.</p>",
            short: "How many documents the collection holds.",
            deprecated: null,
            modifiers: ["beta"],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 149,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L149",
            },
          ],
        },
        {
          id: 719,
          name: "estimatedCandidates",
          anchor: "estimated-candidates",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: ["beta"],
          code: [
            ["readonly ", "kw"],
            ["estimatedCandidates", "name"],
            [": ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary: "<p>How many documents the server expects to examine.</p>",
            short: "How many documents the server expects to examine.",
            deprecated: null,
            modifiers: ["beta"],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 147,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L147",
            },
          ],
        },
        {
          id: 713,
          name: "field",
          anchor: "field",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: ["beta"],
          code: [
            ["readonly ", "kw"],
            ["field", "name"],
            ["?: ", "pn"],
            ["string", "prim"],
          ],
          comment: {
            summary:
              "<p>The first field the index covers, for <code>IXSCAN</code>.</p>",
            short: "The first field the index covers, for <code>IXSCAN</code>.",
            deprecated: null,
            modifiers: ["beta"],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 131,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L131",
            },
          ],
        },
        {
          id: 714,
          name: "fields",
          anchor: "fields",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: ["beta"],
          code: [
            ["readonly ", "kw"],
            ["fields", "name"],
            ["?: ", "pn"],
            ["readonly ", "kw"],
            ["string", "prim"],
            ["[]", "pn"],
          ],
          comment: {
            summary:
              "<p>Every field of a compound index, in order, for <code>IXSCAN</code>.</p>",
            short:
              "Every field of a compound index, in order, for <code>IXSCAN</code>.",
            deprecated: null,
            modifiers: ["beta"],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 133,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L133",
            },
          ],
        },
        {
          id: 712,
          name: "index",
          anchor: "index-2",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: ["beta"],
          code: [
            ["readonly ", "kw"],
            ["index", "name"],
            ["?: ", "pn"],
            ["string", "prim"],
          ],
          comment: {
            summary: "<p>The index used, for <code>IXSCAN</code>.</p>",
            short: "The index used, for <code>IXSCAN</code>.",
            deprecated: null,
            modifiers: ["beta"],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 129,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L129",
            },
          ],
        },
        {
          id: 717,
          name: "lower",
          anchor: "lower",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: ["beta"],
          code: [
            ["readonly ", "kw"],
            ["lower", "name"],
            ["?: ", "pn"],
            ["IndexBoundInfo", "ref", "/docs/api/interfaces/IndexBoundInfo"],
          ],
          comment: {
            summary: "<p>The lower end of a range scan.</p>",
            short: "The lower end of a range scan.",
            deprecated: null,
            modifiers: ["beta"],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 143,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L143",
            },
          ],
        },
        {
          id: 715,
          name: "prefixLength",
          anchor: "prefix-length",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: ["beta"],
          code: [
            ["readonly ", "kw"],
            ["prefixLength", "name"],
            ["?: ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary:
              "<p>How many leading fields of a compound index the query fixes by equality.</p>",
            short:
              "How many leading fields of a compound index the query fixes by equality.",
            deprecated: null,
            modifiers: ["beta"],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 137,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L137",
            },
          ],
        },
        {
          id: 711,
          name: "stage",
          anchor: "stage",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: ["beta"],
          code: [
            ["readonly ", "kw"],
            ["stage", "name"],
            [": ", "pn"],
            ['"COLLSCAN"', "lit"],
            [" | ", "pn"],
            ['"IDLOOKUP"', "lit"],
            [" | ", "pn"],
            ['"IXSCAN"', "lit"],
          ],
          comment: {
            summary:
              "<p>The strategy: <code>COLLSCAN</code> reads every document, <code>IDLOOKUP</code> reads by <code>_id</code>,\nand <code>IXSCAN</code> scans an index.</p>",
            short:
              "The strategy: <code>COLLSCAN</code> reads every document, <code>IDLOOKUP</code> reads by <code>_id</code>, and <code>IXSCAN</code> scans an index.",
            deprecated: null,
            modifiers: ["beta"],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 127,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L127",
            },
          ],
        },
        {
          id: 718,
          name: "upper",
          anchor: "upper",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: ["beta"],
          code: [
            ["readonly ", "kw"],
            ["upper", "name"],
            ["?: ", "pn"],
            ["IndexBoundInfo", "ref", "/docs/api/interfaces/IndexBoundInfo"],
          ],
          comment: {
            summary: "<p>The upper end of a range scan.</p>",
            short: "The upper end of a range scan.",
            deprecated: null,
            modifiers: ["beta"],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 145,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L145",
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
          anchor: "access",
          name: "access",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "documents",
          name: "documents",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "estimated-candidates",
          name: "estimatedCandidates",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "field",
          name: "field",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "fields",
          name: "fields",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "index-2",
          name: "index",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "lower",
          name: "lower",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "prefix-length",
          name: "prefixLength",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "stage",
          name: "stage",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "upper",
          name: "upper",
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
      path: "packages/driver/src/indexes.ts",
      line: 122,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L122",
    },
  ],
  usedBy: [
    {
      name: "FindCursor.explain",
      href: "/docs/api/classes/FindCursor#explain",
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
