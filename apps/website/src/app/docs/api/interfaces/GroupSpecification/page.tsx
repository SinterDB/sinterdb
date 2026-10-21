import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 237,
  name: "GroupSpecification",
  kind: "interface",
  label: "Interface",
  href: "/docs/api/interfaces/GroupSpecification",
  since: null,
  description:
    "The argument of $group: an _id that says how to group, plus any number of output fields, each computed by an accumulator.",
  badges: [],
  declaration: [
    ["interface ", "kw"],
    ["GroupSpecification", "name"],
  ],
  comment: {
    summary:
      "<p>The argument of <code>$group</code>: an <code>_id</code> that says how to group, plus any number\nof output fields, each computed by an accumulator.</p>\n<p><code>_id</code> is a field reference such as <code>&quot;$team&quot;</code>, a literal (<code>null</code> puts every\ndocument in one group), or a document of up to 8 field references or\nliterals for a compound key. Two documents are in the same group when their\nkeys are equal as filters see equality, so <code>1</code> and <code>1n</code> are different\ngroups. Groups come out in the order their first document arrived, and at\nmost 100,000 groups may exist at once.</p>",
    short:
      "The argument of <code>$group</code>: an <code>_id</code> that says how to group, plus any number of output fields, each computed by an accumulator.",
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
      id: "index-signatures",
      title: "Index signature",
      members: [
        {
          id: 242,
          name: "[field]",
          anchor: "index-signature",
          kind: "index-signature",
          deprecated: false,
          since: null,
          label: "Index Signature",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["[", "pn"],
            ["field", "param"],
            [": ", "pn"],
            ["string", "prim"],
            ["]: ", "pn"],
            ["GroupAccumulator", "ref", "/docs/api/types/GroupAccumulator"],
            [" | ", "pn"],
            ["GroupValue", "ref", "/docs/api/types/GroupValue"],
            [" | { ", "pn"],
            ["readonly ", "kw"],
            ["[", "pn"],
            ["name", "param"],
            [": ", "pn"],
            ["string", "prim"],
            ["]: ", "pn"],
            ["GroupValue", "ref", "/docs/api/types/GroupValue"],
            [" }", "pn"],
          ],
          comment: {
            summary:
              "<p>An output field computed by an accumulator. The name must not be empty,\nstart with <code>$</code>, or contain <code>.</code>.</p>",
            short:
              "An output field computed by an accumulator. The name must not be empty, start with <code>$</code>, or contain <code>.</code>.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/aggregation.ts",
              line: 134,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/aggregation.ts#L134",
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
          id: 238,
          name: "_id",
          anchor: "_id",
          kind: "property",
          deprecated: false,
          since: null,
          label: "Property",
          badges: [],
          code: [
            ["readonly ", "kw"],
            ["_id", "name"],
            [": ", "pn"],
            ["GroupValue", "ref", "/docs/api/types/GroupValue"],
            [" | { ", "pn"],
            ["readonly ", "kw"],
            ["[", "pn"],
            ["name", "param"],
            [": ", "pn"],
            ["string", "prim"],
            ["]: ", "pn"],
            ["GroupValue", "ref", "/docs/api/types/GroupValue"],
            [" }", "pn"],
          ],
          comment: {
            summary:
              "<p>How to group: a field reference, a literal, or a compound key.</p>",
            short:
              "How to group: a field reference, a literal, or a compound key.",
            deprecated: null,
            modifiers: [],
            blocks: [],
          },
          signatures: [],
          members: [],
          relations: [],
          sources: [
            {
              path: "packages/driver/src/aggregation.ts",
              line: 129,
              url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/aggregation.ts#L129",
            },
          ],
        },
      ],
    },
  ],
  toc: [
    {
      id: "index-signatures",
      title: "Index signature",
      items: [
        {
          anchor: "index-signature",
          name: "[field]",
          kind: "index-signature",
          deprecated: false,
        },
      ],
    },
    {
      id: "properties",
      title: "Properties",
      items: [
        {
          anchor: "_id",
          name: "_id",
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
      path: "packages/driver/src/aggregation.ts",
      line: 127,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/aggregation.ts#L127",
    },
  ],
  usedBy: [
    {
      name: "AggregationStage",
      href: "/docs/api/types/AggregationStage",
      kind: "type-alias",
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
