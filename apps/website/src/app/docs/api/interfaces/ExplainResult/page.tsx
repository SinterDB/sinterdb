import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 697,
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
          id: 701,
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
              line: 86,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L86",
            },
          ],
        },
        {
          id: 705,
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
              line: 94,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L94",
            },
          ],
        },
        {
          id: 704,
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
              line: 92,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L92",
            },
          ],
        },
        {
          id: 700,
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
              "<p>The field the index covers, for <code>IXSCAN</code>.</p>",
            short: "The field the index covers, for <code>IXSCAN</code>.",
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
              line: 82,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L82",
            },
          ],
        },
        {
          id: 699,
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
              line: 80,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L80",
            },
          ],
        },
        {
          id: 702,
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
              line: 88,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L88",
            },
          ],
        },
        {
          id: 698,
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
              line: 78,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L78",
            },
          ],
        },
        {
          id: 703,
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
              line: 90,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L90",
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
      line: 73,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L73",
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
