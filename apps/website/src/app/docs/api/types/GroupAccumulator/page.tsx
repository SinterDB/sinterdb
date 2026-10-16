import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 217,
  name: "GroupAccumulator",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/GroupAccumulator",
  since: null,
  description:
    "What a $group stage computes for each group. Each is an object with one key.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["GroupAccumulator", "name"],
    [" =", "pn"],
    ["\n  "],
    ["| { ", "pn"],
    ["readonly ", "kw"],
    ["$count", "prop"],
    [": ", "pn"],
    ["Readonly", "ref"],
    ["<", "pn"],
    ["Record", "ref"],
    ["<", "pn"],
    ["string", "prim"],
    [", ", "pn"],
    ["never", "prim"],
    [">> }", "pn"],
    ["\n  "],
    ["| { ", "pn"],
    ["readonly ", "kw"],
    ["$sum", "prop"],
    [": ", "pn"],
    ["GroupValue", "ref", "/docs/api/types/GroupValue"],
    [" }", "pn"],
    ["\n  "],
    ["| { ", "pn"],
    ["readonly ", "kw"],
    ["$avg", "prop"],
    [": ", "pn"],
    ["GroupValue", "ref", "/docs/api/types/GroupValue"],
    [" }", "pn"],
    ["\n  "],
    ["| { ", "pn"],
    ["readonly ", "kw"],
    ["$min", "prop"],
    [": ", "pn"],
    ["GroupValue", "ref", "/docs/api/types/GroupValue"],
    [" }", "pn"],
    ["\n  "],
    ["| { ", "pn"],
    ["readonly ", "kw"],
    ["$max", "prop"],
    [": ", "pn"],
    ["GroupValue", "ref", "/docs/api/types/GroupValue"],
    [" }", "pn"],
    ["\n  "],
    ["| { ", "pn"],
    ["readonly ", "kw"],
    ["$first", "prop"],
    [": ", "pn"],
    ["GroupValue", "ref", "/docs/api/types/GroupValue"],
    [" }", "pn"],
    ["\n  "],
    ["| { ", "pn"],
    ["readonly ", "kw"],
    ["$last", "prop"],
    [": ", "pn"],
    ["GroupValue", "ref", "/docs/api/types/GroupValue"],
    [" }", "pn"],
  ],
  comment: {
    summary:
      "<p>What a <code>$group</code> stage computes for each group. Each is an object with one\nkey.</p>\n<ul>\n<li><code>{ $count: {} }</code> the number of documents in the group.</li>\n<li><code>{ $sum: value }</code> the total of the numbers. Values that are not numbers\nare ignored, and the total is <code>0</code> when there are none. A group may add\nnumbers or bigint values, not both, and a bigint total must stay within\nthe signed 64-bit range.</li>\n<li><code>{ $avg: value }</code> the mean of the numbers, or <code>null</code> when there are none.\nValues that are not numbers are ignored. It does not accept bigint values.</li>\n<li><code>{ $min: value }</code> and <code>{ $max: value }</code> the smallest and largest value by\nthe sort order of the query semantics, ignoring documents that lack the\nfield. <code>null</code> when no document has it.</li>\n<li><code>{ $first: value }</code> and <code>{ $last: value }</code> the value from the first or\nlast document of the group in the order the documents arrived, or <code>null</code>\nwhen that document lacks the field.</li>\n</ul>",
    short:
      "What a <code>$group</code> stage computes for each group. Each is an object with one key.",
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [],
  hierarchy: null,
  signatureSection: null,
  signatures: [],
  sections: [],
  toc: [
    {
      id: "used-by",
      title: "Used by",
      items: [],
    },
  ],
  sources: [
    {
      path: "packages/driver/src/aggregation.ts",
      line: 85,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/aggregation.ts#L85",
    },
  ],
  usedBy: [
    {
      name: "GroupSpecification",
      href: "/docs/api/interfaces/GroupSpecification",
      kind: "interface",
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
