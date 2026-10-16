import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 790,
  name: "IndexValidationResult",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/IndexValidationResult",
  since: null,
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
          id: 793,
          name: "documents",
          anchor: "documents",
          kind: "property",
          deprecated: false,
          since: null,
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
              line: 169,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L169",
            },
          ],
        },
        {
          id: 792,
          name: "indexes",
          anchor: "indexes",
          kind: "property",
          deprecated: false,
          since: null,
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
              line: 167,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L167",
            },
          ],
        },
        {
          id: 794,
          name: "issues",
          anchor: "issues",
          kind: "property",
          deprecated: false,
          since: null,
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
              line: 171,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L171",
            },
          ],
        },
        {
          id: 791,
          name: "valid",
          anchor: "valid",
          kind: "property",
          deprecated: false,
          since: null,
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
              line: 165,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L165",
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
    {
      id: "used-by",
      title: "Used by",
      items: [],
    },
  ],
  sources: [
    {
      path: "packages/driver/src/indexes.ts",
      line: 163,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L163",
    },
  ],
  usedBy: [
    {
      name: "SinterCollection.validateIndexes",
      href: "/docs/api/classes/SinterCollection#validate-indexes",
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
