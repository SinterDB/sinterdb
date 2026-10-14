import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 724,
  name: "IndexIssue",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/IndexIssue",
  since: null,
  description: "One difference found by SinterCollection.validateIndexes.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["IndexIssue", "name"],
  ],
  comment: {
    summary:
      '<p>One difference found by <a href="/docs/api/classes/SinterCollection#validate-indexes">SinterCollection.validateIndexes</a>.</p>',
    short:
      'One difference found by <a href="/docs/api/classes/SinterCollection#validate-indexes">SinterCollection.validateIndexes</a>.',
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
          id: 727,
          name: "detail",
          anchor: "detail",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["detail", "name"],
            [": ", "pn"],
            ["string", "prim"],
          ],
          comment: {
            summary: "<p>A human-readable description of the difference.</p>",
            short: "A human-readable description of the difference.",
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
              line: 104,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L104",
            },
          ],
        },
        {
          id: 725,
          name: "index",
          anchor: "index-2",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["index", "name"],
            [": ", "pn"],
            ["string", "prim"],
          ],
          comment: {
            summary: "<p>The name of the affected index.</p>",
            short: "The name of the affected index.",
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
              line: 100,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L100",
            },
          ],
        },
        {
          id: 726,
          name: "problem",
          anchor: "problem",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["problem", "name"],
            [": ", "pn"],
            ["string", "prim"],
          ],
          comment: {
            summary: "<p>A short identifier for the kind of difference.</p>",
            short: "A short identifier for the kind of difference.",
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
              line: 102,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L102",
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
          anchor: "detail",
          name: "detail",
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
          anchor: "problem",
          name: "problem",
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
      line: 98,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/indexes.ts#L98",
    },
  ],
  usedBy: [
    {
      name: "IndexValidationResult.issues",
      href: "/docs/api/interfaces/IndexValidationResult#issues",
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
