import type { Metadata } from "next";

import { ApiReflectionPage } from "../../_components/pages";
import type { ApiPage } from "../../_generated/model";

const page: ApiPage = {
  id: 206,
  name: "AggregationStage",
  kind: "type-alias",
  label: "Type Alias",
  href: "/docs/api/types/AggregationStage",
  since: null,
  description:
    "One stage of an aggregation pipeline. Each stage is an object with a single $ key. Documents flow through the stages in order.",
  badges: [],
  declaration: [
    ["type ", "kw"],
    ["AggregationStage", "name"],
    ["<", "pn"],
    ["TDocument", "tp"],
    [" extends ", "kw"],
    ["object", "prim"],
    ["> =", "pn"],
    ["\n  "],
    ["| { ", "pn"],
    ["readonly ", "kw"],
    ["$match", "prop"],
    [": ", "pn"],
    ["Filter", "ref", "/docs/api/types/Filter"],
    ["<", "pn"],
    ["TDocument", "tp"],
    ["> }", "pn"],
    ["\n  "],
    ["| { ", "pn"],
    ["readonly ", "kw"],
    ["$project", "prop"],
    [": ", "pn"],
    ["Projection", "ref", "/docs/api/types/Projection"],
    ["<", "pn"],
    ["TDocument", "tp"],
    ["> }", "pn"],
    ["\n  "],
    ["| { ", "pn"],
    ["readonly ", "kw"],
    ["$sort", "prop"],
    [": ", "pn"],
    ["Sort", "ref", "/docs/api/types/Sort"],
    ["<", "pn"],
    ["TDocument", "tp"],
    ["> }", "pn"],
    ["\n  "],
    ["| { ", "pn"],
    ["readonly ", "kw"],
    ["$skip", "prop"],
    [": ", "pn"],
    ["number", "prim"],
    [" }", "pn"],
    ["\n  "],
    ["| { ", "pn"],
    ["readonly ", "kw"],
    ["$limit", "prop"],
    [": ", "pn"],
    ["number", "prim"],
    [" }", "pn"],
    ["\n  "],
    ["| { ", "pn"],
    ["readonly ", "kw"],
    ["$count", "prop"],
    [": ", "pn"],
    ["string", "prim"],
    [" }", "pn"],
    ["\n  "],
    ["| { ", "pn"],
    ["readonly ", "kw"],
    ["$group", "prop"],
    [": ", "pn"],
    ["GroupSpecification", "ref", "/docs/api/interfaces/GroupSpecification"],
    [" }", "pn"],
  ],
  comment: {
    summary:
      '<p>One stage of an aggregation pipeline. Each stage is an object with a single\n<code>$</code> key. Documents flow through the stages in order.</p>\n<ul>\n<li><code>$match</code> keeps the documents that match a filter, like <code>find</code>. A <code>$match</code>\nat the start of the pipeline can use an index.</li>\n<li><code>$project</code> reshapes documents, like the <code>projection</code> option of <code>find</code>.</li>\n<li><code>$sort</code> orders documents, as <code>[path, direction]</code> pairs like the <code>sort</code>\noption of <code>find</code>. It is an array of pairs because the order of an object\'s\nkeys is not preserved.</li>\n<li><code>$skip</code> drops that many documents.</li>\n<li><code>$limit</code> keeps at most that many documents.</li>\n<li><code>$count</code> replaces the documents with one document holding their number\nunder the given name, or with nothing when there were no documents.</li>\n<li><code>$group</code> replaces the documents with one document per distinct key, with\nvalues computed by accumulators (see <a href="/docs/api/interfaces/GroupSpecification">GroupSpecification</a>).</li>\n</ul>\n<p>A <code>$sort</code> directly followed by <code>$limit</code> (and at most a <code>$skip</code>) keeps only\nthe documents it needs while sorting, so it can run over a large collection\nwithout holding all of it in memory.</p>',
    short:
      "One stage of an aggregation pipeline. Each stage is an object with a single <code>$</code> key. Documents flow through the stages in order.",
    deprecated: null,
    modifiers: [],
    blocks: [],
  },
  typeParameters: [
    {
      name: "TDocument",
      code: [
        ["TDocument", "tp"],
        [" extends ", "kw"],
        ["object", "prim"],
      ],
      comment: null,
    },
  ],
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
      line: 28,
      url: "https://github.com/SinterDB/sinterdb/blob/main/packages/driver/src/aggregation.ts#L28",
    },
  ],
  usedBy: [
    {
      name: "SinterCollection.aggregate",
      href: "/docs/api/classes/SinterCollection#aggregate",
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
