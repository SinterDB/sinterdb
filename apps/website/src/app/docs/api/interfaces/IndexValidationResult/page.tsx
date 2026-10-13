import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page = {
  id: 695,
  name: "IndexValidationResult",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/IndexValidationResult",
  description: "The result of SinterCollection.validateIndexes.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["IndexValidationResult", "name"],
  ],
  comment: {
    summary:
      '<p>The result of <a href="/docs/api/classes/SinterCollection#validate-indexes">SinterCollection.validateIndexes</a>.</p>',
    short:
      'The result of <a href="/docs/api/classes/SinterCollection#validate-indexes">SinterCollection.validateIndexes</a>.',
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
          id: 698,
          name: "documents",
          anchor: "documents",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["documents", "name"],
            [": ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary: "<p>How many documents were checked.</p>",
            short: "How many documents were checked.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 114,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L114",
            },
          ],
        },
        {
          id: 697,
          name: "indexes",
          anchor: "indexes",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["indexes", "name"],
            [": ", "pn"],
            ["number", "prim"],
          ],
          comment: {
            summary: "<p>How many indexes were checked.</p>",
            short: "How many indexes were checked.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 112,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L112",
            },
          ],
        },
        {
          id: 699,
          name: "issues",
          anchor: "issues",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["issues", "name"],
            [": ", "pn"],
            ["readonly ", "kw"],
            ["IndexIssue", "ref", "/docs/api/interfaces/IndexIssue"],
            ["[]", "pn"],
          ],
          comment: {
            summary:
              "<p>Every difference found; empty when <code>valid</code> is <code>true</code>.</p>",
            short:
              "Every difference found; empty when <code>valid</code> is <code>true</code>.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 116,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L116",
            },
          ],
        },
        {
          id: 696,
          name: "valid",
          anchor: "valid",
          kind: "property",
          deprecated: false,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["valid", "name"],
            [": ", "pn"],
            ["boolean", "prim"],
          ],
          comment: {
            summary: "<p>Whether every index matches the documents.</p>",
            short: "Whether every index matches the documents.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/indexes.ts",
              line: 110,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L110",
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
          anchor: "documents",
          name: "documents",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "indexes",
          name: "indexes",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "issues",
          name: "issues",
          kind: "property",
          deprecated: false,
        },
        {
          anchor: "valid",
          name: "valid",
          kind: "property",
          deprecated: false,
        },
      ],
    },
  ],
  sources: [
    {
      path: "packages/driver/src/indexes.ts",
      line: 108,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L108",
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
